import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, getSession } from '@/lib/auth'

// Spam keywords to check
const SPAM_KEYWORDS = [
  'compra qui', 'visita il mio sito', 'clicca qui', 'click here',
  'dm me', 'whatsapp', 'telegram @', 'buy now', 'free money',
  'guadagna subito', 'bitcoin', 'crypto', 'nft', 'investment opportunity'
]

// Whitelisted domains for links
const WHITELISTED_DOMAINS = [
  'pokemon.com', 'tcgplayer.com', 'cardmarket.com', 'youtube.com',
  'twitter.com', 'instagram.com', 'safetrade.it'
]

// Calculate spam score (0-1)
function calculateSpamScore(title: string, content: string): number {
  const text = `${title} ${content}`.toLowerCase()
  let score = 0

  // Check for spam keywords
  for (const keyword of SPAM_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 0.2
    }
  }

  // Check for excessive caps
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length
  if (capsRatio > 0.5) score += 0.2

  // Check for non-whitelisted links
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = text.match(urlRegex) || []
  for (const url of urls) {
    const isWhitelisted = WHITELISTED_DOMAINS.some(domain => url.includes(domain))
    if (!isWhitelisted) score += 0.15
  }

  // Check for repeated characters
  if (/(.)\1{4,}/.test(text)) score += 0.1

  return Math.min(score, 1)
}

// GET /api/community - List all topics with post counts
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    const userId = session?.user?.id

    // Check if user has premium for premium topics
    let canSeePremium = false
    let userTier = 'FREE'
    
    if (userId) {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId },
        include: { plan: true },
      })
      
      if (subscription && subscription.status === 'ACTIVE' &&
          (!subscription.endDate || subscription.endDate > new Date())) {
        canSeePremium = subscription.plan.premiumCommunity
        userTier = subscription.plan.tier
      }
    }

    // Build where clause for topics
    const where: any = {}
    if (!canSeePremium) {
      where.isPremiumOnly = false
    }

    const topics = await prisma.topic.findMany({
      where,
      include: {
        _count: {
          select: { posts: true }
        }
      },
      orderBy: { name: 'asc' }
    })

    // Add locked flag for premium topics user can't access
    const topicsWithAccess = topics.map(topic => ({
      ...topic,
      isLocked: topic.isPremiumOnly && !canSeePremium,
      requiredTier: topic.requiredTier,
    }))

    return NextResponse.json(topicsWithAccess)
  } catch (error) {
    console.error('Error fetching topics:', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}

// POST /api/community - Create a new post with auto-moderation
export async function POST(req: Request) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { title, content, topicId } = body

    if (!title || !content || !topicId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get or create user karma
    let userKarma = await prisma.userKarma.findUnique({
      where: { userId: user.id },
    })

    if (!userKarma) {
      userKarma = await prisma.userKarma.create({
        data: {
          userId: user.id,
          karma: 0,
          level: 'NEW',
        },
      })
    }

    // Check if user is banned
    if (userKarma.level === 'BANNED') {
      return NextResponse.json({ 
        error: 'Il tuo account è stato sospeso dalla community',
        banned: true 
      }, { status: 403 })
    }

    // Check rate limiting
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastReset = new Date(userKarma.lastResetDate)
    lastReset.setHours(0, 0, 0, 0)

    // Reset daily count if new day
    if (lastReset < today) {
      await prisma.userKarma.update({
        where: { userId: user.id },
        data: {
          postsToday: 0,
          lastResetDate: new Date(),
        },
      })
      userKarma.postsToday = 0
    }

    // Check daily post limit
    const maxPostsPerDay = userKarma.level === 'NEW' ? 5 : 20
    if (userKarma.postsToday >= maxPostsPerDay) {
      return NextResponse.json({ 
        error: `Hai raggiunto il limite di ${maxPostsPerDay} post giornalieri`,
        rateLimited: true 
      }, { status: 429 })
    }

    // Check cooldown (2 min between posts)
    if (userKarma.lastPostAt) {
      const cooldownMs = userKarma.level === 'NEW' ? 5 * 60 * 1000 : 2 * 60 * 1000 // 5 min for new, 2 min for others
      const timeSinceLastPost = Date.now() - userKarma.lastPostAt.getTime()
      if (timeSinceLastPost < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastPost) / 1000)
        return NextResponse.json({ 
          error: `Attendi ${waitSeconds} secondi prima di postare di nuovo`,
          cooldown: waitSeconds 
        }, { status: 429 })
      }
    }

    // Check topic access
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    })

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Check if topic is premium-only
    if (topic.isPremiumOnly) {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId: user.id },
        include: { plan: true },
      })

      const hasPremiumAccess = subscription && 
        subscription.status === 'ACTIVE' &&
        (!subscription.endDate || subscription.endDate > new Date()) &&
        subscription.plan.premiumCommunity

      if (!hasPremiumAccess) {
        return NextResponse.json({ 
          error: 'Questo topic è riservato ai membri Premium',
          premiumRequired: true 
        }, { status: 403 })
      }

      // Check tier requirement
      if (topic.requiredTier === 'PRO' && subscription?.plan.tier !== 'PRO') {
        return NextResponse.json({ 
          error: 'Questo topic è riservato ai membri PRO',
          tierRequired: 'PRO' 
        }, { status: 403 })
      }
    }

    // Calculate spam score
    const spamScore = calculateSpamScore(title, content)

    // Determine if auto-approval
    const isAutoApproved = userKarma.karma >= 50 && spamScore < 0.3

    // Flag if high spam score
    const isFlagged = spamScore >= 0.5

    // Create post
    const post = await prisma.post.create({
      data: {
        title,
        content,
        topicId,
        authorId: user.id,
        spamScore,
        isAutoApproved,
        isFlagged,
        flagReason: isFlagged ? 'Automatic spam detection' : null,
      },
      include: {
        author: {
          select: {
            name: true,
            avatar: true,
            badges: { include: { badge: true } }
          }
        },
        topic: true,
      }
    })

    // Update user karma stats
    await prisma.userKarma.update({
      where: { userId: user.id },
      data: {
        postsCount: { increment: 1 },
        postsToday: { increment: 1 },
        lastPostAt: new Date(),
        // Award karma for posting (if not flagged)
        karma: !isFlagged ? { increment: 2 } : undefined,
      },
    })

    // Return with status info
    return NextResponse.json({
      ...post,
      status: isFlagged ? 'flagged' : (isAutoApproved ? 'approved' : 'pending'),
      message: isFlagged 
        ? 'Il tuo post è stato segnalato per revisione'
        : (isAutoApproved 
            ? 'Post pubblicato!' 
            : 'Post inviato per approvazione'),
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

