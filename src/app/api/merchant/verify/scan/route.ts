import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { logSecurityEvent } from '@/lib/security/audit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// SECURITY #5: Schema Zod per validazione QR code
const qrDataSchema = z.string()
  .min(1, 'QR code non può essere vuoto')
  .max(500, 'QR code troppo lungo (max 500 caratteri)')
  .refine(
    (val) => {
      // Verifica che non contenga script injection o caratteri pericolosi
      const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick, onerror, etc.
        /eval\(/i,
        /expression\(/i,
      ]
      return !dangerousPatterns.some(pattern => pattern.test(val))
    },
    { message: 'QR code contiene caratteri non validi o potenzialmente pericolosi' }
  )

const scanQRRequestSchema = z.object({
  qrData: qrDataSchema,
})

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
      // BUG #4 FIX: Log unauthorized access attempt
      await logSecurityEvent({
        eventType: 'ROLE_ACCESS_DENIED',
        attemptedById: user.id,
        endpoint: '/api/merchant/verify/scan',
        method: 'POST',
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

    // BUG #8 FIX: Rate limiting for QR scan
    const rateLimitKey = getRateLimitKey(user.id, 'QR_SCAN')
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMITS.QR_SCAN)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Limite di 20 scansioni QR per ora raggiunto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000), // seconds
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.limit.toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // SECURITY #5: Validazione input con Zod
    let body: unknown
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Body richiesta non valido' },
        { status: 400 }
      )
    }

    const validationResult = scanQRRequestSchema.safeParse(body)
    if (!validationResult.success) {
      // Log tentativo con input non valido
      await logSecurityEvent({
        eventType: 'QR_SCAN_UNAUTHORIZED',
        attemptedById: user.id,
        endpoint: '/api/merchant/verify/scan',
        method: 'POST',
        request,
        wasBlocked: true,
        reason: `Invalid QR code input: ${validationResult.error.errors.map(e => e.message).join(', ')}`,
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

    const { qrData } = validationResult.data

    // SECURITY #5: Sanitizzazione aggiuntiva - rimuovi caratteri di controllo
    const sanitizedQrData = qrData
      .replace(/[\x00-\x1F\x7F]/g, '') // Rimuovi caratteri di controllo
      .trim()

    if (!sanitizedQrData) {
      return NextResponse.json(
        { error: 'QR code non valido dopo sanitizzazione' },
        { status: 400 }
      )
    }

    // Parse QR data (può essere JSON string o URL)
    let parsedData: any
    try {
      if (sanitizedQrData.startsWith('{')) {
        parsedData = JSON.parse(sanitizedQrData)
      } else if (sanitizedQrData.includes('/merchant/verify/')) {
        // URL format: extract QR code from URL
        const qrCode = qrData.split('/merchant/verify/')[1]?.split('?')[0]
        if (qrCode) {
          parsedData = { type: 'ESCROW', qrCode }
        } else {
          throw new Error('QR code non valido')
        }
      } else if (sanitizedQrData.includes('/scan/')) {
        // Vault slot scan URL
        const qrToken = sanitizedQrData.split('/scan/')[1]?.split('?')[0]
        if (qrToken && qrToken.length <= 255) {
          parsedData = { type: 'VAULT_SLOT', qrToken }
        } else {
          throw new Error('QR token non valido o troppo lungo')
        }
      } else {
        // Assume it's a direct QR code string
        // SECURITY #5: Verifica lunghezza massima per QR code diretto
        if (sanitizedQrData.length > 255) {
          throw new Error('QR code troppo lungo (max 255 caratteri)')
        }
        parsedData = { type: 'ESCROW', qrCode: sanitizedQrData }
      }
    } catch (parseError) {
      // Log errore parsing
      await logSecurityEvent({
        eventType: 'QR_SCAN_UNAUTHORIZED',
        attemptedById: user.id,
        endpoint: '/api/merchant/verify/scan',
        method: 'POST',
        request,
        wasBlocked: true,
        reason: `QR code parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        severity: 'MEDIUM',
      })

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

      // BUG #6 FIX: Check if QR code has expired
      if (session.qrCodeExpiresAt && new Date() > session.qrCodeExpiresAt) {
        // BUG #4 FIX: Log expired QR code attempt
        await logSecurityEvent({
          eventType: 'QR_SCAN_EXPIRED',
          attemptedById: user.id,
          endpoint: '/api/merchant/verify/scan',
          method: 'POST',
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

      // Verifica che il merchant sia autorizzato
      if (user.role !== 'ADMIN' && session.merchantId !== user.id) {
        // BUG #4 FIX: Log unauthorized QR scan attempt
        await logSecurityEvent({
          eventType: 'QR_SCAN_UNAUTHORIZED',
          attemptedById: user.id,
          endpoint: '/api/merchant/verify/scan',
          method: 'POST',
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

      // Verifica che il merchant sia autorizzato (ADMIN può sempre accedere)
      if (user.role !== 'ADMIN') {
        if (slot.case.authorizedShopId) {
          const shop = slot.case.authorizedShop
          if (shop?.merchantId !== user.id) {
            // BUG #4 FIX: Log unauthorized Vault slot access attempt
            await logSecurityEvent({
              eventType: 'VAULT_ACCESS_UNAUTHORIZED',
              attemptedById: user.id,
              endpoint: '/api/merchant/verify/scan',
              method: 'POST',
              resourceId: slot.id,
              resourceType: 'VAULT_SLOT',
              request,
              wasBlocked: true,
              reason: `Merchant ${user.id} not authorized for slot ${slot.id} (authorized merchant: ${shop?.merchantId})`,
              severity: 'HIGH',
              metadata: { qrToken, slotId: slot.id, caseId: slot.caseId, authorizedShopId: slot.case.authorizedShopId },
            })

            return NextResponse.json(
              { error: 'Non sei autorizzato a gestire questo slot' },
              { status: 403 }
            )
          }
        } else {
          // BUG #4 FIX: Log unauthorized Vault slot access attempt (no authorized shop)
          await logSecurityEvent({
            eventType: 'VAULT_ACCESS_UNAUTHORIZED',
            attemptedById: user.id,
            endpoint: '/api/merchant/verify/scan',
            method: 'POST',
            resourceId: slot.id,
            resourceType: 'VAULT_SLOT',
            request,
            wasBlocked: true,
            reason: `Slot ${slot.id} has no authorized shop`,
            severity: 'HIGH',
            metadata: { qrToken, slotId: slot.id, caseId: slot.caseId },
          })

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

