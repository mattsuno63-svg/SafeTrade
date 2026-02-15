import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canCheckIn as canCheckInValidation, canCheckInStatus } from '@/lib/escrow/state-machine'
import { transitionSessionStatus, createAuditEvent, parseUserRole } from '@/lib/escrow/session-utils'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/escrow/sessions/[sessionId]/checkin
 * Merchant check-in: conferma presenza buyer e seller
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params

    // Verify user is merchant
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo il merchant può eseguire il check-in' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { buyerPresent, sellerPresent } = body

    // Validate presence flags
    if (typeof buyerPresent !== 'boolean' || typeof sellerPresent !== 'boolean') {
      return NextResponse.json(
        { error: 'buyerPresent e sellerPresent devono essere boolean' },
        { status: 400 }
      )
    }

    // Get session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      include: {
        transaction: { include: { shop: true } },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 })
    }

    // Verify merchant owns this session
    if (session.merchantId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato a gestire questa sessione' },
        { status: 403 }
      )
    }

    // Validate status
    if (!canCheckInStatus(session.status)) {
      return NextResponse.json(
        { error: `Check-in non possibile dallo stato ${session.status}` },
        { status: 400 }
      )
    }

    // Validate presence
    const presenceValidation = canCheckInValidation(buyerPresent, sellerPresent)
    if (!presenceValidation.valid) {
      return NextResponse.json(
        { error: presenceValidation.reason || 'Presenza non valida' },
        { status: 400 }
      )
    }

    // Perform check-in
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const userRole = parseUserRole(user.role) || 'MERCHANT'

    const result = await transitionSessionStatus(
      sessionId,
      'CHECKED_IN',
      user.id,
      userRole,
      {
        ipAddress,
        userAgent,
      }
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Errore nel check-in' }, { status: 400 })
    }

    // Update check-in details
    const updated = await prisma.escrowSession.update({
      where: { id: sessionId },
      data: {
        buyerPresent,
        sellerPresent,
        checkInAt: new Date(),
        qrScannedAt: new Date(),
        qrScannedBy: user.id,
        lastActivity: new Date(),
      },
    })

    // Create system message
    await prisma.escrowMessage.create({
      data: {
        sessionId,
        senderId: user.id,
        content: `Check-in completato. Buyer: ${buyerPresent ? 'Presente' : 'Assente'}, Seller: ${sellerPresent ? 'Presente' : 'Assente'}`,
        isSystem: true,
      },
    })

    // Create audit event
    await createAuditEvent(
      sessionId,
      'CHECK_IN',
      user.id,
      userRole,
      {
        oldStatus: session.status,
        newStatus: 'CHECKED_IN',
        metadata: { buyerPresent, sellerPresent },
        ipAddress,
        userAgent,
      }
    )

    return NextResponse.json({
      success: true,
      session: updated,
      message: 'Check-in completato con successo',
    })
  } catch (error) {
    console.error('Error performing check-in:', error)
    return handleApiError(error, 'escrow-sessions-id-checkin')
  }
}

