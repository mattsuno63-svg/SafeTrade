'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  console.log('[Server Action] Starting login for:', email.substring(0, 5) + '***')

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.log('[Server Action] Login error:', error.message)
    return { error: error.message }
  }

  if (!data.user) {
    console.log('[Server Action] Login failed: no user')
    return { error: 'Login failed' }
  }

  console.log('[Server Action] Login successful, user:', data.user.id)
  console.log('[Server Action] Has session:', !!data.session)

  // Force cookie setting by calling getSession
  const { data: { session: sessionAfterLogin } } = await supabase.auth.getSession()
  console.log('[Server Action] Session after login:', !!sessionAfterLogin)

  // Check cookies
  const cookieStore = await import('next/headers').then(m => m.cookies())
  const allCookies = cookieStore.getAll()
  console.log('[Server Action] Cookies after login:', allCookies.length, allCookies.map(c => c.name).join(', '))

  // The session should be automatically set via cookies by Supabase SSR
  // Now redirect to dashboard
  redirect('/dashboard')
}

