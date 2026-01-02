import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  // createBrowserClient handles cookies automatically via the middleware
  // CRITICAL: Must use base64url encoding to match server clients
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: 'base64url', // CRITICAL: Must match server clients
    }
  )
}

