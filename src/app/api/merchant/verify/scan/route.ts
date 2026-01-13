import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/merchant/verify/scan
 * Valida e processa un QR code scansionato dal merchant
 * Supporta sia QR codes escrow che QR codes Vault
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Verifica che l'utente sia un merchant o admin
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo i merchant possono verificare le transazioni.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { qrData } = body

    if (!qrData) {
      return NextResponse.json({ error: 'QR code mancante' }, { status: 400 })
    }

    // Parse QR data (può essere JSON string o URL)
    let parsedData: any
    try {
      if (qrData.startsWith('{')) {
        parsedData = JSON.parse(qrData)
      } else if (qrData.includes('/merchant/verify/')) {
        // URL format: extract QR code from URL
        const qrCode = qrData.split('/merchant/verify/')[1]?.split('?')[0]
        if (qrCode) {
          parsedData = { type: 'ESCROW', qrCode }
        } else {
          throw new Error('QR code non valido')
        }
      } else if (qrData.includes('/scan/')) {
        // Vault slot scan URL
        const qrToken = qrData.split('/scan/')[1]?.split('?')[0]
        if (qrToken) {
          parsedData = { type: 'VAULT_SLOT', qrToken }
        } else {
          throw new Error('QR token non valido')
        }
      } else {
        // Assume it's a direct QR code string
        parsedData = { type: 'ESCROW', qrCode: qrData }
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: 'QR code non valido o formato non supportato' },
        { status: 400 }
      )
    }

    // Handle different QR types
    if (parsedData.type === 'ESCROW' || parsedData.qrCode) {
      // Escrow session QR
      const qrCode = parsedData.qrCode || parsedData.qrCode
      
      const session = await prisma.escrowSession.findUnique({
        where: { qrCode },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          transaction: {
            include: {
              proposal: {
                include: {
                  listing: {
                    select: {
                      id: true,
                      title: true,
                      images: true,
                      price: true,
                    },
                  },
                },
              },
              shop: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
      })

      if (!session) {
        return NextResponse.json(
          { error: 'QR Code non valido o sessione non trovata' },
          { status: 404 }
        )
      }

      // Verifica che il merchant sia autorizzato
      if (user.role !== 'ADMIN' && session.merchantId !== user.id) {
        return NextResponse.json(
          { error: 'Non sei autorizzato a gestire questa transazione' },
          { status: 403 }
        )
      }

      // Update QR scanned timestamp if not already scanned
      if (!session.qrScannedAt) {
        await prisma.escrowSession.update({
          where: { id: session.id },
          data: {
            qrScannedAt: new Date(),
            qrScannedBy: user.id,
          },
        })
      }

      return NextResponse.json({
        type: 'ESCROW',
        session,
        redirectUrl: `/merchant/verify/${qrCode}`,
      })
    } else if (parsedData.type === 'VAULT_SLOT' || parsedData.qrToken) {
      // Vault slot QR
      const qrToken = parsedData.qrToken || parsedData.qrToken

      const slot = await prisma.vaultCaseSlot.findUnique({
        where: { qrToken },
        include: {
          case: {
            include: {
              authorizedShop: {
                select: {
                  id: true,
                  name: true,
                  merchantId: true,
                },
              },
            },
          },
          item: {
            select: {
              id: true,
              name: true,
              game: true,
              status: true,
            },
          },
        },
      })

      if (!slot) {
        return NextResponse.json(
          { error: 'Slot non trovato' },
          { status: 404 }
        )
      }

      // Verifica che il merchant sia autorizzato
      if (user.role !== 'ADMIN' && user.role !== 'HUB_STAFF') {
        if (slot.case.authorizedShopId) {
          const shop = slot.case.authorizedShop
          if (shop?.merchantId !== user.id) {
            return NextResponse.json(
              { error: 'Non sei autorizzato a gestire questo slot' },
              { status: 403 }
            )
          }
        } else {
          return NextResponse.json(
            { error: 'Non sei autorizzato a gestire questo slot' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({
        type: 'VAULT_SLOT',
        slot,
        redirectUrl: `/merchant/vault/scan?token=${qrToken}`,
      })
    } else {
      return NextResponse.json(
        { error: 'Tipo di QR code non supportato' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Error scanning QR code:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella scansione del QR code' },
      { status: 500 }
    )
  }
}

