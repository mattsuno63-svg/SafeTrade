
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const topics = [
    { name: 'Generale', slug: 'general', description: 'Discussioni generali su SafeTrade e il collezionismo.', icon: 'forum' },
    { name: 'Pokemon TCG', slug: 'pokemon', description: 'Tutto sul mondo delle carte Pokemon.', icon: 'catching_pokemon' },
    { name: 'Magic: The Gathering', slug: 'magic', description: 'Strategie, deck e discussioni su MTG.', icon: 'auto_fix' },
    { name: 'Yu-Gi-Oh!', slug: 'yugioh', description: 'Discussioni sui duelli e le carte Yu-Gi-Oh.', icon: 'style' },
    { name: 'Valutazioni & Grading', slug: 'grading', description: 'Chiedi pareri sulle condizioni e il grading.', icon: 'verified' },
    { name: 'Mercatino', slug: 'marketplace', description: 'Annunci di scambio e consigli per gli acquisti.', icon: 'storefront' },
]

async function main() {
    console.log('Seeding topics...')
    for (const topic of topics) {
        await prisma.topic.upsert({
            where: { slug: topic.slug },
            update: topic,
            create: topic,
        })
    }
    console.log('Topics seeded successfully.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
