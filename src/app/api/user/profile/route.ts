import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

/**
 * PATCH /api/user/profile
 * Aggiorna il profilo utente (city, province, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const schema = z.object({
      city: z.string().optional().nullable(),
      province: z.string().optional().nullable(),
    })

    const data = schema.parse(body)

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        city: data.city || undefined,
        province: data.province || undefined,
      },
      select: {
        id: true,
        city: true,
        province: true,
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user profile:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
