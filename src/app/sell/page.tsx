'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUser } from '@/hooks/use-user'
import { useLocale } from '@/contexts/LocaleContext'

export default function SellPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { t } = useLocale()
  const [shop, setShop] = useState<any>(null)
  const [shopLoading, setShopLoading] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  useEffect(() => {
    // Check if user is MERCHANT or ADMIN and fetch shop
    const userRole = user?.user_metadata?.role
    if (user && (userRole === 'MERCHANT' || userRole === 'ADMIN')) {
      fetchShop()
    }
  }, [user])

  const fetchShop = async () => {
    setShopLoading(true)
    try {
      const res = await fetch('/api/merchant/shop')
      if (res.ok) {
        const data = await res.json()
        setShop(data)
      }
    } catch (error) {
      console.error('Error fetching shop:', error)
      setShop(null)
    } finally {
      setShopLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>{t('common.loading')}</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userRole = user.user_metadata?.role || 'USER'

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">{t('sell.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {t('sell.description')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Show only "Sell as Collector" for USER role */}
              {userRole === 'USER' && (
                <Card className="glass-panel p-8 flex flex-col md:col-span-2 max-w-2xl mx-auto">
                  <div className="mb-4">
                    <span className="material-symbols-outlined text-4xl text-primary mb-4 inline-block">
                      person
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4">{t('sell.asCollector')}</h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
                    {t('sell.asCollectorDesc')}
                  </p>
                  <Button 
                    className="w-full bg-primary hover:bg-primary-dark mt-auto"
                    onClick={() => router.push('/listings/create')}
                  >
                    {t('sell.createListing')}
                  </Button>
                </Card>
              )}

              {/* Show only "Sell as Merchant" for MERCHANT role */}
              {(userRole === 'MERCHANT' || userRole === 'ADMIN') && (
                <>
                  <Card className="glass-panel p-8 flex flex-col md:col-span-2 max-w-2xl mx-auto">
                    <div className="mb-4">
                      <span className="material-symbols-outlined text-4xl text-primary mb-4 inline-block">
                        store
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-4">{t('sell.asMerchant')}</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 flex-grow">
                      {t('sell.asMerchantDesc')}
                    </p>
                    <Button 
                      className="w-full bg-primary hover:bg-primary-dark mt-auto"
                      onClick={() => router.push('/dashboard/merchant/create-offer')}
                    >
                      {t('sell.createOffer')}
                    </Button>
                  </Card>

                  {/* Il Mio Negozio - Only for approved merchants */}
                  {!shopLoading && shop && shop.isApproved && (
                    <Card className="glass-panel p-8 md:col-span-2 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-orange-500/5">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-orange-500/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-primary">storefront</span>
                          </div>
                          <div>
                            <h2 className="text-3xl font-bold mb-2">Il Mio Negozio</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                              Gestisci completamente il tuo negozio SafeTrade
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                          <span className="material-symbols-outlined text-green-500 text-sm">verified</span>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">Approvato</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-primary">inventory</span>
                            <h3 className="font-bold">Inventario</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Gestisci i tuoi prodotti
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-blue-500">event</span>
                            <h3 className="font-bold">Appuntamenti</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            SafeTrade appointments
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-black/20 border border-white/20">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-green-500">emoji_events</span>
                            <h3 className="font-bold">Tornei</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Organizza tornei
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button 
                          className="flex-1 bg-primary hover:bg-primary-dark h-12 text-lg font-bold"
                          onClick={() => router.push('/merchant/shop')}
                        >
                          <span className="material-symbols-outlined mr-2">dashboard</span>
                          Gestisci Negozio
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 border-2 h-12 text-lg"
                          onClick={() => router.push('/merchant/tournaments/new')}
                        >
                          <span className="material-symbols-outlined mr-2">add</span>
                          Crea Torneo
                        </Button>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>

            {/* Benefits */}
            <Card className="glass-panel p-8">
              <h2 className="text-2xl font-bold mb-6">{t('sell.whySell')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="material-symbols-outlined text-primary text-3xl mb-2 inline-block">
                    verified
                  </span>
                  <h3 className="font-bold mb-2">{t('sell.verifiedTransactions')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('sell.verifiedTransactionsDesc')}
                  </p>
                </div>
                <div>
                  <span className="material-symbols-outlined text-primary text-3xl mb-2 inline-block">
                    security
                  </span>
                  <h3 className="font-bold mb-2">{t('sell.secureEscrow')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('sell.secureEscrowDesc')}
                  </p>
                </div>
                <div>
                  <span className="material-symbols-outlined text-primary text-3xl mb-2 inline-block">
                    trending_up
                  </span>
                  <h3 className="font-bold mb-2">{t('sell.bestPrices')}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('sell.bestPricesDesc')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

