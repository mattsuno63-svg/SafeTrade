import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Carica variabili d'ambiente
const envPath = resolve(process.cwd(), '.env')
config({ path: envPath })

// Se dotenv non ha caricato, leggi direttamente il file
if (!process.env.DATABASE_URL) {
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      if (trimmed.startsWith('DATABASE_URL=')) {
        process.env.DATABASE_URL = trimmed.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch (error) {
    console.error('Error reading .env:', error)
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

/**
 * Script per approvare listing pending esistenti
 * Applica le stesse regole di auto-approvazione
 */
async function approvePendingListings() {
  console.log('🔄 Cercando listing pending da approvare...\n')

  // Trova tutti i listing non approvati
  const pendingListings = await prisma.listingP2P.findMany({
    where: {
      isApproved: false,
      isActive: true,
    },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            karma: {
              select: {
                karma: true,
                listingsCount: true,
              },
            },
          },
        },
      },
  })

  console.log(`📋 Trovati ${pendingListings.length} listing pending\n`)

  let approved = 0
  let skipped = 0

  for (const listing of pendingListings) {
    const user = listing.user
    const accountAge = user.createdAt 
      ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      : 0
    const hasPositiveKarma = (user.karma?.karma || 0) > 0
    const hasPreviousListings = (user.karma?.listingsCount || 0) > 0
    // Per semplicità, assumiamo che account con karma positivo o listing precedenti siano verificati
    // In produzione, verificheresti via Supabase Auth
    const isEmailVerified = hasPositiveKarma || hasPreviousListings

    const shouldAutoApprove = isEmailVerified || 
                              accountAge >= 7 || 
                              hasPositiveKarma || 
                              hasPreviousListings

    if (shouldAutoApprove) {
      try {
        await prisma.listingP2P.update({
          where: { id: listing.id },
          data: { isApproved: true },
        })
        console.log(`✅ Approvato: ${listing.title} (${user.email})`)
        approved++
      } catch (error: any) {
        console.error(`❌ Errore approvando ${listing.title}:`, error.message)
      }
    } else {
      console.log(`⏸️  Saltato (richiede approvazione manuale): ${listing.title} (${user.email})`)
      skipped++
    }
  }

  console.log(`\n✅ Script completato!`)
  console.log(`   ✅ Approvati: ${approved}`)
  console.log(`   ⏸️  Richiedono approvazione manuale: ${skipped}`)
}

approvePendingListings()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Errore:', error)
    prisma.$disconnect()
    process.exit(1)
  })

