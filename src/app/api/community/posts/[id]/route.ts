
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-error'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        role: true,
                        badges: {
                            include: {
                                badge: true
                            }
                        }
                    }
                },
                topic: true,
                comments: {
                    include: {
                        author: {
                            select: {
                                name: true,
                                email: true,
                                avatar: true,
                                role: true,
                                badges: { include: { badge: true } }
                            }
                        }
                    },
                    orderBy: { createdAt: 'asc' }
                }
            }
        })

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        // Increment views async (fire and forget)
        prisma.post.update({
            where: { id: post.id },
            data: { views: { increment: 1 } }
        }).catch(console.error)

        return NextResponse.json(post)
    } catch (error) {
        console.error('Error fetching post:', error)
        return handleApiError(error, 'community-posts-id')
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    // POST creates a comment on this post
    try {
        const user = await requireAuth()
        const { id } = await params
        const body = await req.json()
        const { content } = body

        if (!content) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 })
        }

        // Verify post exists
        const post = await prisma.post.findUnique({
            where: { id },
            select: { id: true }
        })

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 })
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId: id,
                authorId: user.id
            },
            include: {
                author: {
                    select: {
                        name: true,
                        avatar: true,
                        badges: { include: { badge: true } }
                    }
                }
            }
        })

        return NextResponse.json(comment)
    } catch (error) {
        console.error('Error creating comment:', error)
        if (error instanceof Error && (error.message?.includes('Unauthorized') || error.message?.includes('authentication'))) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        return handleApiError(error, 'community-posts-id')
    }
}
