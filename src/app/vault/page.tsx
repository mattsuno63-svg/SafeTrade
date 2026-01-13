'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/hooks/use-user'
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

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, userLoading, router])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch deposits
      const depositsRes = await fetch('/api/vault/deposits')
      if (depositsRes.ok) {
        const depositsData = await depositsRes.json()
        setDeposits(depositsData.data || [])
      }

      // Fetch items
      const itemsRes = await fetch('/api/vault/items?ownerId=' + user?.id)
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        setItems(itemsData.data || [])
        
        // Calculate stats
        const totalValue = itemsData.data?.reduce((sum: number, item: VaultItem) => 
          sum + (item.priceFinal || 0), 0) || 0
        const totalItems = itemsData.data?.length || 0
        
        setStats({
          totalValue,
          totalItems,
          totalSales: 0, // TODO: fetch from sales
        })
      }
    } catch (error) {
      console.error('Error fetching vault data:', error)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-[#1d130c] dark:text-gray-100">
      <div className="relative w-full h-full">
        {/* Grid Pattern Background */}
        <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none -z-10" 
          style={{
            backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Header */}
        <header className="sticky top-0 z-50 liquid-glass border-b border-white/20 px-6 py-4">
          <div className="max-w-[1440px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <span className="text-3xl">🛡️</span>
                </div>
                <h1 className="text-xl font-extrabold tracking-tight">
                  SafeTrade <span className="font-light opacity-70 text-sm align-top">VAULT</span>
                </h1>
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/vault" className="text-sm font-semibold text-primary border-b-2 border-primary pb-1">
                  Dashboard
                </Link>
                <Link href="/vault/items" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
                  Inventario
                </Link>
                <Link href="/vault/deposits" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
                  Depositi
                </Link>
                <Link href="/vault/sales" className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
                  Vendite
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative hidden lg:block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                <input
                  className="bg-white/50 dark:bg-black/20 border-none rounded-full pl-10 pr-4 py-2 w-64 focus:ring-2 focus:ring-primary/50 text-sm"
                  placeholder="Cerca nel vault..."
                  type="text"
                />
              </div>
              <Button
                onClick={() => router.push('/vault/deposits/new')}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-xl shadow-primary/30 hover:scale-105 transition-transform active:scale-95"
              >
                <span>➕</span>
                Nuovo Deposito
              </Button>
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden">
                <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto p-6 space-y-8">
          {/* Stats Section */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="liquid-glass p-8 rounded-xl shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                  <span className="text-2xl">💰</span>
                </div>
                <span className="text-green-500 text-sm font-bold flex items-center gap-1">
                  <span>📈</span> +5.2%
                </span>
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                Valore nel Vault
              </h3>
              <p className="text-3xl font-black mt-1">€{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
            </div>

            {/* Stat Card 2 */}
            <div className="liquid-glass p-8 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
                  <span className="text-2xl">🃏</span>
                </div>
                <span className="text-blue-500 text-sm font-bold flex items-center gap-1">
                  <span>➕</span> {stats.totalItems}
                </span>
              </div>
              <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">
                Carte Depositate
              </h3>
              <p className="text-3xl font-black mt-1">{stats.totalItems}</p>
            </div>

            {/* Stat Card 3 */}
            <div className="liquid-glass p-8 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <span className="text-2xl">💳</span>
                </div>
                <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                  <span>📈</span> +8.4%
                </span>
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
                        <img
                          src={item.photos[0]}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <span className="text-4xl">🃏</span>
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
                          <span className="text-sm">📍</span>
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

        {/* Footer */}
        <footer className="max-w-[1440px] mx-auto p-12 text-center opacity-30 text-xs uppercase tracking-widest font-bold">
          SafeTrade Security Systems © 2024 • Liquid Glass UI 26.1
        </footer>
      </div>
    </div>
  )
}

