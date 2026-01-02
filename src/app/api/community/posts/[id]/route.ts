
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const post = await prisma.post.findUnique({
        where: { id: params.id },
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

    // Increment views async (fire and forget)
    if (post) {
        prisma.post.update({
            where: { id: post.id },
            data: { views: { increment: 1 } }
        }).catch(console.error)
    }

    return NextResponse.json(post)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    // POST creates a comment on this post
    try {
        const user = await requireAuth()
        const body = await req.json()
        const { content } = body

        if (!content) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 })
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                postId: params.id,
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}
