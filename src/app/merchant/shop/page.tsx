'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUser } from '@/hooks/use-user'
import { useLocale } from '@/contexts/LocaleContext'

export default function MerchantShopPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { t } = useLocale()
  const [shop, setShop] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(true)
  const [stats, setStats] = useState({
    products: 0,
    tournaments: 0,
    transactions: 0,
    orders: 0,
  })

  // Fetch user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setRoleLoading(false)
        return
      }

      try {
        const res = await fetch('/api/user/role')
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.role)
        } else {
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole(null)
      } finally {
        setRoleLoading(false)
      }
    }

    if (!userLoading && user) {
      fetchUserRole()
    } else if (!userLoading && !user) {
      setRoleLoading(false)
    }
  }, [user, userLoading])

  const fetchShop = useCallback(async () => {
    try {
      console.log('🔄 Fetching shop...')
      const res = await fetch('/api/merchant/shop')
      if (res.ok) {
        const data = await res.json()
        console.log('✅ Shop data loaded:', data)
        console.log('🔗 Shop slug:', data.slug)
        setShop(data)
        // Fetch stats
        await fetchStats(data.id)
        setLoading(false)
      } else if (res.status === 404) {
        // Shop doesn't exist - redirect to setup
        console.log('❌ Shop not found, redirecting to setup')
        setLoading(false)
        router.push('/merchant/setup')
        return
      } else {
        console.error('Error fetching shop:', res.status, res.statusText)
        setLoading(false)
      }
    } catch (error) {
      console.error('Error fetching shop:', error)
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    console.log('🔍 useEffect triggered:', { userLoading, user: !!user, roleLoading, userRole })

    // Check if user is authenticated
    if (!userLoading && !user) {
      console.log('❌ No user, redirecting to login')
      router.push('/login')
      return
    }

    // Check role after it's loaded
    if (!roleLoading && userRole && userRole !== 'MERCHANT' && userRole !== 'ADMIN') {
      console.log('❌ Wrong role:', userRole, 'redirecting to apply')
      router.push('/merchant/apply')
      return
    }

    // Fetch shop if user is authenticated and has correct role
    if (!userLoading && !roleLoading && user && (userRole === 'MERCHANT' || userRole === 'ADMIN')) {
      console.log('✅ Conditions met, fetching shop')
      fetchShop()
    }
  }, [user, userLoading, userRole, roleLoading, router, fetchShop])

  const fetchStats = async (shopId: string) => {
    try {
      // Add timeout to prevent hanging
      const timeout = (ms: number) => new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      )

      const fetchWithTimeout = (url: string): Promise<Response> =>
        Promise.race([fetch(url), timeout(5000)])

      const [productsRes, tournamentsRes, transactionsRes, ordersRes] = await Promise.allSettled([
        fetchWithTimeout(`/api/merchant/products?shopId=${shopId}`),
        fetchWithTimeout(`/api/merchant/tournaments`),
        fetchWithTimeout(`/api/merchant/appointments`),
        fetchWithTimeout(`/api/merchant/orders`),
      ])

      const products = (productsRes.status === 'fulfilled' && productsRes.value.ok)
        ? await productsRes.value.json()
        : []
      const tournaments = (tournamentsRes.status === 'fulfilled' && tournamentsRes.value.ok)
        ? await tournamentsRes.value.json()
        : []
      const transactions = (transactionsRes.status === 'fulfilled' && transactionsRes.value.ok)
        ? await transactionsRes.value.json()
        : []
      const ordersData = (ordersRes.status === 'fulfilled' && ordersRes.value.ok)
        ? await ordersRes.value.json()
        : { stats: { total: 0 } }

      setStats({
        products: Array.isArray(products) ? products.length : 0,
        tournaments: Array.isArray(tournaments) ? tournaments.length : 0,
        transactions: Array.isArray(transactions) ? transactions.length : 0,
        orders: ordersData.stats?.total || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
      // Set default stats even on error
      setStats({
        products: 0,
        tournaments: 0,
        transactions: 0,
        orders: 0,
      })
    }
  }

  if (userLoading || loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <div>{t('common.loading')}</div>
          </div>
        </main>
      </div>
    )
  }

  // Show message if shop doesn't exist
  if (!shop && !loading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="glass-panel p-8 max-w-md text-center">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">storefront</span>
            <h2 className="text-2xl font-bold mb-4">Nessun Negozio Trovato</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Devi prima configurare il tuo negozio per accedere a questa sezione.
            </p>
            <Button
              onClick={() => router.push('/merchant/setup')}
              className="bg-primary hover:bg-primary-dark"
            >
              Configura Negozio
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header with Shop Info and Landing Page Link */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold">{shop?.name || t('merchant.shop')}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Gestisci tutti gli aspetti del tuo negozio SafeTrade
                </p>
              </div>
              {shop?.slug && (
                <Link
                  href={`/shops/${shop.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-orange-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all font-semibold text-sm shadow-md"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Visita il mio sito
                </Link>
              )}
            </div>
          </div>

          {/* Shop Landing Page Banner */}
          {shop?.slug && (
            <Card className="glass-panel p-4 mb-8 bg-gradient-to-r from-primary/10 via-orange-500/10 to-purple-500/10 border border-primary/20">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <span className="material-symbols-outlined text-2xl text-primary">storefront</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1">Ecco il tuo sito internet:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-mono text-primary font-semibold">safetrade.com/shops/{shop.slug}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/shops/${shop.slug}`}
                    target="_blank"
                  >
                    <Button size="sm" className="bg-primary hover:bg-primary-dark text-white font-semibold">
                      <span className="material-symbols-outlined mr-1 text-sm">open_in_new</span>
                      Visualizza Sito
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/shops/${shop.slug}`)
                      alert('Link copiato!')
                    }}
                  >
                    <span className="material-symbols-outlined mr-1 text-sm">content_copy</span>
                    Copia Link
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Prodotti</p>
                  <p className="text-3xl font-bold">{stats.products}</p>
                </div>
                <span className="material-symbols-outlined text-4xl text-primary opacity-50">inventory</span>
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tornei</p>
                  <p className="text-3xl font-bold">{stats.tournaments}</p>
                </div>
                <span className="material-symbols-outlined text-4xl text-primary opacity-50">emoji_events</span>
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">SafeTrade</p>
                  <p className="text-3xl font-bold">{stats.transactions}</p>
                </div>
                <span className="material-symbols-outlined text-4xl text-primary opacity-50">verified</span>
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Ordini</p>
                  <p className="text-3xl font-bold">{stats.orders}</p>
                </div>
                <span className="material-symbols-outlined text-4xl text-primary opacity-50">shopping_bag</span>
              </div>
            </Card>
          </div>

          {/* Main Sections */}
          <div className="space-y-8">
            {/* INVENTARIO Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">inventory</span>
                Inventario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/inventory')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">inventory_2</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Gestisci Inventario</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Visualizza e modifica le tue carte</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/inventory/new')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Nuova Inserzione</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Aggiungi una nuova carta</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* SAFETRADE Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">verified</span>
                SafeTrade
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/appointments')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">event</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Appuntamenti</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci appuntamenti SafeTrade</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/orders')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">shopping_bag</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Ordini</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Visualizza tutti gli ordini</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* TORNEI Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">emoji_events</span>
                Tornei
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/tournaments')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">list</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">I Miei Tornei</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci i tuoi tornei</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/tournaments/new')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Nuovo Torneo</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Crea un nuovo torneo</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* PROMOZIONI E OFFERTE Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">local_offer</span>
                Promozioni e Offerte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/promos')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">local_offer</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Promozioni</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gestisci promozioni del negozio</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/offers')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Offerte Esclusive</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Crea offerte speciali</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* IMPOSTAZIONI Section */}
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">settings</span>
                Impostazioni
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/setup')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">storefront</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Configura Negozio</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Modifica informazioni negozio</p>
                    </div>
                  </div>
                </Card>
                <Card className="glass-panel p-6 cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => router.push('/merchant/social')}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">share</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Social Media</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Collega i tuoi social</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Shop Info */}
          {shop && (
            <Card className="glass-panel p-6 mt-8">
              <h2 className="text-2xl font-bold mb-4">Informazioni Negozio</h2>
              {!shop.isApproved && (
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                    <span className="material-symbols-outlined">info</span>
                    <p className="font-medium">Il tuo negozio è in attesa di approvazione da parte dell'amministratore.</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Nome</p>
                  <p className="font-bold">{shop.name}</p>
                </div>
                {shop.address && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Indirizzo</p>
                    <p className="font-bold">{shop.address}</p>
                  </div>
                )}
                {shop.city && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Città</p>
                    <p className="font-bold">{shop.city}</p>
                  </div>
                )}
                {shop.phone && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Telefono</p>
                    <p className="font-bold">{shop.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Stato Approvazione</p>
                  <p className={`font-bold ${shop.isApproved ? 'text-green-500' : 'text-yellow-500'}`}>
                    {shop.isApproved ? 'Approvato' : 'In Attesa'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

