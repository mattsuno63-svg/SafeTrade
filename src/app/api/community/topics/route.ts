import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/community/topics - Create a new subreddit/topic
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { name, description, icon, rules, isNSFW, isPremiumOnly, requiredTier } = body

    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Il nome del subreddit deve essere di almeno 3 caratteri' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Check if slug already exists
    const existing = await prisma.topic.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un subreddit con questo nome esiste già' },
        { status: 400 }
      )
    }

    // Create topic/subreddit
    const topic = await prisma.topic.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        icon: icon || 'tag',
        rules: rules?.trim() || null,
        isNSFW: isNSFW || false,
        isPremiumOnly: isPremiumOnly || false,
        requiredTier: requiredTier || null,
        creatorId: user.id,
        memberCount: 1, // Creator is first member
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    })

    return NextResponse.json(topic, { status: 201 })
  } catch (error: any) {
    console.error('Error creating topic:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

