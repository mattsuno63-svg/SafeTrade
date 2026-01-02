import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Approve all listings
  const result = await prisma.listingP2P.updateMany({
    where: {
      isApproved: false
    },
    data: {
      isApproved: true
    }
  })

  console.log(`✅ Approved ${result.count} listings`)

  // Show all listings
  const allListings = await prisma.listingP2P.findMany({
    select: {
      id: true,
      title: true,
      isApproved: true,
      price: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`\n📊 All listings now:`)
  allListings.forEach((listing, index) => {
    console.log(`${index + 1}. ${listing.title} - €${listing.price} - ${listing.isApproved ? '✅' : '❌'}`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

