'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'
import { useUser } from '@/hooks/use-user'
import { EmailVerificationBanner } from '@/components/auth/EmailVerificationBanner'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { t } = useLocale()

  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/dashboard')}`)
    }
  }, [user, userLoading, router])

  if (userLoading || !user) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>{t('common.loading')}</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Email verification banner */}
          {!user.email_confirmed_at && (
            <EmailVerificationBanner email={user.email || ''} />
          )}
          
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t('dashboard.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t('dashboard.welcome')}, {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(user.user_metadata?.role === 'MERCHANT' || user.user_metadata?.role === 'ADMIN') && (
              <>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/dashboard/merchant/inventory')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">inventory</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('dashboard.inventory')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.manageProducts')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/dashboard/merchant/offers')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">local_offer</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('dashboard.offers')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.manageOffers')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/dashboard/merchant/create-offer')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">add</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('dashboard.createOffer')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.newExclusiveOffer')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/shop')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">store</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('merchant.shop')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci il tuo negozio</p>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {(!user.user_metadata?.role || user.user_metadata?.role === 'USER') && (
              <>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/listings')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">store</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('dashboard.browseListings')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.findCards')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/sell')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">sell</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{t('dashboard.sellCards')}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.listYourCards')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/dashboard/listings')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">list</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">I Miei Annunci</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci i tuoi annunci</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/dashboard/proposals/received')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">mail</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Proposte</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci le proposte</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/escrow/sessions')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">security</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Escrow Sessions</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci le sessioni SafeTrade</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
            
            {/* Escrow Sessions - Available for all users */}
            <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/escrow/sessions')}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">security</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Escrow Sessions</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">SafeTrade escrow e pagamenti</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

