'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Dispute {
  id: string
  type: string
  status: string
  title: string
  description: string
  photos: string[]
  openedAt: string
  sellerResponseDeadline: string | null
  resolvedAt: string | null
  resolution: string | null
  openedBy: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
  transaction: {
    id: string
    status: string
    userA: { id: string; name: string | null; avatar: string | null }
    userB: { id: string; name: string | null; avatar: string | null }
    proposal?: {
      listing?: {
        title: string
        images: string[]
      }
    }
    escrowPayment?: {
      amount: number
      status: string
    }
  }
  _count: {
    messages: number
  }
}

interface Stats {
  OPEN: number
  SELLER_RESPONSE: number
  IN_MEDIATION: number
  ESCALATED: number
  RESOLVED: number
  CLOSED: number
  total: number
}

type StatusFilter = 'ALL' | 'OPEN' | 'SELLER_RESPONSE' | 'IN_MEDIATION' | 'ESCALATED' | 'RESOLVED' | 'CLOSED'

const STATUS_CONFIG = {
  OPEN: { label: 'Aperta', color: 'bg-yellow-500', icon: 'warning' },
  SELLER_RESPONSE: { label: 'Risposta Seller', color: 'bg-blue-500', icon: 'reply' },
  IN_MEDIATION: { label: 'In Mediazione', color: 'bg-purple-500', icon: 'support_agent' },
  ESCALATED: { label: 'Escalata', color: 'bg-red-500', icon: 'priority_high' },
  RESOLVED: { label: 'Risolta', color: 'bg-green-500', icon: 'check_circle' },
  CLOSED: { label: 'Chiusa', color: 'bg-gray-500', icon: 'lock' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  NOT_DELIVERED: { label: 'Non consegnato', icon: 'local_shipping' },
  DAMAGED_CARDS: { label: 'Carte danneggiate', icon: 'broken_image' },
  WRONG_CONTENT: { label: 'Contenuto errato', icon: 'inventory_2' },
  MISSING_ITEMS: { label: 'Articoli mancanti', icon: 'remove_shopping_cart' },
  CONDITION_MISMATCH: { label: 'Condizione diversa', icon: 'compare' },
  DELAY: { label: 'Ritardo eccessivo', icon: 'schedule' },
  OTHER: { label: 'Altro', icon: 'help_outline' },
}

export default function AdminDisputesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchDisputesRef = useRef(false)

  const fetchDisputes = useCallback(async () => {
    // Prevenire chiamate multiple simultanee
    if (fetchDisputesRef.current) return
    fetchDisputesRef.current = true

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      params.set('page', page.toString())
      params.set('limit', '20')

      const res = await fetch(`/api/disputes?${params}`)
      
      if (res.status === 403) {
        toast({
          title: 'Accesso negato',
          description: 'Non hai i permessi per accedere a questa pagina',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setDisputes(data.disputes || [])
        setStats(data.stats || null)
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Error fetching disputes:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le dispute',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      fetchDisputesRef.current = false
    }
  }, [statusFilter, page, router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user && !loading && !fetchDisputesRef.current) {
      fetchDisputes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading])

  const getDeadlineInfo = (dispute: Dispute) => {
    if (!dispute.sellerResponseDeadline) return null
    const deadline = new Date(dispute.sellerResponseDeadline)
    const now = new Date()
    const isPassed = now > deadline
    const hoursLeft = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)))
    
    return { isPassed, hoursLeft, deadline }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-3">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Caricamento dispute...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-red-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <Link href="/admin" className="hover:text-red-500 transition-colors">Admin</Link>
              <span>/</span>
              <span className="text-red-500">Disputes</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-red-500">gavel</span>
                <div>
                  <h1 className="text-3xl font-bold">Gestione Dispute</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {stats?.total || 0} dispute totali
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setStatusFilter(key as StatusFilter)
                      setPage(1)
                    }}
                    className={`glass-panel p-4 text-center rounded-xl transition-all ${
                      statusFilter === key ? 'ring-2 ring-red-500 shadow-lg' : 'hover:shadow-md'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${config.color.replace('bg-', 'text-')} mb-1`}>
                      {config.icon}
                    </span>
                    <div className="text-2xl font-bold">{stats[key as keyof Stats] || 0}</div>
                    <div className="text-xs text-gray-500 truncate">{config.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Filter Reset */}
            {statusFilter !== 'ALL' && (
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setStatusFilter('ALL')
                    setPage(1)
                  }}
                >
                  <span className="material-symbols-outlined text-sm mr-1">clear</span>
                  Rimuovi filtro ({STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label})
                </Button>
              </div>
            )}

            {/* Disputes List */}
            <div className="space-y-4">
              {disputes.length === 0 ? (
                <Card className="glass-panel p-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">sentiment_satisfied</span>
                  <h3 className="text-xl font-bold mb-2">Nessuna disputa</h3>
                  <p className="text-gray-500">
                    {statusFilter === 'ALL' 
                      ? 'Non ci sono dispute al momento.' 
                      : `Nessuna disputa con stato "${STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label}".`}
                  </p>
                </Card>
              ) : (
                disputes.map((dispute) => {
                  const deadlineInfo = getDeadlineInfo(dispute)
                  const statusConfig = STATUS_CONFIG[dispute.status as keyof typeof STATUS_CONFIG]
                  const typeConfig = TYPE_CONFIG[dispute.type] || TYPE_CONFIG.OTHER

                  return (
                    <Link key={dispute.id} href={`/disputes/${dispute.id}`}>
                      <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-start gap-4">
                          {/* Listing Image */}
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                            {dispute.transaction.proposal?.listing?.images?.[0] ? (
                              <Image
                                src={dispute.transaction.proposal.listing.images[0]}
                                alt={dispute.transaction.proposal.listing.title || 'Listing'}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl text-gray-400">gavel</span>
                              </div>
                            )}
                          </div>

                          {/* Dispute Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <h3 className="font-bold text-lg group-hover:text-red-500 transition-colors truncate">
                                  {dispute.title}
                                </h3>
                                <p className="text-sm text-gray-500">
                                  #{dispute.id.slice(0, 8)} • 
                                  {dispute.transaction.proposal?.listing?.title || `Transazione ${dispute.transaction.id.slice(0, 8)}`}
                                </p>
                              </div>
                              
                              {/* Status Badge */}
                              <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig?.color}/20`}>
                                <span className={`material-symbols-outlined text-sm ${statusConfig?.color.replace('bg-', 'text-')}`}>
                                  {statusConfig?.icon}
                                </span>
                                <span className={statusConfig?.color.replace('bg-', 'text-')}>
                                  {statusConfig?.label}
                                </span>
                              </div>
                            </div>

                            {/* Type & Users */}
                            <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <span className="material-symbols-outlined text-sm">{typeConfig.icon}</span>
                                <span>{typeConfig.label}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500">Aperta da:</span>
                                <span className="font-medium">{dispute.openedBy.name || dispute.openedBy.email}</span>
                              </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              {/* Amount */}
                              {dispute.transaction.escrowPayment && (
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-green-500 text-sm">euro</span>
                                  <span className="font-bold text-green-500">
                                    {dispute.transaction.escrowPayment.amount.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {/* Messages count */}
                              <div className="flex items-center gap-1 text-gray-500">
                                <span className="material-symbols-outlined text-sm">chat</span>
                                <span>{dispute._count.messages} messaggi</span>
                              </div>

                              {/* Deadline */}
                              {deadlineInfo && dispute.status === 'OPEN' && (
                                <div className={`flex items-center gap-1 ${deadlineInfo.isPassed ? 'text-red-500' : 'text-yellow-600'}`}>
                                  <span className="material-symbols-outlined text-sm">timer</span>
                                  <span>
                                    {deadlineInfo.isPassed 
                                      ? 'Scaduta!' 
                                      : `${deadlineInfo.hoursLeft}h rimanenti`}
                                  </span>
                                </div>
                              )}

                              {/* Time ago */}
                              <div className="text-gray-400 text-xs">
                                {formatDistanceToNow(new Date(dispute.openedAt), { addSuffix: true, locale: it })}
                              </div>
                            </div>
                          </div>

                          {/* Arrow */}
                          <span className="material-symbols-outlined text-gray-400 group-hover:text-red-500 transition-colors">
                            chevron_right
                          </span>
                        </div>
                      </Card>
                    </Link>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-500">
                  Pagina {page} di {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

