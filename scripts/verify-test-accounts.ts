import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// Carica variabili d'ambiente - metodo robusto
const envPath = resolve(process.cwd(), '.env')
const result = config({ path: envPath })

// Se dotenv non ha caricato, leggi direttamente il file
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = trimmed.substring('NEXT_PUBLIC_SUPABASE_URL='.length).trim().replace(/^["']|["']$/g, '')
      } else if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).trim().replace(/^["']|["']$/g, '')
      }
    }
  } catch (error) {
    // Ignora errori di lettura
  }
}

/**
 * Script per verificare automaticamente le email degli account di test
 * Usa SUPABASE_SERVICE_ROLE_KEY per bypassare la verifica email
 * 
 * Uso: npx tsx scripts/verify-test-accounts.ts
 */
async function verifyTestAccounts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Errore: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devono essere configurati')
    console.error('   Assicurati che il file .env contenga queste variabili')
    process.exit(1)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Account di test creati (ID dalla creazione precedente)
  const testAccounts = [
    {
      id: 'deb498a1-f4a0-44e7-8d1b-5d26bb370d55',
      email: 'buyer-test@safetrade.it',
      name: 'Test Buyer',
    },
    {
      id: '51d7ebe5-b2b6-46ac-9017-c285eb890963',
      email: 'seller-test@safetrade.it',
      name: 'Test Seller',
    },
  ]

  console.log('🔄 Verifica email account di test...\n')

  for (const account of testAccounts) {
    try {
      // Verifica email in Supabase usando Admin API
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(account.id, {
        email_confirm: true,
      })

      if (error) {
        console.error(`❌ Errore verificando ${account.email}:`, error.message)
      } else {
        console.log(`✅ Email verificata: ${account.email} (${account.name})`)
      }
    } catch (error: any) {
      console.error(`❌ Errore processando ${account.email}:`, error.message)
    }
  }

  console.log('\n✅ Verifica completata!')
  console.log('\n📝 Ora puoi fare login con:')
  console.log('   - buyer-test@safetrade.it / Test1234!')
  console.log('   - seller-test@safetrade.it / Test1234!')
}

verifyTestAccounts()
  .catch((error) => {
    console.error('❌ Errore:', error)
    process.exit(1)
  })

