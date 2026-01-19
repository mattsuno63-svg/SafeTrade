import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Carica variabili d'ambiente - metodo robusto
const envPath = resolve(process.cwd(), '.env')
const result = config({ path: envPath })

// Se dotenv non ha caricato, leggi direttamente il file
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      if (trimmed.startsWith('DATABASE_URL=')) {
        const value = trimmed.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
        if (value && value.startsWith('postgres')) {
          process.env.DATABASE_URL = value
          break
        }
      }
    }
  } catch (error) {
    console.error('Error reading .env:', error)
  }
}

if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  console.error('❌ DATABASE_URL non trovato o non valido')
  process.exit(1)
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

async function checkShops() {
  console.log('🔄 Verificando negozi nel database...\n')

  const shops = await prisma.shop.findMany({
    select: {
      id: true,
      name: true,
      isApproved: true,
      vaultEnabled: true,
      vaultCaseAuthorized: true,
      merchant: {
        select: {
          email: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`📊 Totale negozi: ${shops.length}\n`)

  if (shops.length === 0) {
    console.log('❌ Nessun negozio trovato nel database')
    return
  }

  shops.forEach((shop, index) => {
    console.log(`${index + 1}. ${shop.name}`)
    console.log(`   ID: ${shop.id}`)
    console.log(`   Approvato: ${shop.isApproved ? '✅' : '❌'}`)
    console.log(`   Vault Enabled: ${shop.vaultEnabled ? '✅' : '❌'}`)
    console.log(`   Vault Case Authorized: ${shop.vaultCaseAuthorized ? '✅' : '❌'}`)
    console.log(`   Merchant: ${shop.merchant.name || shop.merchant.email}`)
    console.log('')
  })

  const approved = shops.filter(s => s.isApproved).length
  const withVault = shops.filter(s => s.vaultEnabled || s.vaultCaseAuthorized).length

  console.log(`\n📈 Riepilogo:`)
  console.log(`   ✅ Approvati: ${approved}`)
  console.log(`   📦 Con Vault: ${withVault}`)
  console.log(`   🏪 Disponibili per Escrow Locale: ${approved}`)
}

checkShops()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Errore:', error)
    prisma.$disconnect()
    process.exit(1)
  })

