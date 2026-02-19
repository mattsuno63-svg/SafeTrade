'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.')
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (process.env.NODE_ENV === 'development') console.log('[Login] Form submitted, using API route')

    try {
      // Use API route - it will call setSession which triggers setAll()
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // CRITICAL: include cookies
        body: JSON.stringify({ email, password }),
      })

      if (process.env.NODE_ENV === 'development') console.log('[Login] API response status:', res.status)

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        toast({
          title: 'Error',
          description: data.error || 'Login failed',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      if (process.env.NODE_ENV === 'development') console.log('[Login] Login successful via API, user:', data.user?.id)

      // CRITICAL: Set session in browser client BEFORE redirect
      // This saves to localStorage so createBrowserClient can read it
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      if (data.session) {
        if (process.env.NODE_ENV === 'development') console.log('[Login] Setting session in browser client...')
        // Set session in browser client - this saves to localStorage
        // The cookies are already set by the API route
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        
        if (setSessionError) {
          console.error('[Login] ❌ Error setting session in browser:', setSessionError)
          toast({
            title: 'Warning',
            description: 'Session may not be fully synced. Please refresh if needed.',
            variant: 'destructive',
          })
        } else {
          if (process.env.NODE_ENV === 'development') console.log('[Login] ✅ Session set in browser client')
          
          // CRITICAL: Verify session is actually saved in localStorage
          const { data: { session: verifySession }, error: verifyError } = await supabase.auth.getSession()
          if (verifyError) {
            console.error('[Login] ❌ Error verifying session:', verifyError)
          } else if (!verifySession) {
            console.warn('[Login] ⚠️ WARNING: Session not found after setSession!')
            console.warn('[Login] This might be a timing issue, will retry...')
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('[Login] ✅ Session verified in browser client, user:', verifySession.user?.id)
              console.log('[Login] ✅ Session access_token exists:', !!verifySession.access_token)
            }
          }
        }
      }

      // CRITICAL: Verify session is actually saved before redirecting
      // Retry multiple times to ensure it's saved
      let sessionVerified = false
      let attempts = 0
      const maxAttempts = 15
      
      while (!sessionVerified && attempts < maxAttempts) {
        const { data: { session: checkSession }, error: checkError } = await supabase.auth.getSession()
        if (checkError) {
          console.error('[Login] ❌ Error checking session:', checkError)
        }
        if (checkSession?.user && checkSession?.access_token) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Login] ✅ Session verified, user:', checkSession.user.id)
            console.log('[Login] ✅ Access token exists:', !!checkSession.access_token)
          }
          sessionVerified = true
        } else {
          attempts++
          if (attempts < maxAttempts) {
            if (process.env.NODE_ENV === 'development') console.log(`[Login] ⏳ Session not found yet, waiting... (attempt ${attempts}/${maxAttempts})`)
            // Try setting session again if it's not found
            if (attempts % 3 === 0 && data.session) {
              if (process.env.NODE_ENV === 'development') console.log('[Login] 🔄 Retrying setSession...')
              await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
              })
            }
            await new Promise(resolve => setTimeout(resolve, 200))
          }
        }
      }

      if (!sessionVerified) {
        console.error('[Login] ❌ Session not verified after all attempts!')
        console.error('[Login] This is a critical error - session may not persist')
        toast({
          title: 'Warning',
          description: 'Session may not be fully synced. If you see login button, please refresh the page.',
          variant: 'destructive',
        })
      }

      toast({
        title: 'Success',
        description: 'Logged in successfully! Redirecting...',
      })

      // Small delay to ensure everything is saved
      await new Promise(resolve => setTimeout(resolve, 500))

      // CRITICAL: Use window.location.href for full page reload
      // This ensures middleware reads cookies and useUser reads localStorage
      if (process.env.NODE_ENV === 'development') console.log('[Login] 🔄 Redirecting to /dashboard')
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('[Login] Error caught', err)
      setError('An error occurred. Please try again.')
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <Card className="glass-panel w-full max-w-md rounded-3xl p-8 sm:p-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-black text-text-primary dark:text-white">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base">
                Sign in to your SafeTrade account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'google' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3"
                  onClick={() => handleOAuthLogin('apple')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'apple' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  Continue with Apple
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary-dark"
                  disabled={loading || !!oauthLoading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Don't have an account? </span>
                <Link href="/signup" className="font-bold text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

