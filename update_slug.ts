
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const shop = await prisma.shop.findFirst()
    if (shop) {
        console.log(`Updating shop ${shop.name} (${shop.id}) to slug 'admin-shop'`)
        await prisma.shop.update({
            where: { id: shop.id },
            data: { slug: 'admin-shop' }
        })
        console.log('Update successful')
    } else {
        console.log('No shop found to update')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
