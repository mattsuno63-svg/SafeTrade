import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logSecurityEvent } from '@/lib/security/audit'
import { z } from 'zod'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

// SECURITY #5: Schema Zod per validazione QR code
const qrCodeSchema = z.string()
  .min(1, 'QR code non può essere vuoto')
  .max(255, 'QR code troppo lungo (max 255 caratteri)')
  .refine(
    (val) => {
      // Verifica che non contenga script injection o caratteri pericolosi
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\(/i,
        /expression\(/i,
      ]
      return !dangerousPatterns.some(pattern => pattern.test(val))
    },
    { message: 'QR code contiene caratteri non validi o potenzialmente pericolosi' }
  )

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
    let { qrCode } = resolvedParams

    // SECURITY #5: Validazione e sanitizzazione QR code
    const validationResult = qrCodeSchema.safeParse(qrCode)
    if (!validationResult.success) {
      // Log tentativo con QR code non valido
      await logSecurityEvent({
        eventType: 'QR_SCAN_UNAUTHORIZED',
        attemptedById: user.id,
        endpoint: `/api/merchant/verify/${qrCode}`,
        method: 'GET',
        resourceId: qrCode,
        resourceType: 'QR_CODE',
        request,
        wasBlocked: true,
        reason: `Invalid QR code format: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
        severity: 'MEDIUM',
        metadata: { validationErrors: validationResult.error.errors },
      })

      return NextResponse.json(
        { 
          error: 'QR code non valido',
          details: validationResult.error.errors.map(e => e.message),
        },
        { status: 400 }
      )
    }

    // Sanitizzazione aggiuntiva
    qrCode = validationResult.data
      .replace(/[\x00-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
      .trim()

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
  } catch (error) {
    console.error('Error verifying QR code:', error)
    return handleApiError(error, 'merchant-verify-id')
  }
}

