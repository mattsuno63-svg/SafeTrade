import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Migrating EscrowSession status from ACTIVE to CREATED...')
  
  // Update existing ACTIVE sessions to CREATED
  const result = await prisma.$executeRaw`
    UPDATE "EscrowSession"
    SET status = 'CREATED'
    WHERE status = 'ACTIVE'
  `
  
  console.log(`✅ Updated ${result} sessions from ACTIVE to CREATED`)
  
  // Check for any remaining ACTIVE sessions
  const remaining = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count
    FROM "EscrowSession"
    WHERE status = 'ACTIVE'
  `
  
  if (remaining[0].count > 0) {
    console.warn(`⚠️  Warning: ${remaining[0].count} sessions still have ACTIVE status`)
  } else {
    console.log('✅ All sessions migrated successfully')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Error:', e)
    prisma.$disconnect()
    process.exit(1)
  })

