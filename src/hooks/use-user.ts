'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { syncSessionFromCookies } from '@/lib/supabase/sync-session'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Use ref to track if user was found (to stop retry loops)
  const userFoundRef = useRef(false)
  // Track if component is mounted
  const mountedRef = useRef(true)

  const refreshSession = useCallback(async () => {
    if (!mountedRef.current) return
    
    try {
      const supabase = createClient()
      
      // First try getSession (reads from localStorage)
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[useUser] Error getting session:', error)
      } else if (session?.user) {
        if (process.env.NODE_ENV === 'development') console.log('[useUser] Session found, user:', session.user.id)
        userFoundRef.current = true
        if (mountedRef.current) {
          setUser(session.user)
          setLoading(false)
        }
        return
      }

      // If no session from getSession, try getUser (reads from server/cookies)
      if (process.env.NODE_ENV === 'development') console.log('[useUser] No session from getSession, trying getUser()...')
      const { data: { user: userFromGetUser }, error: getUserError } = await supabase.auth.getUser()
      
      if (!getUserError && userFromGetUser) {
        if (process.env.NODE_ENV === 'development') console.log('[useUser] User found via getUser:', userFromGetUser.id)
        userFoundRef.current = true
        if (mountedRef.current) {
          setUser(userFromGetUser)
          setLoading(false)
        }
      } else {
        // Only set null if we haven't found user elsewhere
        if (!userFoundRef.current && mountedRef.current) {
          if (process.env.NODE_ENV === 'development') console.log('[useUser] No user found in refreshSession')
          setUser(null)
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('[useUser] Error in refreshSession:', error)
      if (!userFoundRef.current && mountedRef.current) {
        setUser(null)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    userFoundRef.current = false
    
    const supabase = createClient()

    // Get initial session from localStorage/cookies
    const getInitialSession = async (retryCount = 0) => {
      // Stop if user was already found or component unmounted
      if (userFoundRef.current || !mountedRef.current) return

      try {
        if (process.env.NODE_ENV === 'development') console.log('[useUser] Getting initial session, attempt', retryCount + 1)
        
        // First try getSession (local - reads from localStorage)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[useUser] ❌ Error getting session:', error)
        } else if (session?.user) {
          if (process.env.NODE_ENV === 'development') console.log('[useUser] Session via getSession:', session.user.id)
          userFoundRef.current = true
          if (mountedRef.current) {
            setUser(session.user)
            setLoading(false)
          }
          return
        } else if (process.env.NODE_ENV === 'development') {
          console.log('[useUser] No session from getSession()')
        }

        // If no session from getSession, try to sync from cookies on first attempt
        if (retryCount === 0) {
          console.log('[useUser] 🔄 No session in localStorage, trying to sync from cookies...')
          try {
            const syncedSession = await syncSessionFromCookies()
            if (syncedSession?.user) {
              console.log('[useUser] ✅ Session synced from cookies, user:', syncedSession.user.id)
              userFoundRef.current = true
              if (mountedRef.current) {
                setUser(syncedSession.user)
                setLoading(false)
              }
              return
            }
          } catch (syncErr) {
            console.error('[useUser] Error syncing session:', syncErr)
          }
        }

        // Stop if user was found during sync
        if (userFoundRef.current) {
          console.log('[useUser] 🛑 User found during sync, stopping')
          return
        }

        // If still no user and we haven't retried too much, retry
        if (retryCount < 3) {
          const delay = (retryCount + 1) * 500
          console.log(`[useUser] ⏳ No user found, retrying in ${delay}ms (attempt ${retryCount + 1}/3)`)
          setTimeout(() => getInitialSession(retryCount + 1), delay)
        } else {
          // No user after retries - only set null if user not found elsewhere
          if (!userFoundRef.current && mountedRef.current) {
            console.log('[useUser] ❌ No user found after all retries')
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('[useUser] ❌ Error:', error)
        if (retryCount < 3 && !userFoundRef.current && mountedRef.current) {
          const delay = (retryCount + 1) * 500
          setTimeout(() => getInitialSession(retryCount + 1), delay)
        } else if (!userFoundRef.current && mountedRef.current) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[useUser] Auth state changed:', event, session?.user?.id || 'no user')
      
      // For SIGNED_IN event, set user immediately
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[useUser] ✅ SIGNED_IN event, setting user:', session.user.id)
        userFoundRef.current = true // Mark user as found to stop retries
        if (mountedRef.current) {
          setUser(session.user)
          setLoading(false)
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('[useUser] ❌ SIGNED_OUT event')
        userFoundRef.current = false
        if (mountedRef.current) {
          setUser(null)
          setLoading(false)
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('[useUser] 🔄 TOKEN_REFRESHED event')
        userFoundRef.current = true
        if (mountedRef.current) {
          setUser(session.user)
          setLoading(false)
        }
      } else if (event === 'INITIAL_SESSION') {
        // Only process INITIAL_SESSION if it has a user
        if (session?.user) {
          console.log('[useUser] ✅ INITIAL_SESSION with user:', session.user.id)
          userFoundRef.current = true
          if (mountedRef.current) {
            setUser(session.user)
            setLoading(false)
          }
        }
        // If INITIAL_SESSION has no user, don't set null - let retry logic handle it
      }
    })

    // Also listen for storage changes (when session is set in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('sb-') || e.key === 'supabase.auth.token') {
        console.log('[useUser] Storage changed, refreshing session')
        refreshSession()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      mountedRef.current = false
      subscription.unsubscribe()
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [refreshSession])

  return { user, loading, refreshSession }
}
