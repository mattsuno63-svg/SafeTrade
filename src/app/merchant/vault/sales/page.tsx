'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, DollarSign, TrendingUp, Package } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface VaultSale {
  id: string
  soldPrice: number
  soldAt: string
  proofImage: string | null
  item: {
    id: string
    name: string
    game: string
    set: string | null
    photos: string[]
    owner: {
      id: string
      name: string | null
      email: string
    }
  }
  splits: {
    id: string
    grossAmount: number
    ownerAmount: number
    merchantAmount: number
    platformAmount: number
    status: string
    eligibleAt: string | null
  }[]
}

interface SalesStats {
  totalSales: number
  totalRevenue: number
  totalOwnerAmount: number
  totalMerchantAmount: number
  totalPlatformAmount: number
}

export default function MerchantVaultSalesPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [sales, setSales] = useState<VaultSale[]>([])
  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalOwnerAmount: 0,
    totalMerchantAmount: 0,
    totalPlatformAmount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedSale, setSelectedSale] = useState<VaultSale | null>(null)
  const [filters, setFilters] = useState({
    game: null as string | null,
    period: '30days' as 'today' | '7days' | '30days' | 'all',
  })

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchSales()
    }
  }, [user, userLoading, router, filters])

  const fetchSales = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on period
      let startDate: string | null = null
      const today = new Date()
      if (filters.period === 'today') {
        startDate = today.toISOString().split('T')[0]
      } else if (filters.period === '7days') {
        const date = new Date(today)
        date.setDate(date.getDate() - 7)
        startDate = date.toISOString().split('T')[0]
      } else if (filters.period === '30days') {
        const date = new Date(today)
        date.setDate(date.getDate() - 30)
        startDate = date.toISOString().split('T')[0]
      }

      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (filters.game) params.append('game', filters.game)

      const res = await fetch(`/api/vault/merchant/sales?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSales(data.data || [])
        setStats(data.stats || {
          totalSales: 0,
          totalRevenue: 0,
          totalOwnerAmount: 0,
          totalMerchantAmount: 0,
          totalPlatformAmount: 0,
        })
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PAID: { label: 'Pagato', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      ELIGIBLE: { label: 'Disponibile', className: 'bg-accent-orange/20 text-accent-orange border-accent-orange/30' },
      PENDING: { label: 'In Attesa', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      IN_PAYOUT: { label: 'In Payout', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      REVERSED: { label: 'Fallito', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    }
    return statusMap[status] || { label: status, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
                  onClick={() => router.push('/merchant/vault/scan')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Scan Hub
                </button>
                <button className="text-sm font-semibold border-b-2 border-primary text-primary pb-1">Vendite</button>
                <button
                  onClick={() => router.push('/merchant/vault/statement')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Statement
                </button>
              </nav>
            </div>
            <div className="flex items-center gap-6">
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
                Vendite{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-orange">
                  Fisiche
                </span>
              </h1>
              <p className="text-lg text-[#5a848c] dark:text-[#a0b0b3] font-medium">
                Gestisci e monitora tutte le vendite in-store del tuo Vault.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => router.push('/merchant/vault/scan')}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:shadow-lg hover:shadow-primary/30 rounded-xl font-bold transition-all"
              >
                <span>💰</span>
                Nuova Vendita
              </Button>
            </div>
          </div>

          {/* Sales Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Stat Card 1 - Total Sales */}
            <div className="glass p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 size-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all"></div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5a848c]">Vendite Totali</span>
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{stats.totalSales}</span>
                  <span className="text-sm font-medium opacity-60">vendite</span>
                </div>
              </div>
            </div>

            {/* Stat Card 2 - Total Revenue */}
            <div className="glass p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 size-32 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all"></div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5a848c]">Ricavi Totali</span>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">
                    €{stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Stat Card 3 - Merchant Commission */}
            <div className="glass p-6 rounded-xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 size-32 bg-accent-orange/10 rounded-full blur-3xl group-hover:bg-accent-orange/20 transition-all"></div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5a848c]">Tua Commissione</span>
                  <DollarSign className="h-5 w-5 text-accent-orange" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">
                    €{stats.totalMerchantAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-medium opacity-60">20%</span>
                </div>
              </div>
            </div>

            {/* Stat Card 4 - Owner Payout */}
            <div className="glass p-6 rounded-xl relative overflow-hidden group border-r-4 border-r-primary">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#5a848c]">Payout Proprietari</span>
                  <span className="text-primary">💳</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">
                    €{stats.totalOwnerAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-medium opacity-60">70%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <span className="text-primary">🔍</span>
              <h2 className="text-xl font-bold tracking-tight">Filtri</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => setFilters({ ...filters, period: 'today' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.period === 'today' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Oggi
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, period: '7days' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.period === '7days' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Ultimi 7 Giorni
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, period: '30days' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.period === '30days' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Ultimi 30 Giorni
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, period: 'all' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.period === 'all' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Tutto
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, game: filters.game === 'Pokemon' ? null : 'Pokemon' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.game === 'Pokemon' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Pokémon {filters.game === 'Pokemon' && <span>✕</span>}
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, game: filters.game === 'Magic' ? null : 'Magic' })}
                className={`flex items-center gap-2 px-5 py-2.5 glass rounded-xl text-sm font-bold transition-all ${
                  filters.game === 'Magic' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-primary hover:text-white'
                }`}
              >
                Magic {filters.game === 'Magic' && <span>✕</span>}
              </Button>
            </div>
          </div>

          {/* Sales List */}
          <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-black/5">
            {sales.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-[#5a848c] opacity-40" />
                <h3 className="text-xl font-bold mb-2">Nessuna vendita trovata</h3>
                <p className="text-[#5a848c] dark:text-[#a0b0b3] mb-6">
                  Non ci sono vendite fisiche registrate nel periodo selezionato.
                </p>
                <Button
                  onClick={() => router.push('/merchant/vault/scan')}
                  className="bg-primary text-white hover:shadow-lg hover:shadow-primary/30 rounded-xl font-bold"
                >
                  Registra Prima Vendita
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-primary/5 border-b border-primary/10">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Data</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Carta</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Game</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Prezzo Vendita</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Tua Commissione (20%)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Proprietario (70%)</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Status Split</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {sales.map((sale) => {
                      const latestSplit = sale.splits[sale.splits.length - 1]
                      const statusBadge = getStatusBadge(latestSplit?.status || 'PENDING')
                      return (
                        <tr
                          key={sale.id}
                          className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                          onClick={() => setSelectedSale(sale)}
                        >
                          <td className="px-6 py-5 text-sm font-medium">{formatDate(sale.soldAt)}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              {sale.item.photos && sale.item.photos.length > 0 && (
                                <div className="size-12 rounded-lg overflow-hidden bg-white/5">
                                  <Image
                                    src={sale.item.photos[0]}
                                    alt={sale.item.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-bold">{sale.item.name}</p>
                                {sale.item.set && <p className="text-xs opacity-60">{sale.item.set}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm">{sale.item.game}</td>
                          <td className="px-6 py-5">
                            <span className="font-bold text-lg">
                              €{sale.soldPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-bold text-accent-orange">
                              €{latestSplit?.merchantAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-bold text-primary">
                              €{latestSplit?.ownerAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                          </td>
                          <td className="px-6 py-5">
                            <Button
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSale(sale)
                              }}
                            >
                              Dettagli →
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>

        {/* Sale Detail Modal */}
        {selectedSale && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedSale(null)}
          >
            <Card
              className="glass max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="border-b border-white/10">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-2xl font-bold">Dettaglio Vendita</CardTitle>
                  <Button variant="ghost" onClick={() => setSelectedSale(null)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Item Info */}
                <div className="flex gap-6">
                  {selectedSale.item.photos && selectedSale.item.photos.length > 0 && (
                    <div className="size-32 rounded-xl overflow-hidden bg-white/5 shrink-0">
                      <Image
                        src={selectedSale.item.photos[0]}
                        alt={selectedSale.item.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-2">{selectedSale.item.name}</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-bold">Game:</span> {selectedSale.item.game}
                      </p>
                      {selectedSale.item.set && (
                        <p>
                          <span className="font-bold">Set:</span> {selectedSale.item.set}
                        </p>
                      )}
                      <p>
                        <span className="font-bold">Proprietario:</span> {selectedSale.item.owner.name || selectedSale.item.owner.email}
                      </p>
                      <p>
                        <span className="font-bold">Data Vendita:</span> {formatDate(selectedSale.soldAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Proof Image */}
                {selectedSale.proofImage && (
                  <div>
                    <h4 className="font-bold mb-2">Foto Prova Vendita</h4>
                    <div className="rounded-xl overflow-hidden bg-white/5">
                      <Image
                        src={selectedSale.proofImage}
                        alt="Proof"
                        width={600}
                        height={400}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}

                {/* Split Details */}
                {selectedSale.splits.length > 0 && (
                  <div>
                    <h4 className="font-bold mb-4">Split Ricavi</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-4 glass rounded-xl">
                        <span className="font-bold">Prezzo Vendita:</span>
                        <span className="text-xl font-black">
                          €{selectedSale.soldPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      {selectedSale.splits.map((split) => (
                        <div key={split.id} className="space-y-2">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 glass rounded-xl">
                              <p className="text-xs font-bold uppercase tracking-wider text-[#5a848c] mb-1">Proprietario (70%)</p>
                              <p className="text-xl font-black text-primary">
                                €{split.ownerAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="p-4 glass rounded-xl">
                              <p className="text-xs font-bold uppercase tracking-wider text-[#5a848c] mb-1">Merchant (20%)</p>
                              <p className="text-xl font-black text-accent-orange">
                                €{split.merchantAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="p-4 glass rounded-xl">
                              <p className="text-xs font-bold uppercase tracking-wider text-[#5a848c] mb-1">Platform (10%)</p>
                              <p className="text-xl font-black">
                                €{split.platformAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-4 glass rounded-xl">
                            <span className="font-bold">Status:</span>
                            <Badge className={getStatusBadge(split.status).className}>
                              {getStatusBadge(split.status).label}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

