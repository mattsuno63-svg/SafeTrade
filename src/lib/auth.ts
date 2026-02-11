import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

/**
 * Get current session (lighter than getCurrentUser, doesn't hit Prisma)
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return null
    }
    
    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        email_confirmed_at: (session.user as { email_confirmed_at?: string }).email_confirmed_at,
      },
      accessToken: session.access_token,
      expiresAt: session.expires_at,
    }
  } catch (error) {
    console.error('[getSession] Error:', error)
    return null
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    
    console.log('[getCurrentUser] Calling supabase.auth.getUser()...')
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    console.log('[getCurrentUser] getUser result:', { 
      hasUser: !!user, 
      userId: user?.id, 
      hasError: !!error,
      errorMessage: error?.message 
    })

    if (error || !user) {
      console.log('[getCurrentUser] No user found, returning null')
      return null
    }

    // Get user from Prisma database
    console.log('[getCurrentUser] Fetching user from Prisma...')
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
      },
    })

    console.log('[getCurrentUser] Prisma user found:', !!dbUser)
    
    // Add email verification status from Supabase
    if (dbUser) {
      return {
        ...dbUser,
        emailVerified: !!user.email_confirmed_at,
      }
    }
    
    return dbUser
  } catch (error) {
    console.error('[getCurrentUser] Error getting current user:', error)
    return null
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

/**
 * Require specific role
 */
export async function requireRole(role: 'USER' | 'MERCHANT' | 'ADMIN') {
  const user = await requireAuth()
  if (user.role !== role && user.role !== 'ADMIN') {
    throw new Error('Forbidden: Insufficient permissions')
  }
  return user
}

/**
 * Require email verification - throws error if email not verified
 */
export async function requireEmailVerified() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  if (!user.emailVerified) {
    throw new Error('Email not verified')
  }
  return user
}

