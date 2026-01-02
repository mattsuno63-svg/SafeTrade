
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const posts = await prisma.post.findMany({
        include: { topic: true, author: true }
    })
    console.log(`Found ${posts.length} posts in database.`)
    if (posts.length > 0) {
        console.log('Sample post:', posts[0].title)
        console.log('Topic:', posts[0].topic.slug)
    } else {
        console.log('No posts found!')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
