import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { InsuranceStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - Lista assicurazioni (Admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    // Verifica admin
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, role: true },
    })

    if (!dbUser || !['ADMIN', 'MODERATOR'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as InsuranceStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Costruisci filtro
    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    // Query assicurazioni
    const [insurances, total] = await Promise.all([
      prisma.packageInsurance.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              status: true,
              packageStatus: true,
              userA: { select: { id: true, name: true, email: true } },
              userB: { select: { id: true, name: true, email: true } },
              proposal: {
                select: {
                  offerPrice: true,
                },
              },
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // CLAIMED prima
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.packageInsurance.count({ where }),
    ])

    // Statistiche
    const [
      totalActive,
      totalClaimed,
      totalSettled,
      totalPremiums,
      totalPayouts,
    ] = await Promise.all([
      prisma.packageInsurance.count({ where: { status: 'ACTIVE' } }),
      prisma.packageInsurance.count({ where: { status: 'CLAIMED' } }),
      prisma.packageInsurance.count({ where: { status: 'SETTLED' } }),
      prisma.packageInsurance.aggregate({
        _sum: { premiumAmount: true },
      }),
      prisma.packageInsurance.aggregate({
        where: { status: 'SETTLED', claimSettledAmount: { gt: 0 } },
        _sum: { claimSettledAmount: true },
      }),
    ])

    return NextResponse.json({
      insurances,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        active: totalActive,
        claimed: totalClaimed,
        settled: totalSettled,
        totalPremiums: totalPremiums._sum.premiumAmount || 0,
        totalPayouts: totalPayouts._sum.claimSettledAmount || 0,
        netProfit: (totalPremiums._sum.premiumAmount || 0) - (totalPayouts._sum.claimSettledAmount || 0),
      },
    })

  } catch (error) {
    console.error('Errore lista assicurazioni:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

