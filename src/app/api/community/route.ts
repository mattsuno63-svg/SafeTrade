
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// GET /api/community/topics - List all topics
export async function GET() {
    const topics = await prisma.topic.findMany({
        include: {
            _count: {
                select: { posts: true }
            }
        }
    })
    return NextResponse.json(topics)
}

// POST /api/community/posts - Create a new post
export async function POST(req: Request) {
    try {
        const user = await requireAuth()
        const body = await req.json()
        const { title, content, topicId } = body

        if (!title || !content || !topicId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        const post = await prisma.post.create({
            data: {
                title,
                content,
                topicId,
                authorId: user.id
            }
        })

        return NextResponse.json(post)
    } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
}
