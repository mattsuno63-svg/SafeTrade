import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Carica variabili d'ambiente - prova prima con dotenv, poi fallback a lettura diretta
const envPath = resolve(process.cwd(), '.env')
const result = config({ path: envPath })

// Se dotenv non ha caricato nulla, prova a leggere direttamente il file
if (!process.env.DATABASE_URL && result.parsed) {
  // dotenv ha parsato ma non ha esposto le variabili - riassegnale manualmente
  Object.assign(process.env, result.parsed)
}

// Se ancora non c'è DATABASE_URL, prova a leggere direttamente il file
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const trimmed = line.trim()
      // Salta commenti e righe vuote
      if (!trimmed || trimmed.startsWith('#')) continue
      
      // Cerca DATABASE_URL
      if (trimmed.startsWith('DATABASE_URL=')) {
        // Estrai il valore dopo il primo =
        const value = trimmed.substring('DATABASE_URL='.length).trim()
        // Rimuovi quote se presenti
        const cleanValue = value.replace(/^["']|["']$/g, '')
        if (cleanValue && cleanValue.startsWith('postgres')) {
          process.env.DATABASE_URL = cleanValue
          console.log('✅ DATABASE_URL letto direttamente dal file .env')
          break
        }
      }
    }
  } catch (error) {
    console.error('❌ Errore leggendo file .env:', error)
  }
}

// Verifica che DATABASE_URL sia presente
if (!process.env.DATABASE_URL) {
  console.error('❌ Errore: DATABASE_URL non trovato nel file .env')
  console.error(`   Path cercato: ${envPath}`)
  console.error('   Assicurati che il file .env contenga DATABASE_URL=postgresql://...')
  process.exit(1)
}

// Verifica formato DATABASE_URL
if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
  console.error('❌ Errore: DATABASE_URL deve iniziare con postgresql:// o postgres://')
  console.error(`   Valore attuale: ${process.env.DATABASE_URL.substring(0, 50)}...`)
  process.exit(1)
}

console.log('✅ DATABASE_URL caricato correttamente')
console.log(`   URL: ${process.env.DATABASE_URL.substring(0, 50)}...`)

// Inizializza Prisma Client DOPO aver caricato le variabili d'ambiente
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

/**
 * Script per creare notifiche AdminNotification per merchant applications esistenti
 * che non hanno ancora una notifica
 */
async function createMissingNotifications() {
  console.log('🔄 Cercando merchant applications senza notifica admin...\n')

  // Trova tutte le merchant applications PENDING senza notifica
  const applications = await prisma.merchantApplication.findMany({
    where: {
      status: 'PENDING',
    },
    select: {
      id: true,
      shopName: true,
      createdAt: true,
    },
  })

  console.log(`📋 Trovate ${applications.length} merchant applications PENDING\n`)

  for (const app of applications) {
    // Verifica se esiste già una notifica per questa application
    const existingNotif = await prisma.adminNotification.findFirst({
      where: {
        referenceType: 'MERCHANT_APPLICATION',
        referenceId: app.id,
      },
    })

    if (existingNotif) {
      console.log(`✅ Notifica già esistente per: ${app.shopName}`)
      continue
    }

    // Crea notifica
    try {
      await prisma.adminNotification.create({
        data: {
          type: 'MERCHANT_APPLICATION',
          referenceType: 'MERCHANT_APPLICATION',
          referenceId: app.id,
          title: 'Nuova Richiesta Commerciante',
          message: `${app.shopName} ha richiesto di diventare un partner SafeTrade.`,
          priority: 'NORMAL',
          targetRoles: ['ADMIN', 'MODERATOR'],
        },
      })
      console.log(`✅ Notifica creata per: ${app.shopName}`)
    } catch (error: any) {
      console.error(`❌ Errore creando notifica per ${app.shopName}:`, error.message)
    }
  }

  console.log('\n✅ Script completato!')
}

createMissingNotifications()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Errore:', error)
    prisma.$disconnect()
    process.exit(1)
  })

