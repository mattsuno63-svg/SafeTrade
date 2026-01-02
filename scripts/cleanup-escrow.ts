import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up escrow sessions...')

  // Delete all escrow messages first (foreign key constraint)
  const deletedMessages = await prisma.escrowMessage.deleteMany({})
  console.log(`✅ Deleted ${deletedMessages.count} escrow messages`)

  // Delete all escrow sessions
  const deletedSessions = await prisma.escrowSession.deleteMany({})
  console.log(`✅ Deleted ${deletedSessions.count} escrow sessions`)

  // Delete all SafeTrade transactions
  const deletedTransactions = await prisma.safeTradeTransaction.deleteMany({})
  console.log(`✅ Deleted ${deletedTransactions.count} SafeTrade transactions`)

  // Reset all proposals to PENDING
  const resetProposals = await prisma.proposal.updateMany({
    where: { status: 'ACCEPTED' },
    data: { status: 'PENDING' },
  })
  console.log(`✅ Reset ${resetProposals.count} proposals to PENDING`)

  console.log('✨ Cleanup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

