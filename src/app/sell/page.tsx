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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Show 3 options for USER role: Local Escrow, Verified Escrow, SafeVault */}
              {userRole === 'USER' && (
                <>
                  {/* Opzione 1: Escrow Locale */}
                  <Card className="glass-panel p-6 flex flex-col hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-blue-500">
                          store
                        </span>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Escrow Locale</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                      Incontra l'acquirente in un negozio verificato. Scambio sicuro e immediato con verifica professionale.
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Scambio in negozio fisico
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Verifica immediata
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Pagamento sicuro
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-blue-500 hover:bg-blue-600 mt-auto"
                      onClick={() => router.push('/listings/create?escrowType=LOCAL')}
                    >
                      Vendi con Escrow Locale
                    </Button>
                  </Card>

                  {/* Opzione 2: Escrow Centralizzato */}
                  <Card className="glass-panel p-6 flex flex-col hover:shadow-xl transition-all hover:-translate-y-1">
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-green-500">
                          local_shipping
                        </span>
                      </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2">Escrow Centralizzato</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                      Spedisci a SafeTrade Hub. Verifica professionale e rispedizione all'acquirente. Massima sicurezza.
                    </p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Verifica professionale
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Spedizione gestita
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Protezione completa
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-green-500 hover:bg-green-600 mt-auto"
                      onClick={() => router.push('/listings/create?escrowType=VERIFIED')}
                    >
                      Vendi con Escrow Centralizzato
                    </Button>
                  </Card>

                  {/* Opzione 3: SafeVault (Contovendita) */}
                  <Card className="glass-panel p-6 flex flex-col hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-purple-500/30 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-900/20 dark:to-purple-800/10">
                    <div className="mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-3xl text-purple-500">
                          inventory_2
                        </span>
                      </div>
                      <div className="inline-block px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded mb-2">
                        NUOVO
                      </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2">SafeVault - Contovendita</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-grow">
                      Vendita in contovendita multicanale. Verifica professionale, vendita online e nei negozi. Ricevi il 70% del prezzo finale.
                    </p>
                    <div className="mb-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
                      <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        Solo per carte con valore ≥ 40€
                      </p>
                    </div>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Verifica professionale
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Vendita multicanale
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                        Split 70/20/10
                      </li>
                    </ul>
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700 mt-auto"
                      onClick={() => router.push('/vault/deposit/new')}
                    >
                      Vendi in Contovendita
                    </Button>
                  </Card>
                </>
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

