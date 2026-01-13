import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// Calcolo fattore rischio basato su storia utenti e valore
async function calculateRiskFactor(
  transactionValue: number,
  buyerId: string,
  sellerId: string
): Promise<{ riskFactor: number; factors: Record<string, number> }> {
  let riskFactor = 1.0
  const factors: Record<string, number> = {}

  // Fattore 1: Valore transazione (più alto = più rischio)
  let valueFactor = 0
  if (transactionValue > 500) valueFactor += 0.1
  if (transactionValue > 1000) valueFactor += 0.15
  if (transactionValue > 2000) valueFactor += 0.2
  if (transactionValue > 5000) valueFactor += 0.25
  factors['valore_transazione'] = valueFactor
  riskFactor += valueFactor

  // Fattore 2: Storia buyer
  const buyerStats = await prisma.safeTradeTransaction.count({
    where: {
      userAId: buyerId,
      status: 'COMPLETED',
    },
  })
  let buyerFactor = 0
  if (buyerStats >= 10) buyerFactor = -0.1
  else if (buyerStats >= 5) buyerFactor = -0.05
  else if (buyerStats === 0) buyerFactor = 0.1
  factors['storia_buyer'] = buyerFactor
  riskFactor += buyerFactor

  // Fattore 3: Storia seller
  const sellerStats = await prisma.safeTradeTransaction.count({
    where: {
      userBId: sellerId,
      status: 'COMPLETED',
    },
  })
  let sellerFactor = 0
  if (sellerStats >= 20) sellerFactor = -0.15
  else if (sellerStats >= 10) sellerFactor = -0.1
  else if (sellerStats >= 5) sellerFactor = -0.05
  else if (sellerStats === 0) sellerFactor = 0.15
  factors['storia_seller'] = sellerFactor
  riskFactor += sellerFactor

  // Fattore 4: Dispute passate del seller (risolte)
  const sellerDisputes = await prisma.dispute.count({
    where: {
      transaction: {
        userBId: sellerId,
      },
      status: 'RESOLVED',
    },
  })
  let disputeFactor = 0
  if (sellerDisputes >= 3) disputeFactor = 0.3
  else if (sellerDisputes >= 1) disputeFactor = 0.1
  factors['dispute_seller'] = disputeFactor
  riskFactor += disputeFactor

  // Limita il fattore rischio
  const finalFactor = Math.max(0.8, Math.min(2.0, riskFactor))

  return { riskFactor: finalFactor, factors }
}

// GET - Calcola preview premio assicurazione
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
    const { searchParams } = new URL(request.url)
    const coverageType = searchParams.get('coverageType') || 'STANDARD'

    // Verifica transazione
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        userAId: true,
        userBId: true,
        status: true,
        proposal: {
          select: {
            offerPrice: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transazione non trovata' }, { status: 404 })
    }

    // Verifica che l'utente sia parte della transazione
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true },
    })

    if (dbUser?.id !== transaction.userAId && dbUser?.id !== transaction.userBId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Verifica se esiste già un'assicurazione
    const existingInsurance = await prisma.packageInsurance.findUnique({
      where: { transactionId },
    })

    if (existingInsurance) {
      return NextResponse.json({
        alreadyInsured: true,
        insurance: existingInsurance,
      })
    }

    const insuredValue = transaction.proposal?.offerPrice || 0

    if (insuredValue <= 0) {
      return NextResponse.json(
        { error: 'Valore transazione non valido' },
        { status: 400 }
      )
    }

    // Calcola fattore rischio con dettagli
    const { riskFactor, factors } = await calculateRiskFactor(
      insuredValue,
      transaction.userAId,
      transaction.userBId
    )

    // Base rate
    const baseRate = coverageType === 'PREMIUM' ? 3.0 : 2.0

    // Calcola premio
    const rawPremium = insuredValue * (baseRate / 100) * riskFactor
    const premiumAmount = Math.max(1, Math.min(rawPremium, insuredValue * 0.1))

    // Benefici per tipo copertura
    const benefits = coverageType === 'PREMIUM' ? {
      maxCoverage: '100% del valore',
      responseTime: '24h',
      photoVerification: true,
      prioritySupport: true,
      damageProtection: 'Completa',
      lossProtection: 'Completa',
    } : {
      maxCoverage: '80% del valore',
      responseTime: '48h',
      photoVerification: true,
      prioritySupport: false,
      damageProtection: 'Parziale',
      lossProtection: 'Completa',
    }

    return NextResponse.json({
      alreadyInsured: false,
      calculation: {
        insuredValue,
        baseRate,
        riskFactor: Math.round(riskFactor * 100) / 100,
        premiumAmount: Math.round(premiumAmount * 100) / 100,
        coverageType,
      },
      riskFactors: factors,
      benefits,
      recommendations: riskFactor > 1.3 ? [
        'Rischio elevato - assicurazione consigliata',
        'Il seller ha poche transazioni completate',
      ] : riskFactor < 1.0 ? [
        'Rischio basso - buona storia di transazioni',
        'Assicurazione opzionale',
      ] : [
        'Rischio medio',
        'Assicurazione raccomandata per importi elevati',
      ],
    })

  } catch (error) {
    console.error('Errore calcolo premio:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

