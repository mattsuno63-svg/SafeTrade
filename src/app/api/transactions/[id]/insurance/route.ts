import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// Calcolo fattore rischio basato su storia utenti e valore
async function calculateRiskFactor(
  transactionValue: number,
  buyerId: string,
  sellerId: string
): Promise<number> {
  let riskFactor = 1.0

  // Fattore 1: Valore transazione (più alto = più rischio)
  if (transactionValue > 500) riskFactor += 0.1
  if (transactionValue > 1000) riskFactor += 0.15
  if (transactionValue > 2000) riskFactor += 0.2
  if (transactionValue > 5000) riskFactor += 0.25

  // Fattore 2: Storia buyer (transazioni completate = meno rischio)
  const buyerStats = await prisma.safeTradeTransaction.count({
    where: {
      userAId: buyerId,
      status: 'COMPLETED',
    },
  })
  if (buyerStats >= 10) riskFactor -= 0.1
  else if (buyerStats >= 5) riskFactor -= 0.05
  else if (buyerStats === 0) riskFactor += 0.1

  // Fattore 3: Storia seller (transazioni completate = meno rischio)
  const sellerStats = await prisma.safeTradeTransaction.count({
    where: {
      userBId: sellerId,
      status: 'COMPLETED',
    },
  })
  if (sellerStats >= 20) riskFactor -= 0.15
  else if (sellerStats >= 10) riskFactor -= 0.1
  else if (sellerStats >= 5) riskFactor -= 0.05
  else if (sellerStats === 0) riskFactor += 0.15

  // Fattore 4: Dispute passate del seller (più dispute = più rischio)
  const sellerDisputes = await prisma.dispute.count({
    where: {
      transaction: {
        userBId: sellerId,
      },
      status: {
        in: ['RESOLVED_BUYER_WIN', 'RESOLVED_PARTIAL'],
      },
    },
  })
  if (sellerDisputes >= 3) riskFactor += 0.3
  else if (sellerDisputes >= 1) riskFactor += 0.1

  // Limita il fattore rischio tra 0.8 e 2.0
  return Math.max(0.8, Math.min(2.0, riskFactor))
}

// Calcolo premio assicurazione
function calculatePremium(
  insuredValue: number,
  baseRate: number,
  riskFactor: number
): number {
  const premium = insuredValue * (baseRate / 100) * riskFactor
  // Minimo €1, massimo 10% del valore
  return Math.max(1, Math.min(premium, insuredValue * 0.1))
}

// GET - Ottieni dettagli assicurazione per una transazione
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: transactionId } = await params

    // Verifica che l'utente sia parte della transazione o admin
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: { select: { id: true } },
        userB: { select: { id: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, role: true },
    })

    const isParty = dbUser?.id === transaction.userAId || dbUser?.id === transaction.userBId
    const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'MODERATOR'

    if (!isParty && !isAdmin) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Ottieni assicurazione
    const insurance = await prisma.packageInsurance.findUnique({
      where: { transactionId },
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            proposedPrice: true,
            userA: { select: { id: true, name: true } },
            userB: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!insurance) {
      return NextResponse.json({ 
        hasInsurance: false, 
        transaction: {
          id: transaction.id,
          value: transaction.proposedPrice,
        }
      })
    }

    return NextResponse.json({
      hasInsurance: true,
      insurance,
    })

  } catch (error) {
    console.error('Errore recupero assicurazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// POST - Crea assicurazione per una transazione
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

    const { id: transactionId } = await params
    const body = await request.json()
    const { coverageType = 'STANDARD' } = body

    // Verifica transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: { select: { id: true, email: true } },
        userB: { select: { id: true, email: true } },
        escrowPayment: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    // Solo il buyer (userA) può acquistare l'assicurazione
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (dbUser?.id !== transaction.userAId) {
      return NextResponse.json(
        { error: 'Solo il buyer può acquistare l\'assicurazione' },
        { status: 403 }
      )
    }

    // Verifica che non esista già un'assicurazione
    const existingInsurance = await prisma.packageInsurance.findUnique({
      where: { transactionId },
    })

    if (existingInsurance) {
      return NextResponse.json(
        { error: 'Assicurazione già esistente per questa transazione' },
        { status: 400 }
      )
    }

    // Verifica che la transazione sia in stato appropriato
    const allowedStatuses = ['PROPOSED', 'ACCEPTED', 'CONFIRMED']
    if (!allowedStatuses.includes(transaction.status)) {
      return NextResponse.json(
        { error: 'Non puoi assicurare una transazione già in corso o completata' },
        { status: 400 }
      )
    }

    const insuredValue = transaction.proposedPrice || 0

    if (insuredValue <= 0) {
      return NextResponse.json(
        { error: 'Valore transazione non valido per assicurazione' },
        { status: 400 }
      )
    }

    // Calcola fattore rischio
    const riskFactor = await calculateRiskFactor(
      insuredValue,
      transaction.userAId,
      transaction.userBId
    )

    // Base rate diverso per tipo copertura
    const baseRate = coverageType === 'PREMIUM' ? 3.0 : 2.0

    // Calcola premio
    const premiumAmount = calculatePremium(insuredValue, baseRate, riskFactor)

    // Crea assicurazione
    const insurance = await prisma.packageInsurance.create({
      data: {
        transactionId,
        insuredValue,
        premiumAmount,
        coverageType,
        baseRate,
        riskFactor,
        status: 'ACTIVE',
      },
    })

    // Crea notifica per il seller
    await prisma.notification.create({
      data: {
        userId: transaction.userBId,
        type: 'insurance_added',
        title: 'Assicurazione aggiunta',
        message: `Il buyer ha aggiunto un'assicurazione di €${insuredValue.toFixed(2)} alla transazione.`,
        link: `/transactions/${transactionId}`,
      },
    })

    return NextResponse.json({
      success: true,
      insurance: {
        id: insurance.id,
        insuredValue,
        premiumAmount,
        coverageType,
        baseRate,
        riskFactor,
        status: insurance.status,
      },
      message: `Assicurazione creata. Premio: €${premiumAmount.toFixed(2)}`,
    })

  } catch (error) {
    console.error('Errore creazione assicurazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

// DELETE - Cancella assicurazione (solo se transazione non ancora iniziata)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const { id: transactionId } = await params

    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      include: {
        userA: { select: { id: true } },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (dbUser?.id !== transaction.userAId) {
      return NextResponse.json(
        { error: 'Solo il buyer può cancellare l\'assicurazione' },
        { status: 403 }
      )
    }

    // Verifica stato transazione
    const allowedStatuses = ['PROPOSED', 'ACCEPTED']
    if (!allowedStatuses.includes(transaction.status)) {
      return NextResponse.json(
        { error: 'Non puoi cancellare l\'assicurazione dopo che la transazione è confermata' },
        { status: 400 }
      )
    }

    // Cancella assicurazione
    await prisma.packageInsurance.delete({
      where: { transactionId },
    })

    return NextResponse.json({
      success: true,
      message: 'Assicurazione cancellata',
    })

  } catch (error) {
    console.error('Errore cancellazione assicurazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

