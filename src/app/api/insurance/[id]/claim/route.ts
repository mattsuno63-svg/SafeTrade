import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// POST - Apri sinistro
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
    const { claimAmount, claimReason, claimPhotos = [] } = body

    // Validazione
    if (!claimAmount || claimAmount <= 0) {
      return NextResponse.json(
        { error: 'Importo sinistro richiesto' },
        { status: 400 }
      )
    }

    if (!claimReason || claimReason.trim().length < 20) {
      return NextResponse.json(
        { error: 'Descrivi il motivo del sinistro (minimo 20 caratteri)' },
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
            status: true,
            userAId: true,
            userBId: true,
            packageStatus: true,
            packageDeliveredAt: true,
            userA: { select: { name: true, email: true } },
            userB: { select: { name: true } },
          },
        },
      },
    })

    if (!insurance) {
      return NextResponse.json({ error: 'Assicurazione non trovata' }, { status: 404 })
    }

    // Solo il buyer può aprire sinistro
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, name: true },
    })

    if (dbUser?.id !== insurance.transaction.userAId) {
      return NextResponse.json(
        { error: 'Solo il buyer può aprire un sinistro' },
        { status: 403 }
      )
    }

    // Verifica stato assicurazione
    if (insurance.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: `Impossibile aprire sinistro: assicurazione in stato ${insurance.status}` },
        { status: 400 }
      )
    }

    // Verifica che il pacco sia stato consegnato (o almeno spedito)
    const validPackageStatuses = ['SHIPPED', 'DELIVERED']
    if (!validPackageStatuses.includes(insurance.transaction.packageStatus || '')) {
      return NextResponse.json(
        { error: 'Puoi aprire un sinistro solo dopo che il pacco è stato spedito' },
        { status: 400 }
      )
    }

    // Verifica importo sinistro non superi valore assicurato
    if (claimAmount > insurance.insuredValue) {
      return NextResponse.json(
        { error: `Importo sinistro (€${claimAmount}) supera il valore assicurato (€${insurance.insuredValue})` },
        { status: 400 }
      )
    }

    // Aggiorna assicurazione con sinistro
    const updatedInsurance = await prisma.packageInsurance.update({
      where: { id: insuranceId },
      data: {
        status: 'CLAIMED',
        claimAmount,
        claimReason,
        claimPhotos,
        claimSubmittedAt: new Date(),
      },
    })

    // Crea notifica per admin
    await prisma.adminNotification.create({
      data: {
        type: 'INSURANCE_CLAIM',
        title: '🔔 Nuovo sinistro assicurazione',
        message: `Sinistro di €${claimAmount.toFixed(2)} aperto per la transazione #${insurance.transactionId.slice(0, 8)}`,
        referenceType: 'INSURANCE',
        referenceId: insuranceId,
        targetRoles: ['ADMIN', 'MODERATOR'],
        priority: 'HIGH',
      },
    })

    // Crea notifica per il seller
    await prisma.notification.create({
      data: {
        userId: insurance.transaction.userBId,
        type: 'insurance_claim',
        title: '⚠️ Sinistro aperto',
        message: `Il buyer ha aperto un sinistro di €${claimAmount.toFixed(2)} per la transazione.`,
        link: `/transactions/${insurance.transactionId}`,
      },
    })

    return NextResponse.json({
      success: true,
      insurance: updatedInsurance,
      message: 'Sinistro aperto con successo. L\'admin esaminerà la richiesta.',
    })

  } catch (error) {
    console.error('Errore apertura sinistro:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// PATCH - Aggiorna sinistro (aggiungi documenti)
export async function PATCH(
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
    const { additionalPhotos, additionalNotes } = body

    const insurance = await prisma.packageInsurance.findUnique({
      where: { id: insuranceId },
      include: {
        transaction: {
          select: { userAId: true },
        },
      },
    })

    if (!insurance) {
      return NextResponse.json({ error: 'Assicurazione non trovata' }, { status: 404 })
    }

    // Solo il buyer può aggiornare il sinistro
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (dbUser?.id !== insurance.transaction.userAId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Solo se in stato CLAIMED
    if (insurance.status !== 'CLAIMED') {
      return NextResponse.json(
        { error: 'Puoi aggiornare il sinistro solo quando è in attesa di valutazione' },
        { status: 400 }
      )
    }

    // Prepara aggiornamenti
    const updates: Record<string, unknown> = {}

    if (additionalPhotos && Array.isArray(additionalPhotos)) {
      updates.claimPhotos = [...(insurance.claimPhotos || []), ...additionalPhotos]
    }

    if (additionalNotes) {
      updates.claimReason = `${insurance.claimReason}\n\n--- Aggiornamento ---\n${additionalNotes}`
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nessun aggiornamento fornito' }, { status: 400 })
    }

    const updatedInsurance = await prisma.packageInsurance.update({
      where: { id: insuranceId },
      data: updates,
    })

    return NextResponse.json({
      success: true,
      insurance: updatedInsurance,
      message: 'Sinistro aggiornato',
    })

  } catch (error) {
    console.error('Errore aggiornamento sinistro:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

