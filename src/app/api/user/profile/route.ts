import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            proposalsSent: true,
            proposalsReceived: true,
          },
        },
      },
    })

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(dbUser)
  } catch (error: any) {
    console.error('Error fetching profile:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, avatar } = body
    
    console.log('[API /user/profile PATCH] Received:', { name, avatar })

    // Update Supabase auth user metadata
    const supabase = await createClient()
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        name,
        avatar_url: avatar,
      },
    })

    if (authError) {
      console.error('Error updating auth user:', authError)
    }

    // Update Prisma user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        avatar,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Error updating profile:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

