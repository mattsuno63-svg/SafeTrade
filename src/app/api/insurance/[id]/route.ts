import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

// GET - Ottieni dettagli assicurazione
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

    const { id: insuranceId } = await params

    const insurance = await prisma.packageInsurance.findUnique({
      where: { id: insuranceId },
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            proposedPrice: true,
            userAId: true,
            userBId: true,
            userA: { select: { id: true, name: true, email: true } },
            userB: { select: { id: true, name: true, email: true } },
            packageStatus: true,
            packageReceivedAt: true,
            packageVerifiedAt: true,
            packageShippedAt: true,
            packageDeliveredAt: true,
          },
        },
      },
    })

    if (!insurance) {
      return NextResponse.json({ error: 'Assicurazione non trovata' }, { status: 404 })
    }

    // Verifica autorizzazione
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { id: true, role: true },
    })

    const isParty = dbUser?.id === insurance.transaction.userAId || 
                    dbUser?.id === insurance.transaction.userBId
    const isAdmin = dbUser?.role === 'ADMIN' || dbUser?.role === 'MODERATOR'

    if (!isParty && !isAdmin) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    return NextResponse.json({ insurance })

  } catch (error) {
    console.error('Errore recupero assicurazione:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

