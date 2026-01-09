'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Transaction {
  id: string
  status: string
  createdAt: string
  scheduledDate: string | null
  priorityTier: string
  proposal: {
    id: string
    listing: {
      id: string
      title: string
      price: number | null
      images: string[]
    }
  } | null
  userA: {
    id: string
    email: string
    name: string | null
  }
  userB: {
    id: string
    email: string
    name: string | null
  }
  shop: {
    id: string
    name: string
  } | null
}

interface Pagination {
  total: number
  pages: number
  page: number
  limit: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In Attesa', color: 'bg-yellow-500' },
  AWAITING_MEETUP: { label: 'In Attesa Meetup', color: 'bg-blue-500' },
  IN_PROGRESS: { label: 'In Corso', color: 'bg-purple-500' },
  VERIFICATION: { label: 'Verifica', color: 'bg-indigo-500' },
  COMPLETED: { label: 'Completata', color: 'bg-green-500' },
  CANCELLED: { label: 'Annullata', color: 'bg-red-500' },
  DISPUTED: { label: 'Contestata', color: 'bg-orange-500' },
  REFUNDED: { label: 'Rimborsata', color: 'bg-gray-500' },
}

export default function AdminTransactionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }
    
    if (currentUser) {
      fetchTransactions()
    }
  }, [currentUser, userLoading, statusFilter, page])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/transactions?${params}`)
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions)
        setPagination(data.pagination)
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-500' }
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
  }

  const totalAmount = transactions.reduce((sum, t) => sum + (t.proposal?.listing?.price || 0), 0)
  const totalFees = 0 // Fee calcolata dinamicamente

  if (userLoading || (loading && transactions.length === 0)) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Caricamento...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-purple-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href="/admin" className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <h1 className="text-3xl font-bold">Transazioni SafeTrade</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {pagination?.total || 0} transazioni totali
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-panel p-4">
                <div className="text-sm text-gray-500 mb-1">Completate</div>
                <div className="text-2xl font-bold text-green-500">{stats.COMPLETED || 0}</div>
              </Card>
              <Card className="glass-panel p-4">
                <div className="text-sm text-gray-500 mb-1">In Corso</div>
                <div className="text-2xl font-bold text-blue-500">
                  {(stats.PENDING || 0) + (stats.AWAITING_MEETUP || 0) + (stats.IN_PROGRESS || 0)}
                </div>
              </Card>
              <Card className="glass-panel p-4">
                <div className="text-sm text-gray-500 mb-1">Volume Totale</div>
                <div className="text-2xl font-bold">€{totalAmount.toFixed(2)}</div>
              </Card>
              <Card className="glass-panel p-4">
                <div className="text-sm text-gray-500 mb-1">Fee Piattaforma</div>
                <div className="text-2xl font-bold text-primary">€{totalFees.toFixed(2)}</div>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti gli stati</SelectItem>
                  <SelectItem value="PENDING">In Attesa</SelectItem>
                  <SelectItem value="AWAITING_MEETUP">In Attesa Meetup</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Corso</SelectItem>
                  <SelectItem value="VERIFICATION">Verifica</SelectItem>
                  <SelectItem value="COMPLETED">Completata</SelectItem>
                  <SelectItem value="CANCELLED">Annullata</SelectItem>
                  <SelectItem value="DISPUTED">Contestata</SelectItem>
                  <SelectItem value="REFUNDED">Rimborsata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions List */}
            {transactions.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">receipt_long</span>
                <h3 className="text-xl font-bold mb-2">Nessuna transazione</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Non ci sono transazioni da mostrare
                </p>
              </Card>
            ) : (
              <Card className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Listing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Buyer / Seller
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Negozio
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Importo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Appuntamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {tx.proposal?.listing?.images?.[0] && (
                                <img
                                  src={tx.proposal.listing.images[0]}
                                  alt=""
                                  className="w-10 h-10 rounded object-cover mr-3"
                                />
                              )}
                              <div className="max-w-[200px]">
                                <div className="font-medium truncate">{tx.proposal?.listing?.title || 'N/A'}</div>
                                <div className="text-sm text-gray-500">ID: {tx.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-blue-500">person</span>
                                <span className="truncate max-w-[120px]">{tx.userA.name || tx.userA.email}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <span className="material-symbols-outlined text-sm text-green-500">person</span>
                                <span className="truncate max-w-[120px]">{tx.userB.name || tx.userB.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {tx.shop ? (
                              <span className="font-medium">{tx.shop.name}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold">€{(tx.proposal?.listing?.price || 0).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{tx.priorityTier}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(tx.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {tx.scheduledDate ? new Date(tx.scheduledDate).toLocaleDateString('it-IT') : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(tx.createdAt).toLocaleDateString('it-IT')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Pagina {pagination.page} di {pagination.pages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Precedente
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === pagination.pages}
                        onClick={() => setPage(page + 1)}
                      >
                        Successiva
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

