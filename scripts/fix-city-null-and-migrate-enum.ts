import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Carica variabili d'ambiente
const envPath = resolve(process.cwd(), '.env')
config({ path: envPath })

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL non trovato')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Inizio migrazione database...\n')

  try {
    // Step 1: Aggiorna NULL city values usando SQL raw
    console.log('📝 Step 1: Aggiornamento valori NULL per campo city...')
    const result = await prisma.$executeRaw`
      UPDATE "User" 
      SET "city" = 'Roma' 
      WHERE "city" IS NULL
    `
    console.log(`✅ Aggiornati ${result} utenti con city=NULL → 'Roma'\n`)

    // Step 2: Verifica che non ci siano più NULL usando SQL raw
    const nullCheck = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::int as count 
      FROM "User" 
      WHERE "city" IS NULL
    `
    const nullCount = Number(nullCheck[0].count)
    
    if (nullCount > 0) {
      console.error(`❌ Ancora ${nullCount} utenti con city=NULL`)
      process.exit(1)
    }

    console.log('✅ Tutti gli utenti hanno ora un valore city valido\n')

    // Step 3: Nota per prisma db push
    console.log('📝 Step 2: Esegui ora: npx prisma db push --accept-data-loss')
    console.log('   Questo aggiornerà l\'enum HubPackageStatus nel database\n')

  } catch (error: any) {
    console.error('❌ Errore durante la migrazione:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

