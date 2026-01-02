import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

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

