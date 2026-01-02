
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const shops = await prisma.shop.findMany({
        select: { name: true, slug: true, merchantId: true }
    })
    console.log('Shops:', JSON.stringify(shops, null, 2))

    // Check if admin-shop exists
    const adminShop = shops.find(s => s.slug === 'admin-shop')
    if (!adminShop && shops.length > 0) {
        // Update the first shop to have this slug for testing if requested
        console.log('Updating first shop to have slug admin-shop for testing...')
        await prisma.shop.update({
            where: { id: shops[0].merchantId }, // Wait, update via unique input. Shop has id, but update usually needs unique.
            // finding by ID or merchantId.
            // Let's iterate and find the ID first.
        })
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
