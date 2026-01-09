import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, getSession } from '@/lib/auth'
import { KarmaLevel } from '@prisma/client'

// Karma thresholds
const KARMA_THRESHOLDS = {
  BANNED: -1,
  NEW: 0,
  TRUSTED: 50,
  ELITE: 200,
  LEGEND: 500,
}

// Get karma level based on karma points
function getKarmaLevel(karma: number): KarmaLevel {
  if (karma < 0) return 'BANNED'
  if (karma < KARMA_THRESHOLDS.TRUSTED) return 'NEW'
  if (karma < KARMA_THRESHOLDS.ELITE) return 'TRUSTED'
  if (karma < KARMA_THRESHOLDS.LEGEND) return 'ELITE'
  return 'LEGEND'
}

// GET /api/karma - Get current user's karma
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const userId = request.nextUrl.searchParams.get('userId') || session?.user?.id
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    let karma = await prisma.userKarma.findUnique({
      where: { userId },
    })

    // If no karma record, create one
    if (!karma) {
      karma = await prisma.userKarma.create({
        data: {
          userId,
          karma: 0,
          level: 'NEW',
        },
      })
    }

    // Check if daily reset needed
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastReset = new Date(karma.lastResetDate)
    lastReset.setHours(0, 0, 0, 0)

    if (lastReset < today) {
      karma = await prisma.userKarma.update({
        where: { userId },
        data: {
          postsToday: 0,
          lastResetDate: new Date(),
        },
      })
    }

    return NextResponse.json({
      karma: karma.karma,
      level: karma.level,
      postsCount: karma.postsCount,
      commentsCount: karma.commentsCount,
      upvotesReceived: karma.upvotesReceived,
      canPost: karma.level !== 'BANNED',
      needsApproval: karma.level === 'NEW',
      postsToday: karma.postsToday,
      maxPostsPerDay: karma.level === 'NEW' ? 5 : 20,
    })
  } catch (error: any) {
    console.error('Error fetching karma:', error)
    return NextResponse.json({ error: 'Failed to fetch karma' }, { status: 500 })
  }
}

// POST /api/karma - Update karma (upvote/downvote)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { targetUserId, action, postId, amount = 1 } = body

    if (!targetUserId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Can't vote on yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot vote on yourself' }, { status: 400 })
    }

    // Get voter's karma to check if they can vote
    const voterKarma = await prisma.userKarma.findUnique({
      where: { userId: user.id },
    })

    if (voterKarma && voterKarma.level === 'BANNED') {
      return NextResponse.json({ error: 'You are banned from voting' }, { status: 403 })
    }

    // Get or create target user's karma
    let targetKarma = await prisma.userKarma.findUnique({
      where: { userId: targetUserId },
    })

    if (!targetKarma) {
      targetKarma = await prisma.userKarma.create({
        data: {
          userId: targetUserId,
          karma: 0,
          level: 'NEW',
        },
      })
    }

    // Calculate karma change
    let karmaChange = 0
    switch (action) {
      case 'upvote':
        karmaChange = amount
        break
      case 'downvote':
        karmaChange = -amount
        break
      case 'flag':
        karmaChange = -10
        break
      case 'award':
        karmaChange = amount * 5 // Bonus karma
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update target user's karma
    const newKarma = targetKarma.karma + karmaChange
    const newLevel = getKarmaLevel(newKarma)

    await prisma.userKarma.update({
      where: { userId: targetUserId },
      data: {
        karma: newKarma,
        level: newLevel,
        upvotesReceived: action === 'upvote' ? { increment: 1 } : undefined,
        flagsReceived: action === 'flag' ? { increment: 1 } : undefined,
      },
    })

    // Update voter's karma (small reward for participating)
    if (voterKarma) {
      await prisma.userKarma.update({
        where: { userId: user.id },
        data: {
          upvotesGiven: action === 'upvote' ? { increment: 1 } : undefined,
        },
      })
    }

    // If upvoting/downvoting a post, update post karma
    if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          upvotes: action === 'upvote' ? { increment: 1 } : undefined,
          downvotes: action === 'downvote' ? { increment: 1 } : undefined,
          karmaChange: { increment: karmaChange },
        },
      })
    }

    // Award badges based on new karma level
    await awardKarmaBadges(targetUserId, newKarma, newLevel)

    return NextResponse.json({
      success: true,
      newKarma,
      newLevel,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating karma:', error)
    return NextResponse.json({ error: 'Failed to update karma' }, { status: 500 })
  }
}

// Award badges based on karma milestones
async function awardKarmaBadges(userId: string, karma: number, level: KarmaLevel) {
  try {
    const badgesToAward: string[] = []

    if (karma >= 100) badgesToAward.push('Trusted Member')
    if (karma >= 500) badgesToAward.push('Community Leader')

    for (const badgeName of badgesToAward) {
      const badge = await prisma.badge.findFirst({ where: { name: badgeName } })
      if (badge) {
        await prisma.userBadge.upsert({
          where: {
            userId_badgeId: { userId, badgeId: badge.id },
          },
          update: {},
          create: {
            userId,
            badgeId: badge.id,
          },
        })
      }
    }
  } catch (error) {
    console.error('Error awarding karma badges:', error)
  }
}

