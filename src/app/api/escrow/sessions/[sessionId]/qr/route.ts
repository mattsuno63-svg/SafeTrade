import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import QRCode from 'qrcode'
import { logSecurityEvent } from '@/lib/security/audit'
import { handleApiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

/**
 * GET /api/escrow/sessions/[sessionId]/qr
 * Genera il QR code per una sessione SafeTrade
 * 
 * Il QR code contiene un link univoco che il merchant può scannerizzare
 * per verificare la transazione e completare il pagamento in contanti
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    // Handle both Promise and non-Promise params (Next.js 14 vs 15)
    const resolvedParams = 'then' in params ? await params : params
    const { sessionId } = resolvedParams

    // Fetch the escrow session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      include: {
        buyer: { select: { id: true, name: true, email: true } },
        seller: { select: { id: true, name: true, email: true } },
        merchant: { select: { id: true, name: true } },
        transaction: {
          include: {
            proposal: {
              include: {
                listing: true,
              },
            },
          },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Sessione non trovata' },
        { status: 404 }
      )
    }

    // Verifica che l'utente sia autorizzato a vedere questo QR
    // (buyer, seller, merchant, o admin)
    const isAuthorized =
      user.id === session.buyerId ||
      user.id === session.sellerId ||
      user.id === session.merchantId ||
      user.role === 'ADMIN'

    if (!isAuthorized) {
      // BUG #4 FIX: Log unauthorized QR generation attempt
      await logSecurityEvent({
        eventType: 'ESCROW_SESSION_ACCESS_UNAUTHORIZED',
        attemptedById: user.id,
        endpoint: `/api/escrow/sessions/${sessionId}/qr`,
        method: 'GET',
        resourceId: sessionId,
        resourceType: 'ESCROW_SESSION',
        request,
        wasBlocked: true,
        reason: `User ${user.id} not authorized to generate QR for session ${sessionId}`,
        severity: 'MEDIUM',
        metadata: {
          sessionId,
          buyerId: session.buyerId,
          sellerId: session.sellerId,
          merchantId: session.merchantId,
          userRole: user.role,
        },
      })

      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      )
    }

    // Genera o recupera il QR code univoco
    let qrCode = session.qrCode
    if (!qrCode) {
      // Se non esiste, generiamone uno nuovo
      qrCode = `ST-${session.id}-${Date.now()}`
      await prisma.escrowSession.update({
        where: { id: sessionId },
        data: { qrCode },
      })
    }

    // Calcola quanto paga il compratore
    const buyerPays =
      session.feePaidBy === 'BUYER'
        ? session.totalAmount + session.feeAmount
        : session.totalAmount

    // Crea il payload del QR code
    // URL che punta alla pagina di verifica per il merchant
    const baseUrl = new URL(request.url).origin
    const qrPayload = {
      type: 'SAFETRADE_ESCROW',
      sessionId: session.id,
      qrCode: qrCode,
      verifyUrl: `${baseUrl}/merchant/verify/${qrCode}`,
      amount: buyerPays,
      currency: 'EUR',
    }

    // Ottieni il formato richiesto (default: data URL)
    const format = request.nextUrl.searchParams.get('format') || 'dataURL'

    let qrData: string

    if (format === 'svg') {
      // Genera QR code come SVG
      qrData = await QRCode.toString(JSON.stringify(qrPayload), {
        type: 'svg',
        width: 300,
        margin: 2,
      })
      return new NextResponse(qrData, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      })
    } else {
      // Genera QR code come Data URL (default)
      qrData = await QRCode.toDataURL(JSON.stringify(qrPayload), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })

      return NextResponse.json({
        qrCode: qrCode,
        qrData: qrData,
        sessionId: session.id,
        verifyUrl: qrPayload.verifyUrl,
        amount: session.totalAmount,
        feeAmount: session.feeAmount,
        feePercentage: session.feePercentage,
        feePaidBy: session.feePaidBy,
        finalAmount: session.finalAmount,
        buyerPays: buyerPays,
        sellerReceives: session.finalAmount,
        status: session.status,
      })
    }
  } catch (error) {
    console.error('Error generating QR code:', error)
    return handleApiError(error, 'escrow-sessions-id-qr')
  }
}

