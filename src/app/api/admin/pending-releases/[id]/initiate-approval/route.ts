import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Token valido per 5 minuti
const TOKEN_VALIDITY_MINUTES = 5

/**
 * POST /api/admin/pending-releases/[id]/initiate-approval
 * 
 * STEP 1 della doppia conferma:
 * - Genera un token di conferma temporaneo (valido 5 minuti)
 * - Mostra i dettagli del rilascio per conferma
 * - L'utente deve poi chiamare /confirm-approval con questo token
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
        { error: 'Accesso negato. Solo Admin e Moderator possono approvare rilasci.' },
        { status: 403 }
      )
    }

    const { id } = params

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
        order: {
          select: {
            id: true,
            status: true,
            userA: { select: { name: true } },
            userB: { select: { name: true } },
          },
        },
      },
    })

    if (!pendingRelease) {
      return NextResponse.json(
        { error: 'Richiesta di rilascio non trovata' },
        { status: 404 }
      )
    }

    // Verifica che sia ancora PENDING
    if (pendingRelease.status !== 'PENDING') {
      return NextResponse.json(
        { 
          error: `Questa richiesta è già stata processata (status: ${pendingRelease.status})`,
          currentStatus: pendingRelease.status 
        },
        { status: 400 }
      )
    }

    // Genera token di conferma
    const confirmationToken = randomUUID()
    const tokenExpiresAt = new Date(Date.now() + TOKEN_VALIDITY_MINUTES * 60 * 1000)

    // Salva il token nella pending release
    await prisma.pendingRelease.update({
      where: { id },
      data: {
        confirmationToken,
        tokenExpiresAt,
      },
    })

    // Prepara i dettagli per la conferma
    const typeLabels: Record<string, string> = {
      RELEASE_TO_SELLER: 'Rilascio fondi al venditore',
      REFUND_FULL: 'Rimborso totale al compratore',
      REFUND_PARTIAL: 'Rimborso parziale',
      HUB_COMMISSION: 'Commissione Hub Provider',
      WITHDRAWAL: 'Prelievo wallet',
    }

    return NextResponse.json({
      success: true,
      confirmation_token: confirmationToken,
      expires_at: tokenExpiresAt.toISOString(),
      expires_in_seconds: TOKEN_VALIDITY_MINUTES * 60,
      details: {
        id: pendingRelease.id,
        type: pendingRelease.type,
        type_label: typeLabels[pendingRelease.type] || pendingRelease.type,
        amount: pendingRelease.amount,
        recipient: {
          id: pendingRelease.recipient.id,
          name: pendingRelease.recipient.name,
          email: pendingRelease.recipient.email,
        },
        order_id: pendingRelease.order?.id,
        reason: pendingRelease.reason,
        triggered_by: pendingRelease.triggeredBy,
        triggered_at: pendingRelease.triggeredAt,
      },
      message: `⚠️ ATTENZIONE: Stai per rilasciare €${pendingRelease.amount.toFixed(2)} a ${pendingRelease.recipient.name || pendingRelease.recipient.email}. Clicca "Sì, sono sicuro!" per confermare. Il token scade tra ${TOKEN_VALIDITY_MINUTES} minuti.`,
    })
  } catch (error) {
    console.error('Error initiating approval:', error)
    return NextResponse.json(
      { error: 'Errore nell\'inizializzazione dell\'approvazione' },
      { status: 500 }
    )
  }
}

