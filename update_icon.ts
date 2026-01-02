
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('Updating Pokemon topic icon...')
    // Change catching_pokemon to something standard like 'bolt' or 'sports_esports' to avoid font issues
    await prisma.topic.update({
        where: { slug: 'pokemon' },
        data: { icon: 'bolt' }
    })
    console.log('Icon updated to "bolt".')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
