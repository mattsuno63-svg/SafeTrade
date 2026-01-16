import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/community/posts - Get posts with filters (hot, new, top, rising)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topicSlug = searchParams.get('topic')
    const sort = searchParams.get('sort') || 'hot' // hot, new, top, rising
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (topicSlug) {
      where.topic = { slug: topicSlug }
    }

    // Only show approved posts
    where.isFlagged = false

    let orderBy: any = {}
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    switch (sort) {
      case 'hot':
        // Hot: Score based on upvotes, downvotes, and time decay
        // Using a simple formula: (upvotes - downvotes) / (hours since creation + 2)
        orderBy = { createdAt: 'desc' }
        break
      case 'new':
        orderBy = { createdAt: 'desc' }
        break
      case 'top':
        // Top: Highest score (upvotes - downvotes)
        orderBy = [
          { upvotes: 'desc' },
          { createdAt: 'desc' },
        ]
        break
      case 'rising':
        // Rising: Posts with recent activity (comments or votes in last 24h)
        orderBy = { createdAt: 'desc' }
        where.createdAt = { gte: oneDayAgo }
        break
      default:
        orderBy = { createdAt: 'desc' }
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        topic: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
            badges: {
              include: { badge: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    })

    // Ensure upvotes and downvotes are numbers
    const postsWithVotes = posts.map(post => ({
      ...post,
      upvotes: post.upvotes || 0,
      downvotes: post.downvotes || 0,
    }))

    // Calculate hot score for hot sort
    if (sort === 'hot') {
      postsWithVotes.sort((a, b) => {
        const scoreA = a.upvotes - a.downvotes
        const scoreB = b.upvotes - b.downvotes
        const hoursA = (now.getTime() - new Date(a.createdAt).getTime()) / (1000 * 60 * 60)
        const hoursB = (now.getTime() - new Date(b.createdAt).getTime()) / (1000 * 60 * 60)
        const hotScoreA = scoreA / (hoursA + 2)
        const hotScoreB = scoreB / (hoursB + 2)
        return hotScoreB - hotScoreA
      })
    }

    return NextResponse.json(postsWithVotes)
  } catch (error: any) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

