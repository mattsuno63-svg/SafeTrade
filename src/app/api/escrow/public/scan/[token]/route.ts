import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security/audit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/escrow/public/scan/[token]
 * Route pubblica per scan QR token (no auth richiesto)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    console.log('[QR Scan API] Token received:', token)
    
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Rate limiting (per IP)
    const rateLimitKey = getRateLimitKey(ipAddress || 'unknown', 'QR_SCAN_PUBLIC')
    const rateLimit = await checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 60 * 1000 }) // 10 req/min

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 10 scansioni al minuto raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    console.log('[QR Scan API] Rate limit passed, searching session...')

    // Find session by QR token (try qrToken first, then qrCode for backward compatibility)
    // Simplified query to avoid errors with missing fields
    let session = null
    try {
      session = await prisma.escrowSession.findFirst({
        where: {
          OR: [
            { qrToken: token },
            { qrCode: token }, // Backward compatibility with old qrCode format
          ],
        },
        include: {
          transaction: {
            include: {
              shop: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  city: true,
                  phone: true,
                  email: true,
                },
              },
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
            },
          },
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
          merchant: { select: { id: true, name: true, email: true } },
        },
      })
      console.log('[QR Scan API] Session query completed, session found:', !!session)
    } catch (queryError: any) {
      console.error('[QR Scan API] Prisma query error:', queryError)
      // If query fails (e.g., missing columns), treat as no session found
      session = null
    }

    if (!session) {
      // Log security event (non-blocking - don't fail request if logging fails)
      logSecurityEvent({
        eventType: 'QR_SCAN_UNAUTHORIZED',
        attemptedById: undefined,
        endpoint: `/api/escrow/public/scan/${token}`,
        method: 'GET',
        resourceId: token,
        resourceType: 'QR_TOKEN',
        request,
        wasBlocked: true,
        reason: 'Invalid QR token',
        severity: 'MEDIUM',
      }).catch(err => console.error('Failed to log security event:', err))

      return NextResponse.json(
        { error: 'Token QR non valido o scaduto' },
        { status: 404 }
      )
    }

    // Check token expiration
    if (session.qrTokenExpiresAt && new Date() > session.qrTokenExpiresAt) {
      return NextResponse.json(
        { error: 'Token QR scaduto' },
        { status: 410 } // Gone
      )
    }

    // Return minimal info (public)
    const publicInfo = {
      entityType: 'CHECKIN_SESSION' as const,
      sessionId: session.id,
      status: session.status,
      appointmentSlot: session.appointmentSlot,
      shop: session.transaction?.shop || null, // Handle null transaction or shop
      // Only show buyer/seller names if authorized (will be checked on client)
      hasBuyerSeller: !!session.buyer && !!session.seller,
      expiredAt: session.expiredAt,
    }

    return NextResponse.json(publicInfo)
  } catch (error: any) {
    console.error('Error resolving QR token:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

