
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/community/recent
export async function GET() {
    const posts = await prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
            topic: true,
            author: {
                select: {
                    name: true,
                    avatar: true,
                    role: true,
                    badges: {
                        include: { badge: true }
                    }
                }
            }
        }
    })
    return NextResponse.json(posts)
}

