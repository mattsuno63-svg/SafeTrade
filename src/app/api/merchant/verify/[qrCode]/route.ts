import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security/audit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/merchant/verify/[qrCode]
 * Recupera i dettagli di una sessione escrow tramite QR code
 * Solo i merchant possono accedere a questo endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> | { qrCode: string } }
) {
  try {
    const user = await requireAuth()
    // Handle both Promise and non-Promise params (Next.js 14 vs 15)
    const resolvedParams = 'then' in params ? await params : params
    const { qrCode } = resolvedParams

    // Verifica che l'utente sia un merchant o admin
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      // BUG #4 FIX: Log unauthorized access attempt
      await logSecurityEvent({
        eventType: 'ROLE_ACCESS_DENIED',
        attemptedById: user.id,
        endpoint: `/api/merchant/verify/${qrCode}`,
        method: 'GET',
        resourceId: qrCode,
        resourceType: 'QR_CODE',
        request,
        wasBlocked: true,
        reason: `User role ${user.role} not authorized for merchant operations`,
        severity: 'MEDIUM',
      })

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

    // BUG #6 FIX: Check if QR code has expired
    if (session.qrCodeExpiresAt && new Date() > session.qrCodeExpiresAt) {
      // BUG #4 FIX: Log expired QR code attempt
      await logSecurityEvent({
        eventType: 'QR_SCAN_EXPIRED',
        attemptedById: user.id,
        endpoint: `/api/merchant/verify/${qrCode}`,
        method: 'GET',
        resourceId: session.id,
        resourceType: 'ESCROW_SESSION',
        request,
        wasBlocked: true,
        reason: `QR code expired at ${session.qrCodeExpiresAt}`,
        severity: 'LOW',
        metadata: { qrCode, expiredAt: session.qrCodeExpiresAt },
      })

      return NextResponse.json(
        { 
          error: 'QR Code scaduto. Il QR code è valido per 7 giorni dalla creazione della transazione.',
          expiredAt: session.qrCodeExpiresAt,
        },
        { status: 400 }
      )
    }

    // Verifica che il merchant sia autorizzato a gestire questa transazione
    // (deve essere il merchant associato a questa sessione o un admin)
    if (user.role !== 'ADMIN' && session.merchantId !== user.id) {
      // BUG #4 FIX: Log unauthorized QR scan attempt
      await logSecurityEvent({
        eventType: 'QR_SCAN_UNAUTHORIZED',
        attemptedById: user.id,
        endpoint: `/api/merchant/verify/${qrCode}`,
        method: 'GET',
        resourceId: session.id,
        resourceType: 'ESCROW_SESSION',
        request,
        wasBlocked: true,
        reason: `Merchant ${user.id} not authorized for session ${session.id} (authorized merchant: ${session.merchantId})`,
        severity: 'HIGH',
        metadata: { qrCode, sessionId: session.id, authorizedMerchantId: session.merchantId },
      })

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

