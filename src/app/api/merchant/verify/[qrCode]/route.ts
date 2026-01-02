import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/merchant/verify/[qrCode]
 * Recupera i dettagli di una sessione escrow tramite QR code
 * Solo i merchant possono accedere a questo endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { qrCode: string } }
) {
  try {
    const user = await requireAuth()
    const { qrCode } = params

    // Verifica che l'utente sia un merchant o admin
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo i merchant possono verificare le transazioni.' },
        { status: 403 }
      )
    }

    // Cerca la sessione escrow tramite QR code
    const session = await prisma.escrowSession.findUnique({
      where: { qrCode: qrCode },
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

    // Verifica che il merchant sia autorizzato a gestire questa transazione
    // (deve essere il merchant associato a questa sessione o un admin)
    if (user.role !== 'ADMIN' && session.merchantId !== user.id) {
      return NextResponse.json(
        { error: 'Non sei autorizzato a gestire questa transazione' },
        { status: 403 }
      )
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Error verifying QR code:', error)
    return NextResponse.json(
      { error: error.message || 'Errore nella verifica del QR code' },
      { status: 500 }
    )
  }
}

