import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/pending-releases/[id]/reject
 * 
 * Rifiuta una richiesta di rilascio fondi.
 * Richiede una motivazione.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin e Moderator possono rifiutare rilasci.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { reason } = body

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Motivazione obbligatoria (minimo 10 caratteri)' },
        { status: 400 }
      )
    }

    // Trova la pending release
    const pendingRelease = await prisma.pendingRelease.findUnique({
      where: { id },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: true,
      },
    })

    if (!pendingRelease) {
      return NextResponse.json(
        { error: 'Richiesta di rilascio non trovata' },
        { status: 404 }
      )
    }

    // Verifica status
    if (pendingRelease.status !== 'PENDING') {
      return NextResponse.json(
        { 
          error: `Questa richiesta è già stata processata (status: ${pendingRelease.status})`,
          currentStatus: pendingRelease.status 
        },
        { status: 400 }
      )
    }

    // Ottieni IP e user agent per audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const rejectedAt = new Date()

    // Esegui transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna pending release come REJECTED
      const updatedRelease = await tx.pendingRelease.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedById: user.id,
          rejectedAt,
          rejectionReason: reason,
          confirmationToken: null, // Invalida eventuali token
          tokenExpiresAt: null,
        },
      })

      // 2. Crea audit log
      const auditLog = await tx.financialAuditLog.create({
        data: {
          actionType: `${pendingRelease.type}_REJECTED`,
          pendingReleaseId: id,
          orderId: pendingRelease.orderId,
          amount: pendingRelease.amount,
          recipientId: pendingRelease.recipientId,
          performedById: user.id,
          performedByRole: user.role,
          ipAddress,
          userAgent,
          firstClickAt: rejectedAt, // Per rifiuto, un solo click
          confirmClickAt: rejectedAt,
          notes: reason,
        },
      })

      // 3. Crea notifica per informare (opzionale, dipende dal caso)
      // Se era un rimborso rifiutato, notifica il buyer
      if (pendingRelease.type === 'REFUND_FULL' || pendingRelease.type === 'REFUND_PARTIAL') {
        await tx.notification.create({
          data: {
            userId: pendingRelease.recipientId,
            type: 'refund_rejected',
            title: 'Richiesta rimborso non approvata',
            message: `La tua richiesta di rimborso di €${pendingRelease.amount.toFixed(2)} non è stata approvata. Motivo: ${reason}`,
            link: pendingRelease.orderId ? `/transactions/${pendingRelease.orderId}` : '/wallet',
          },
        })
      }

      return { updatedRelease, auditLog }
    })

    return NextResponse.json({
      success: true,
      status: 'REJECTED',
      message: `❌ Richiesta rifiutata. €${pendingRelease.amount.toFixed(2)} NON rilasciati.`,
      pending_release_id: result.updatedRelease.id,
      audit_log_id: result.auditLog.id,
      amount: pendingRelease.amount,
      recipient: {
        id: pendingRelease.recipient.id,
        name: pendingRelease.recipient.name,
        email: pendingRelease.recipient.email,
      },
      rejected_by: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      rejected_at: rejectedAt.toISOString(),
      reason,
    })
  } catch (error) {
    console.error('Error rejecting release:', error)
    return NextResponse.json(
      { error: 'Errore nel rifiuto della richiesta' },
      { status: 500 }
    )
  }
}

