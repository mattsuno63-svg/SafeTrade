import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/escrow-agents
 *
 * Lista tutti gli escrow agent autorizzati. Solo ADMIN.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Solo Admin' }, { status: 403 })
    }

    const agents = await prisma.escrowAgentAuthorization.findMany({
      orderBy: { authorizedAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        authorizedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return NextResponse.json({ data: agents })
  } catch (error: any) {
    console.error('[GET /api/admin/escrow-agents] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/escrow-agents
 *
 * Autorizza un utente come Escrow Agent. Solo ADMIN.
 *
 * Operazioni:
 * 1. Cambia il ruolo dell'utente a ESCROW_AGENT
 * 2. Crea un record EscrowAgentAuthorization
 *
 * Body:
 * - userId: string - ID utente da autorizzare
 * - notes?: string - Motivo dell'autorizzazione
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentUser()

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo Admin può autorizzare Escrow Agent' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, notes } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    // Verifica che l'utente esista
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      )
    }

    // Non puoi autorizzare un admin come escrow agent
    if (targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Un Admin ha già tutti i permessi di Escrow Agent' },
        { status: 400 }
      )
    }

    // Verifica se esiste già un'autorizzazione
    const existing = await prisma.escrowAgentAuthorization.findUnique({
      where: { userId },
    })

    if (existing && existing.isActive) {
      return NextResponse.json(
        { error: 'Utente già autorizzato come Escrow Agent' },
        { status: 400 }
      )
    }

    // Transazione atomica: aggiorna ruolo + crea/riattiva autorizzazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cambia ruolo utente a ESCROW_AGENT
      await tx.user.update({
        where: { id: userId },
        data: { role: 'ESCROW_AGENT' },
      })

      // 2. Crea o riattiva autorizzazione
      let authorization
      if (existing) {
        authorization = await tx.escrowAgentAuthorization.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            authorizedById: admin.id,
            notes: notes || existing.notes,
            revokedAt: null,
            authorizedAt: new Date(),
          },
        })
      } else {
        authorization = await tx.escrowAgentAuthorization.create({
          data: {
            userId,
            authorizedById: admin.id,
            notes,
          },
        })
      }

      // 3. Notifica l'utente
      await tx.notification.create({
        data: {
          userId,
          type: 'ESCROW_AGENT_AUTHORIZED',
          title: 'Sei stato autorizzato come Escrow Agent',
          message: `L'amministratore ${admin.name || admin.email} ti ha autorizzato come Escrow Agent. Puoi ora confermare pagamenti ricevuti per il Verified Escrow.`,
        },
      })

      return authorization
    })

    return NextResponse.json({
      success: true,
      message: `${targetUser.name || targetUser.email} è stato autorizzato come Escrow Agent`,
      data: result,
    })
  } catch (error: any) {
    console.error('[POST /api/admin/escrow-agents] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/escrow-agents
 *
 * Revoca autorizzazione Escrow Agent. Solo ADMIN.
 * Body:
 * - userId: string - ID utente da revocare
 */
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getCurrentUser()

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo Admin può revocare Escrow Agent' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'userId è obbligatorio' },
        { status: 400 }
      )
    }

    const authorization = await prisma.escrowAgentAuthorization.findUnique({
      where: { userId },
    })

    if (!authorization) {
      return NextResponse.json(
        { error: 'Autorizzazione non trovata' },
        { status: 404 }
      )
    }

    if (!authorization.isActive) {
      return NextResponse.json(
        { error: 'Autorizzazione già revocata' },
        { status: 400 }
      )
    }

    // Transazione atomica: revoca + ripristina ruolo
    await prisma.$transaction(async (tx) => {
      // 1. Revoca autorizzazione
      await tx.escrowAgentAuthorization.update({
        where: { id: authorization.id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      })

      // 2. Ripristina ruolo a USER
      await tx.user.update({
        where: { id: userId },
        data: { role: 'USER' },
      })

      // 3. Notifica l'utente
      await tx.notification.create({
        data: {
          userId,
          type: 'ESCROW_AGENT_REVOKED',
          title: 'Autorizzazione Escrow Agent Revocata',
          message: `L'amministratore ha revocato la tua autorizzazione come Escrow Agent.`,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Autorizzazione Escrow Agent revocata',
    })
  } catch (error: any) {
    console.error('[DELETE /api/admin/escrow-agents] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
