import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// POST - Risolvi sinistro (Admin/Moderator only)
// Crea un PendingRelease per il rimborso
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: insuranceId } = await params
    const body = await request.json()
    const { 
      decision, // 'APPROVED', 'PARTIAL', 'REJECTED'
      settledAmount, // Importo approvato
      notes, // Note admin
    } = body

    // Verifica utente admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, role: true, name: true },
    })

    if (!dbUser || !['ADMIN', 'MODERATOR'].includes(dbUser.role)) {
      return NextResponse.json(
        { error: 'Solo Admin/Moderator possono risolvere sinistri' },
        { status: 403 }
      )
    }

    // Validazione
    if (!decision || !['APPROVED', 'PARTIAL', 'REJECTED'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decisione richiesta: APPROVED, PARTIAL, o REJECTED' },
        { status: 400 }
      )
    }

    if (decision !== 'REJECTED' && (!settledAmount || settledAmount <= 0)) {
      return NextResponse.json(
        { error: 'Importo rimborso richiesto per approvazione' },
        { status: 400 }
      )
    }

    // Verifica assicurazione
    const insurance = await prisma.packageInsurance.findUnique({
      where: { id: insuranceId },
      include: {
        transaction: {
          select: {
            id: true,
            userAId: true,
            userBId: true,
            userA: { select: { id: true, name: true, email: true } },
            userB: { select: { name: true } },
          },
        },
      },
    })

    if (!insurance) {
      return NextResponse.json({ error: 'Assicurazione non trovata' }, { status: 404 })
    }

    if (insurance.status !== 'CLAIMED') {
      return NextResponse.json(
        { error: 'Sinistro non in attesa di risoluzione' },
        { status: 400 }
      )
    }

    // Verifica importo non superi claim amount
    if (settledAmount > (insurance.claimAmount || 0)) {
      return NextResponse.json(
        { error: `Importo (€${settledAmount}) supera la richiesta di sinistro (€${insurance.claimAmount})` },
        { status: 400 }
      )
    }

    // Verifica importo non superi valore assicurato
    if (settledAmount > insurance.insuredValue) {
      return NextResponse.json(
        { error: `Importo (€${settledAmount}) supera il valore assicurato (€${insurance.insuredValue})` },
        { status: 400 }
      )
    }

    const now = new Date()

    // Se approvato/parziale, crea PendingRelease per rimborso
    if (decision === 'APPROVED' || decision === 'PARTIAL') {
      // Crea PendingRelease per il rimborso assicurativo
      const pendingRelease = await prisma.pendingRelease.create({
        data: {
          type: 'INSURANCE_REFUND',
          recipientId: insurance.transaction.userAId, // Buyer riceve rimborso
          recipientType: 'BUYER',
          amount: settledAmount,
          orderId: insurance.transactionId,
          status: 'PENDING',
          triggeredBy: dbUser.id,
          reason: `Rimborso assicurativo ${decision === 'PARTIAL' ? 'parziale' : 'totale'}: €${settledAmount.toFixed(2)}. ${notes || ''}`,
        },
      })

      // Aggiorna assicurazione
      await prisma.packageInsurance.update({
        where: { id: insuranceId },
        data: {
          status: 'SETTLED',
          claimSettledAt: now,
          claimSettledAmount: settledAmount,
          claimNotes: notes,
        },
      })

      // Crea notifica admin per approvare il rilascio
      await prisma.adminNotification.create({
        data: {
          type: 'PENDING_RELEASE',
          title: '💰 Rimborso assicurativo da approvare',
          message: `Rimborso di €${settledAmount.toFixed(2)} per ${insurance.transaction.userA?.name || 'buyer'} da approvare.`,
          referenceType: 'PENDING_RELEASE',
          referenceId: pendingRelease.id,
          targetRoles: ['ADMIN', 'MODERATOR'],
          priority: 'HIGH',
        },
      })

      // Notifica al buyer
      await prisma.notification.create({
        data: {
          userId: insurance.transaction.userAId,
          type: 'insurance_approved',
          title: '✅ Sinistro approvato',
          message: `Il tuo sinistro è stato ${decision === 'PARTIAL' ? 'parzialmente ' : ''}approvato. Rimborso: €${settledAmount.toFixed(2)}. In attesa di elaborazione.`,
          link: `/transactions/${insurance.transactionId}`,
        },
      })

      return NextResponse.json({
        success: true,
        decision,
        settledAmount,
        pendingReleaseId: pendingRelease.id,
        message: `Sinistro ${decision === 'PARTIAL' ? 'parzialmente ' : ''}approvato. PendingRelease creato per €${settledAmount.toFixed(2)}.`,
      })

    } else {
      // Sinistro rifiutato
      await prisma.packageInsurance.update({
        where: { id: insuranceId },
        data: {
          status: 'SETTLED',
          claimSettledAt: now,
          claimSettledAmount: 0,
          claimNotes: notes || 'Sinistro rifiutato',
        },
      })

      // Notifica al buyer
      await prisma.notification.create({
        data: {
          userId: insurance.transaction.userAId,
          type: 'insurance_rejected',
          title: '❌ Sinistro rifiutato',
          message: `Il tuo sinistro è stato rifiutato. ${notes ? `Motivo: ${notes}` : ''}`,
          link: `/transactions/${insurance.transactionId}`,
        },
      })

      return NextResponse.json({
        success: true,
        decision: 'REJECTED',
        settledAmount: 0,
        message: 'Sinistro rifiutato.',
      })
    }

  } catch (error) {
    console.error('Errore risoluzione sinistro:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

