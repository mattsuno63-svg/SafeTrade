import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canPerformAction, isTerminalStatus } from '@/lib/escrow/state-machine'
import { transitionSessionStatus, createAuditEvent, parseUserRole } from '@/lib/escrow/session-utils'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/escrow/sessions/[sessionId]/close
 * Chiude sessione manualmente (merchant o admin) - richiede doppia conferma
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
        { error: 'Solo merchant o admin possono chiudere la sessione' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { confirm } = body // Second confirmation

    if (!confirm) {
      return NextResponse.json(
        { error: 'Conferma richiesta per chiudere la sessione' },
        { status: 400 }
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

    // Verify session is not already terminal
    if (isTerminalStatus(session.status)) {
      return NextResponse.json(
        { error: `Sessione già chiusa. Stato attuale: ${session.status}` },
        { status: 400 }
      )
    }

    const userRole = parseUserRole(user.role) || 'MERCHANT'

    // Validate can close
    const canClose = canPerformAction(session.status, 'CLOSE_SESSION', userRole)
    if (!canClose.valid) {
      return NextResponse.json(
        { error: canClose.reason || 'Impossibile chiudere sessione' },
        { status: 400 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    // Transition to CANCELLED
    const result = await transitionSessionStatus(
      sessionId,
      'CANCELLED',
      user.id,
      userRole,
      {
        metadata: {
          closedBy: user.id,
          reason: 'Manual closure',
        },
        ipAddress,
        userAgent,
      }
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Errore nella chiusura' }, { status: 400 })
    }

    // Update session
    const updated = await prisma.escrowSession.update({
      where: { id: sessionId },
      data: {
        lastActivity: new Date(),
      },
    })

    await createAuditEvent(sessionId, 'SESSION_CLOSED_MANUAL', user.id, userRole, {
      oldStatus: session.status,
      newStatus: 'CANCELLED',
      metadata: {
        closedBy: user.id,
        closedAt: new Date().toISOString(),
      },
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      session: updated,
      message: 'Sessione chiusa con successo',
    })
  } catch (error) {
    console.error('Error closing session:', error)
    return handleApiError(error, 'escrow-sessions-id-close')
  }
}

