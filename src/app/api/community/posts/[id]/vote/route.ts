import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/community/posts/[id]/vote
// Vote on a post (upvote = 1, downvote = -1, remove = 0)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: postId } = resolvedParams
    const body = await request.json()
    const { vote } = body // 1 for upvote, -1 for downvote, 0 to remove

    if (vote !== 1 && vote !== -1 && vote !== 0) {
      return NextResponse.json(
        { error: 'Invalid vote value. Must be 1, -1, or 0' },
        { status: 400 }
      )
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, upvotes: true, downvotes: true, authorId: true },
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Check existing vote
    const existingVote = await prisma.postVote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    })

    let voteChange = 0
    let upvoteChange = 0
    let downvoteChange = 0

    if (existingVote) {
      // User already voted
      if (existingVote.vote === vote) {
        // Same vote, remove it
        await prisma.postVote.delete({
          where: { id: existingVote.id },
        })
        if (vote === 1) {
          upvoteChange = -1
          voteChange = -1
        } else if (vote === -1) {
          downvoteChange = -1
          voteChange = 1 // Removing downvote increases score
        }
      } else {
        // Different vote, update it
        await prisma.postVote.update({
          where: { id: existingVote.id },
          data: { vote },
        })
        if (existingVote.vote === 1) {
          // Was upvote, now downvote or remove
          upvoteChange = -1
          voteChange = vote === -1 ? -2 : -1
        } else if (existingVote.vote === -1) {
          // Was downvote, now upvote or remove
          downvoteChange = -1
          voteChange = vote === 1 ? 2 : 1
        }
        if (vote === 1) upvoteChange = 1
        if (vote === -1) downvoteChange = 1
      }
    } else if (vote !== 0) {
      // New vote
      await prisma.postVote.create({
        data: {
          postId,
          userId: user.id,
          vote,
        },
      })
      if (vote === 1) {
        upvoteChange = 1
        voteChange = 1
      } else if (vote === -1) {
        downvoteChange = 1
        voteChange = -1
      }
    }

    // Update post vote counts
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        upvotes: { increment: upvoteChange },
        downvotes: { increment: downvoteChange },
      },
      select: {
        id: true,
        upvotes: true,
        downvotes: true,
      },
    })

    // Update author karma if vote changed
    if (voteChange !== 0 && post.authorId !== user.id) {
      await prisma.userKarma.updateMany({
        where: { userId: post.authorId },
        data: {
          karma: { increment: voteChange },
          upvotesReceived: voteChange > 0 ? { increment: 1 } : undefined,
        },
      })
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      userVote: vote === 0 ? null : vote,
    })
  } catch (error: any) {
    console.error('Error voting on post:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET /api/community/posts/[id]/vote
// Get user's vote on a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id: postId } = resolvedParams

    const vote = await prisma.postVote.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    })

    return NextResponse.json({
      vote: vote?.vote || null,
    })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

