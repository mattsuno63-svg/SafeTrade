import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const promotionUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
    discountValue: z.number().positive().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
    appliesTo: z.array(z.string()).min(1).optional(),
    targetIds: z.array(z.string()).optional(),
})

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth()

        const shop = await prisma.shop.findUnique({
            where: { merchantId: user.id },
        })

        if (!shop) {
            return new NextResponse('Shop not found', { status: 404 })
        }

        const body = await req.json()
        const validatedData = promotionUpdateSchema.parse(body)

        // Verify ownership
        const existingPromotion = await prisma.promotion.findUnique({
            where: { id: params.id },
        })

        if (!existingPromotion || existingPromotion.shopId !== shop.id) {
            return new NextResponse('Promotion not found', { status: 404 })
        }

        const promotion = await prisma.promotion.update({
            where: { id: params.id },
            data: {
                ...validatedData,
                startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
                endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined,
            },
        })

        return NextResponse.json(promotion)
    } catch (error: any) {
        console.error('[PROMOTION_PATCH]', error)
        if (error.message === 'Unauthorized') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        if (error instanceof z.ZodError) {
            return new NextResponse('Invalid data', { status: 400 })
        }
        return new NextResponse('Internal Error', { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth()

        const shop = await prisma.shop.findUnique({
            where: { merchantId: user.id },
        })

        if (!shop) {
            return new NextResponse('Shop not found', { status: 404 })
        }

        // Verify ownership
        const existingPromotion = await prisma.promotion.findUnique({
            where: { id: params.id },
        })

        if (!existingPromotion || existingPromotion.shopId !== shop.id) {
            return new NextResponse('Promotion not found', { status: 404 })
        }

        await prisma.promotion.delete({
            where: { id: params.id },
        })

        return new NextResponse(null, { status: 204 })
    } catch (error: any) {
        console.error('[PROMOTION_DELETE]', error)
        if (error.message === 'Unauthorized') {
            return new NextResponse('Unauthorized', { status: 401 })
        }
        return new NextResponse('Internal Error', { status: 500 })
    }
}
