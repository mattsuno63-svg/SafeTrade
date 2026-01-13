'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface Split {
  id: string
  grossAmount: number
  merchantAmount: number
  ownerAmount: number
  platformAmount: number
  status: string
  createdAt: string
  item: {
    id: string
    name: string
    game: string
    set: string | null
    photos: string[]
  }
  sourceType: 'ORDER' | 'SALE'
}

interface Stats {
  totalRevenue: number
  pendingPayout: number
  platformFees: number
}

export default function MerchantVaultStatementPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [splits, setSplits] = useState<Split[]>([])
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    pendingPayout: 0,
    platformFees: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    period: '30days',
    game: null as string | null,
  })

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchData()
    }
  }, [user, userLoading, router, filters])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/vault/payouts?type=merchant')
      if (res.ok) {
        const data = await res.json()
        setSplits(data.data?.splits || [])
        
        // Calculate stats
        const totalRevenue = data.data?.splits?.reduce((sum: number, split: Split) => 
          sum + split.merchantAmount, 0) || 0
        const pendingPayout = data.data?.splits?.filter((s: Split) => 
          s.status === 'ELIGIBLE' || s.status === 'PENDING').reduce((sum: number, split: Split) => 
          sum + split.merchantAmount, 0) || 0
        const platformFees = data.data?.splits?.reduce((sum: number, split: Split) => 
          sum + split.platformAmount, 0) || 0
        
        setStats({ totalRevenue, pendingPayout, platformFees })
      }
    } catch (error) {
      console.error('Error fetching statement data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PAID: { label: 'Pagato', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      ELIGIBLE: { label: 'Pendente', className: 'bg-accent-orange/10 text-accent-orange dark:bg-accent-orange/20' },
      PENDING: { label: 'Pendente', className: 'bg-accent-orange/10 text-accent-orange dark:bg-accent-orange/20' },
      IN_PAYOUT: { label: 'In Payout', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      REVERSED: { label: 'Fallito', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    }
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen font-display bg-background-light dark:bg-background-dark text-[#101719] dark:text-white transition-colors duration-300">
      {/* Background Grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(40, 122, 138, 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative flex h-full min-h-screen w-full flex-col overflow-x-hidden">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/10 px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3">
                <div className="size-9 bg-primary flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
                  <span>🛡️</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  SafeTrade <span className="text-primary">Vault</span>
                </h2>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <button
                  onClick={() => router.push('/merchant/vault')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/merchant/vault')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Inventory
                </button>
                <button className="text-sm font-semibold border-b-2 border-primary text-primary pb-1">Statement</button>
                <button className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">Settings</button>
              </nav>
            </div>
            <div className="flex items-center gap-6">
              <div className="relative group hidden sm:block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60">🔍</span>
                <input
                  className="bg-white/40 dark:bg-white/5 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary w-64 glass"
                  placeholder="Search sales..."
                  type="text"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 glass rounded-xl hover:bg-white/80 transition-all">🔔</button>
                <div className="h-10 w-10 rounded-full border-2 border-accent-orange p-0.5">
                  <div className="h-full w-full rounded-full bg-primary/20 flex items-center justify-center">
                    <span>👤</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-10 max-w-7xl mx-auto w-full space-y-8">
          {/* Page Heading */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#101719] dark:text-white">
                Estratto Conto{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-orange">
                  Merchant
                </span>
              </h1>
              <p className="text-lg text-[#5a848c] dark:text-[#a0b0b3] font-medium">
                Gestisci e monitora le tue vendite nel Vault Liquid Glass.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button className="flex items-center gap-2 px-6 py-3 bg-white/60 dark:bg-white/10 hover:bg-white border border-white/20 rounded-xl font-bold transition-all glass">
                <span>📥</span>
                Export CSV
              </Button>
              <Button className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:shadow-lg hover:shadow-primary/30 rounded-xl font-bold transition-all">
                <span>💳</span>
                Request Payout
              </Button>
            </div>
          </div>

          {/* Financial Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stat Card 1 */}
            <div className="glass p-8 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 size-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#5a848c]">Entrate Totali</span>
                  <span className="text-primary">📈</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">
                    €{stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-green-500">+12.4%</span>
                </div>
              </div>
            </div>

            {/* Stat Card 2 */}
            <div className="glass p-8 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 size-32 bg-accent-orange/10 rounded-full blur-3xl group-hover:bg-accent-orange/20 transition-all"></div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#5a848c]">Payout Pendenti</span>
                  <span className="text-accent-orange">⏳</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">
                    €{stats.pendingPayout.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-accent-orange">
                    {splits.filter((s) => s.status === 'ELIGIBLE' || s.status === 'PENDING').length} transazioni
                  </span>
                </div>
              </div>
            </div>

            {/* Stat Card 3 */}
            <div className="glass p-8 rounded-xl relative overflow-hidden group border-r-4 border-r-primary">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#5a848c]">Commissioni SafeTrade</span>
                  <span className="text-primary">💼</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">
                    €{stats.platformFees.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-medium opacity-60">Avg. 10%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <span className="text-primary">🔍</span>
              <h2 className="text-xl font-bold tracking-tight">Filtri di Ricerca</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setFilters({ ...filters, period: '30days' })}
                className="flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all"
              >
                Ultimi 30 Giorni <span>▼</span>
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, game: filters.game === 'Pokemon' ? null : 'Pokemon' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.game === 'Pokemon' ? 'bg-primary/10 border-primary/20' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Pokémon TCG {filters.game === 'Pokemon' && <span>✕</span>}
              </Button>
              <Button className="flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all">
                Magic: The Gathering <span>▼</span>
              </Button>
              <Button className="flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all">
                Lorcana <span>▼</span>
              </Button>
            </div>
          </div>

          {/* Statement Table */}
          <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-black/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary/5 border-b border-primary/10">
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Data</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Item</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Prezzo Vendita</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Negozio (20%)</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Proprietario (70%)</th>
                    <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Status Payout</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {splits.map((split) => {
                    const statusBadge = getStatusBadge(split.status)
                    return (
                      <tr key={split.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5 text-sm font-medium">
                          {new Date(split.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {split.item.photos && split.item.photos.length > 0 && (
                              <div className="relative size-10 rounded-lg bg-slate-200 overflow-hidden">
                                <Image
                                  alt="Card preview"
                                  className="object-cover"
                                  src={split.item.photos[0]}
                                  fill
                                  sizes="40px"
                                />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-bold">{split.item.name}</p>
                              <p className="text-xs text-[#5a848c]">{split.item.set || split.item.game}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-bold">
                          €{split.grossAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 font-medium text-primary">
                          €{split.merchantAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5 font-medium">
                          €{split.ownerAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusBadge.className}`}>
                            <span className="size-1.5 rounded-full bg-current"></span> {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-primary/10 rounded-lg transition-all">
                            <span className="text-primary">→</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {splits.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        Nessuna vendita trovata
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between glass border-t border-primary/10">
              <p className="text-sm text-[#5a848c] font-medium">
                Mostrando <span className="text-[#101719] dark:text-white font-bold">1-{splits.length}</span> di{' '}
                <span className="text-[#101719] dark:text-white font-bold">{splits.length}</span> vendite
              </p>
              <div className="flex items-center gap-2">
                <button className="p-2 glass rounded-lg opacity-50 cursor-not-allowed">←</button>
                <button className="px-3 py-1 bg-primary text-white rounded-lg text-sm font-bold">1</button>
                <button className="p-2 glass rounded-lg hover:bg-white">→</button>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-8 py-10 border-t border-primary/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
            <div className="flex items-center gap-2">
              <span className="text-primary">🔒</span>
              <p className="text-xs font-medium">Vault Assets insured by Lloyd's of London up to €10M</p>
            </div>
            <div className="flex gap-8 text-xs font-bold">
              <a className="hover:text-primary transition-colors" href="#">
                Privacy Policy
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Terms of Service
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                Help Center
              </a>
            </div>
            <p className="text-xs">© 2024 SafeTrade Vault Merchant Dashboard. Liquid Glass v26.1</p>
          </div>
        </footer>
      </div>
    </div>
  )
}

