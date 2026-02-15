'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from './NotificationBell'
import { AdminNotificationBell } from './AdminNotificationBell'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useLocale } from '@/contexts/LocaleContext'

// Component to show Shop button for merchants
function ShopButton({ user }: { user: User }) {
  const [hasShop, setHasShop] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkShop = async () => {
      try {
        const res = await fetch('/api/user/has-shop')
        if (res.ok) {
          const data = await res.json()
          setHasShop(data.hasShop)
        }
      } catch (error) {
        setHasShop(false)
      } finally {
        setLoading(false)
      }
    }

    checkShop()
  }, [user])

  if (loading || !hasShop) {
    return null
  }

  return (
    <Link href="/merchant/shop">
      <Button 
        variant="outline" 
        className="hidden sm:flex items-center gap-2 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
      >
        <span className="material-symbols-outlined text-lg">store</span>
        <span className="font-bold">Negozio</span>
      </Button>
    </Link>
  )
}

export function Header() {
  const { user, loading, refreshSession } = useUser()
  const router = useRouter()
  const { locale, setLocale, t } = useLocale()

  // Refresh session only on mount and window focus (not periodically - auth state change handles that)
  useEffect(() => {
    // Refresh on mount only if needed (useUser hook already handles initial session)
    // Only refresh on window focus to catch session changes from other tabs
    const handleFocus = () => {
      // Only refresh if user was logged in (avoid unnecessary calls)
      if (user) {
      refreshSession()
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshSession, user])

  const handleLogout = async () => {
    try {
      // Call API logout endpoint to clear server-side cookies
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      if (!res.ok) {
        console.error('Logout API error:', await res.text())
      }

      // Clear client-side Supabase session
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout client error:', error)
      }
      
      // Clear localStorage (Supabase stores tokens here)
      try {
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      } catch (e) {
        console.error('Error clearing localStorage:', e)
      }

      // Clear sessionStorage
      try {
        sessionStorage.clear()
      } catch (e) {
        console.error('Error clearing sessionStorage:', e)
      }
      
      // Force a full page reload to clear all state and cookies
      // Use window.location.replace to prevent back button issues
      window.location.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
      // Even if there's an error, try to redirect
      window.location.replace('/')
    }
  }

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/50 transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 group mr-6">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-[20px]">playing_cards</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-primary dark:text-white">
            SafeTrade
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/marketplace" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            {t('nav.marketplace')}
          </Link>
          <Link href="/tournaments" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            {t('nav.tournaments')}
          </Link>
          <Link href="/community" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            {t('nav.community')}
          </Link>
          <Link href="/safetrade" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            SafeTrade
          </Link>
          <Link href="/safevault" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            SafeVault
          </Link>
          <Link href="/sell" className="text-sm font-medium text-text-primary/80 hover:text-primary dark:text-white/80 dark:hover:text-primary transition-colors">
            {t('nav.sell')}
          </Link>
        </nav>
        
        <div className="flex items-center gap-3 ml-6">
          {/* Language Selector */}
          <div className="flex items-center gap-1 rounded-full border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/30 p-1">
            <button
              onClick={() => setLocale('it')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                locale === 'it'
                  ? 'bg-primary text-white'
                  : 'text-text-primary/60 dark:text-white/60 hover:text-text-primary dark:hover:text-white'
              }`}
            >
              IT
            </button>
            <button
              onClick={() => setLocale('en')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-95 ${
                locale === 'en'
                  ? 'bg-primary text-white'
                  : 'text-text-primary/60 dark:text-white/60 hover:text-text-primary dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
          
          <button className="hidden rounded-full p-2 text-text-primary hover:bg-black/5 dark:text-white dark:hover:bg-white/10 sm:block transition-colors">
            <span className="material-symbols-outlined">search</span>
          </button>
          
          {loading ? (
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          ) : user ? (
            <>
              {/* Admin Button - For Admin/Moderator (notification bell moved next to normal bell) */}
              {(user.email === 'portelli.mattiaa@gmail.com' || user.user_metadata?.role === 'ADMIN' || user.user_metadata?.role === 'MODERATOR') && (
                <Link href="/admin">
                  <Button 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-2 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400"
                  >
                    <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    <span className="font-bold">Admin</span>
                  </Button>
                </Link>
              )}
              {/* Shop Button - For merchants with approved shop */}
              <ShopButton user={user} />
              {/* Admin notification bell (solo admin/mod) vicino alla campanella normale */}
              {(user.email === 'portelli.mattiaa@gmail.com' || user.user_metadata?.role === 'ADMIN' || user.user_metadata?.role === 'MODERATOR') && (
                <AdminNotificationBell />
              )}
              <NotificationBell userId={user.id} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                    <Avatar className="h-9 w-9 border-2 border-primary/20">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {getUserInitials(user.email || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center gap-2 cursor-pointer">
                      <span className="material-symbols-outlined text-lg">dashboard</span>
                      {t('nav.dashboard')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile" className="flex items-center gap-2 cursor-pointer">
                      <span className="material-symbols-outlined text-lg">person</span>
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                      <span className="material-symbols-outlined text-lg">settings</span>
                      {t('nav.settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg mr-2">logout</span>
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" className="flex h-9 items-center justify-center rounded-full bg-text-primary/5 backdrop-blur-sm px-4 text-sm font-bold text-text-primary transition hover:bg-text-primary/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20" asChild>
                <Link href="/login">{t('nav.login')}</Link>
              </Button>
              <Button className="flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/30 transition hover:bg-primary-dark hover:shadow-primary/50" asChild>
                <Link href="/signup">{t('nav.signup')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

