'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useUser } from '@/hooks/use-user'
import { Header } from '@/components/layout/Header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface Deposit {
  id: string
  trackingIn: string | null
  status: string
  createdAt: string
  items: {
    id: string
    status: string
  }[]
}

interface VaultItem {
  id: string
  name: string
  game: string
  set: string | null
  priceFinal: number | null
  status: string
  case: {
    id: string
    label: string | null
  } | null
  slot: {
    id: string
    slotCode: string
  } | null
  photos: string[]
}

interface Stats {
  totalValue: number
  totalItems: number
  totalSales: number
}

export default function VaultDashboardPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [items, setItems] = useState<VaultItem[]>([])
  const [stats, setStats] = useState<Stats>({
    totalValue: 0,
    totalItems: 0,
    totalSales: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authCheckMinElapsed, setAuthCheckMinElapsed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAuthCheckMinElapsed(true), 1800)
    return () => clearTimeout(t)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch deposits
      const depositsRes = await fetch('/api/vault/deposits')
      if (depositsRes.ok) {
        const depositsData = await depositsRes.json()
        setDeposits(depositsData.data || [])
      }

      // Fetch items (only if user ID is available)
      if (!user?.id) return
      const itemsRes = await fetch(`/api/vault/items?ownerId=${user.id}`)
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        const allItems: VaultItem[] = itemsData.data || []
        setItems(allItems)
        
        // Calculate stats
        const totalValue = allItems.reduce((sum: number, item: VaultItem) => 
          sum + (item.priceFinal || 0), 0)
        const totalItems = allItems.length
        // Calculate total sales from items with SOLD status
        const soldItems = allItems.filter((item: VaultItem) => item.status === 'SOLD')
        const totalSales = soldItems.reduce((sum: number, item: VaultItem) => 
          sum + (item.priceFinal || 0), 0)
        
        setStats({
          totalValue,
          totalItems,
          totalSales,
        })
      }
    } catch (err) {
      console.error('Error fetching vault data:', err)
      setError('Errore nel caricamento dei dati. Riprova.')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!userLoading && !user && authCheckMinElapsed) {
      router.push('/login')
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, userLoading, authCheckMinElapsed, router, fetchData])

  const getStatusProgress = (deposit: Deposit) => {
    const statuses = ['CREATED', 'RECEIVED', 'IN_REVIEW', 'ACCEPTED', 'DISTRIBUTED']
    const currentIndex = statuses.indexOf(deposit.status)
    return {
      current: currentIndex + 1,
      total: statuses.length,
      percentage: ((currentIndex + 1) / statuses.length) * 100,
    }
  }

  const getItemStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      IN_CASE: { label: 'In Vault', className: 'bg-green-500/10 text-green-500' },
      LISTED_ONLINE: { label: 'In Vendita', className: 'bg-orange-500/10 text-orange-500' },
      ASSIGNED_TO_SHOP: { label: 'In Transito', className: 'bg-blue-500/10 text-blue-500' },
      SOLD: { label: 'Venduta', className: 'bg-purple-500/10 text-purple-500' },
      PENDING_REVIEW: { label: 'In Revisione', className: 'bg-yellow-500/10 text-yellow-500' },
    }
    return statusMap[status] || { label: status, className: 'bg-gray-500/10 text-gray-500' }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      {/* Vault Sub-Navigation */}
      <div className="border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
              <span className="text-sm font-bold text-primary">SafeVault</span>
            </div>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/vault" className="text-sm font-semibold text-primary border-b-2 border-primary pb-1">
                Dashboard
              </Link>
              <Link href="/vault/deposits" className="text-sm font-medium text-text-primary/60 dark:text-white/60 hover:text-primary transition-colors">
                Depositi
              </Link>
            </nav>
          </div>
          <Button
            onClick={() => router.push('/vault/deposit/new')}
            size="sm"
            className="flex items-center gap-2 bg-primary text-white rounded-full font-bold text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Nuovo Deposito
          </Button>
        </div>
      </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
              <button onClick={() => { setError(null); fetchData() }} className="ml-auto text-red-500 hover:text-red-700 font-bold text-xs">
                Riprova
              </button>
            </div>
          )}
          {/* Stats Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="glass-panel p-8 rounded-xl shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                </div>
                <span className="material-symbols-outlined text-primary/40 text-lg">account_balance</span>
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                Valore nel Vault
              </h3>
              <p className="text-3xl font-black mt-1">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="glass-panel p-8 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                  <span className="material-symbols-outlined text-2xl">style</span>
                </div>
                <span className="material-symbols-outlined text-blue-400/40 text-lg">style</span>
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                Carte Depositate
              </h3>
              <p className="text-3xl font-black mt-1">{stats.totalItems}</p>
            </div>

            {/* Stat Card 3 */}
            <div className="glass-panel p-8 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <span className="material-symbols-outlined text-2xl">payments</span>
                </div>
                <span className="material-symbols-outlined text-emerald-400/40 text-lg">payments</span>
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                Vendite Totali
              </h3>
              <p className="text-3xl font-black mt-1">€{stats.totalSales.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>
          </section>

          {/* Deposits Table Section */}
          <section className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
              <h2 className="text-lg font-bold">I miei Depositi</h2>
              <Link href="/vault/deposits" className="text-primary text-sm font-bold hover:underline">
                Vedi tutti
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">ID Deposito</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Data</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-gray-400">Avanzamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {deposits.slice(0, 5).map((deposit) => {
                    const progress = getStatusProgress(deposit)
                    return (
                      <tr key={deposit.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-6 font-mono font-bold text-sm text-primary">
                          #{deposit.id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-6 text-sm opacity-70">
                          {new Date(deposit.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center flex-1 max-w-md relative">
                            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 dark:bg-zinc-700 -translate-y-1/2 z-0"></div>
                            <div
                              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 z-0"
                              style={{ width: `${progress.percentage}%` }}
                            ></div>
                            {['Creato', 'Ricevuto', 'Revisionato', 'Assegnato'].map((label, idx) => (
                              <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
                                <div
                                  className={`w-4 h-4 rounded-full border-4 border-white dark:border-zinc-900 shadow-sm ${
                                    idx < progress.current ? 'bg-primary' : 'bg-gray-200 dark:bg-zinc-700'
                                  }`}
                                ></div>
                                <span
                                  className={`text-[10px] mt-2 font-bold uppercase ${
                                    idx < progress.current ? 'text-primary' : 'opacity-60'
                                  }`}
                                >
                                  {label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {deposits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                        Nessun deposito trovato
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cards Grid Section */}
          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                Le mie Carte
                <span className="text-xs font-normal bg-gray-100 dark:bg-zinc-800 px-3 py-1 rounded-full opacity-60">
                  Recenti
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.slice(0, 4).map((item) => {
                const statusBadge = getItemStatusBadge(item.status)
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 overflow-hidden group hover:shadow-xl transition-all hover:-translate-y-1"
                  >
                    <div className="aspect-[3/4] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                      {item.photos && item.photos.length > 0 ? (
                        <Image
                          src={item.photos[0]}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="material-symbols-outlined text-4xl text-gray-300">style</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-sm truncate">{item.name}</h3>
                        <p className="text-xs opacity-50">{item.set || item.game}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-zinc-800">
                        <div className="flex items-center gap-1.5 opacity-60">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          <span className="text-[10px] font-bold">
                            {item.case && item.slot
                              ? `${item.case.label || 'CASE'}, ${item.slot.slotCode}`
                              : 'Non assegnato'}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && (
                <div className="col-span-4 text-center py-12 text-gray-500">
                  Nessuna carta nel vault
                </div>
              )}
            </div>
          </section>
        </main>
    </div>
  )
}

