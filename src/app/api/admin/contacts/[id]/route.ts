import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'
import { ContactStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID_STATUSES: ContactStatus[] = ['PENDING', 'READ', 'REPLIED', 'CLOSED']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const status = body.status as string | undefined

    if (!status || !VALID_STATUSES.includes(status as ContactStatus)) {
      return NextResponse.json(
        { error: 'Invalid status. Use PENDING, READ, REPLIED, or CLOSED' },
        { status: 400 }
      )
    }

    const existing = await prisma.contactMessage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.contactMessage.update({
      where: { id },
      data: { status: status as ContactStatus },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, 'AdminContactsPatch')
  }
}
