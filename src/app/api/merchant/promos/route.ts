import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const promotionSchema = z.object({
    title: z.string().min(1, 'Il titolo è obbligatorio'),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().positive('Il valore dello sconto deve essere positivo'),
    startDate: z.string(),
    endDate: z.string(),
    appliesTo: z.array(z.string()).min(1, 'Specifica a cosa si applica'),
    targetIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth()

        // Fetch shop checking merchantId
        const shop = await prisma.shop.findUnique({
            where: { merchantId: user.id },
        })

        if (!shop) {
            return new NextResponse('Shop not found', { status: 404 })
        }

        const promotions = await prisma.promotion.findMany({
            where: {
                shopId: shop.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json(promotions)
    } catch (error: any) {
        console.error('[PROMOTIONS_GET]', error)
        if (error.message === 'Unauthorized') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth()

        const shop = await prisma.shop.findUnique({
            where: { merchantId: user.id },
        })

        if (!shop) {
            return new NextResponse('Shop not found', { status: 404 })
        }

        const body = await req.json()
        const validatedData = promotionSchema.parse(body)

        const promotion = await prisma.promotion.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                discountType: validatedData.discountType,
                discountValue: validatedData.discountValue,
                startDate: new Date(validatedData.startDate),
                endDate: new Date(validatedData.endDate),
                appliesTo: validatedData.appliesTo,
                targetIds: validatedData.targetIds,
                shopId: shop.id,
            },
        })

        return NextResponse.json(promotion)
    } catch (error: any) {
        console.error('[PROMOTIONS_POST]', error)
        if (error.message === 'Unauthorized') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid data', { status: 400 })
        }
        return new NextResponse('Internal Error', { status: 500 })
    }
}
