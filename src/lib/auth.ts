import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import type { UserRole } from '@prisma/client'

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
  } catch {
    return null
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user from Prisma database
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

    if (dbUser) {
      return {
        ...dbUser,
        emailVerified: !!user.email_confirmed_at,
      }
    }

    return dbUser
  } catch {
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
 * Require specific role — supporta tutti i ruoli inclusi MODERATOR e HUB_STAFF.
 * ADMIN ha sempre accesso.
 */
export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  if (user.role !== role && user.role !== 'ADMIN') {
    throw new Error('Forbidden: Insufficient permissions')
  }
  return user
}

/**
 * Require any of the specified roles — ADMIN ha sempre accesso.
 */
export async function requireAnyRole(roles: UserRole[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role as UserRole) && user.role !== 'ADMIN') {
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
