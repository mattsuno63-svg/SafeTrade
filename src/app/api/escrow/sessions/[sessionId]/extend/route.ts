import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canPerformAction } from '@/lib/escrow/state-machine'
import { transitionSessionStatus, createAuditEvent, parseUserRole } from '@/lib/escrow/session-utils'

/**
 * POST /api/escrow/sessions/[sessionId]/extend
 * Estende sessione scaduta (merchant o admin)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params

    // Verify user is merchant or admin
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo merchant o admin possono estendere la sessione' },
        { status: 403 }
      )
    }

    // Get session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 })
    }

    // Verify merchant owns this session or user is admin
    if (session.merchantId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato a gestire questa sessione' },
        { status: 403 }
      )
    }

    // Verify session is expired
    if (session.status !== 'EXPIRED') {
      return NextResponse.json(
        { error: `Sessione non scaduta. Stato attuale: ${session.status}` },
        { status: 400 }
      )
    }

    const userRole = parseUserRole(user.role) || 'MERCHANT'

    // Validate can extend
    const canExtend = canPerformAction(session.status, 'EXTEND_SESSION', userRole)
    if (!canExtend.valid) {
      return NextResponse.json(
        { error: canExtend.reason || 'Impossibile estendere sessione' },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Extend session: set new expiredAt (1 hour from now)
    const newExpiredAt = new Date()
    newExpiredAt.setHours(newExpiredAt.getHours() + 1)

    // Transition to CHECKIN_PENDING
    const result = await transitionSessionStatus(
      sessionId,
      'CHECKIN_PENDING',
      user.id,
      userRole,
      {
        metadata: {
          extendedBy: user.id,
          originalExpiredAt: session.expiredAt,
          newExpiredAt: newExpiredAt.toISOString(),
        },
        ipAddress,
        userAgent,
      }
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Errore nell\'estensione' }, { status: 400 })
    }

    // Update expiredAt
    const updated = await prisma.escrowSession.update({
      where: { id: sessionId },
      data: {
        expiredAt: newExpiredAt,
        lastActivity: new Date(),
      },
    })

    await createAuditEvent(sessionId, 'SESSION_EXTENDED', user.id, userRole, {
      oldStatus: session.status,
      newStatus: 'CHECKIN_PENDING',
      metadata: {
        originalExpiredAt: session.expiredAt,
        newExpiredAt: newExpiredAt.toISOString(),
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      session: updated,
      message: 'Sessione estesa con successo',
    })
  } catch (error: any) {
    console.error('Error extending session:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}

