import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const listings = await prisma.listingP2P.findMany({
    select: {
      id: true,
      title: true,
      isApproved: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          name: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`\n📊 Total listings in database: ${listings.length}\n`)
  
  listings.forEach((listing, index) => {
    console.log(`${index + 1}. ${listing.title}`)
    console.log(`   ID: ${listing.id}`)
    console.log(`   Approved: ${listing.isApproved ? '✅ YES' : '❌ NO'}`)
    console.log(`   User: ${listing.user.name || listing.user.email}`)
    console.log(`   Created: ${listing.createdAt.toISOString()}`)
    console.log('')
  })

  const approved = listings.filter(l => l.isApproved).length
  const notApproved = listings.filter(l => !l.isApproved).length

  console.log(`\n📈 Summary:`)
  console.log(`   ✅ Approved: ${approved}`)
  console.log(`   ❌ Not Approved: ${notApproved}`)
  console.log(`   📦 Total: ${listings.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

