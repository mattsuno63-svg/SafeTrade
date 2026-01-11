'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface PendingRelease {
  id: string
  type: string
  amount: number
  status: string
  reason: string | null
  triggeredBy: string | null
  createdAt: string
  recipient: {
    id: string
    name: string | null
    email: string
  }
  order: {
    id: string
    status: string
    userA: { id: string; name: string | null; email: string }
    userB: { id: string; name: string | null; email: string }
    hub: { id: string; name: string } | null
    shop: { id: string; name: string } | null
  } | null
  dispute: {
    id: string
    type: string
    status: string
    title: string
  } | null
  approvedBy: { id: string; name: string | null; email: string } | null
  rejectedBy: { id: string; name: string | null; email: string } | null
}

interface Stats {
  pending: number
  approved: number
  rejected: number
  expired: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  RELEASE_TO_SELLER: { label: 'Rilascio Venditore', color: 'bg-green-500', icon: 'sell' },
  REFUND_FULL: { label: 'Rimborso Totale', color: 'bg-red-500', icon: 'undo' },
  REFUND_PARTIAL: { label: 'Rimborso Parziale', color: 'bg-orange-500', icon: 'price_change' },
  HUB_COMMISSION: { label: 'Commissione Hub', color: 'bg-purple-500', icon: 'hub' },
  WITHDRAWAL: { label: 'Prelievo', color: 'bg-blue-500', icon: 'account_balance_wallet' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In Attesa', color: 'bg-yellow-500' },
  APPROVED: { label: 'Approvato', color: 'bg-green-500' },
  REJECTED: { label: 'Rifiutato', color: 'bg-red-500' },
  EXPIRED: { label: 'Scaduto', color: 'bg-gray-500' },
}

export default function AdminPendingReleasesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()
  
  const [pendingReleases, setPendingReleases] = useState<PendingRelease[]>([])
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0, expired: 0 })
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  // Modal states
  const [selectedRelease, setSelectedRelease] = useState<PendingRelease | null>(null)
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [confirmationStep, setConfirmationStep] = useState<'initial' | 'confirm'>('initial')
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Ref per tracciare se il fetch iniziale è stato fatto
  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchPendingReleases = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    if (isInitial && hasFetchedRef.current) return
    
    isFetchingRef.current = true
    setLoading(true)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: statusFilter,
      })
      if (typeFilter !== 'ALL') params.set('type', typeFilter)

      const res = await fetch(`/api/admin/pending-releases?${params}`)
      if (res.status === 403) {
        toast({
          title: 'Accesso Negato',
          description: 'Solo Admin e Moderator possono accedere a questa pagina.',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingReleases(data.items)
        setStats(data.stats)
        setPagination(data.pagination)
        if (isInitial) hasFetchedRef.current = true
      }
    } catch (error) {
      console.error('Error fetching pending releases:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le richieste pendenti.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [page, statusFilter, typeFilter, router, toast])

  // Effect per il fetch iniziale
  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }
    
    if (currentUser && !userLoading) {
      fetchPendingReleases(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, userLoading])

  // Effect per cambio filtri/pagina
  useEffect(() => {
    if (hasFetchedRef.current && currentUser) {
      fetchPendingReleases(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, page])

  // STEP 1: Inizia approvazione (genera token)
  const handleInitiateApproval = async (release: PendingRelease) => {
    setSelectedRelease(release)
    setConfirmationStep('initial')
    setApprovalNotes('')
    setApprovalModalOpen(true)
    setProcessing(true)

    try {
      const res = await fetch(`/api/admin/pending-releases/${release.id}/initiate-approval`, {
        method: 'POST',
      })

      if (res.ok) {
        const data = await res.json()
        setConfirmationToken(data.confirmation_token)
        setTokenExpiresAt(new Date(data.expires_at))
        setConfirmationStep('confirm')
      } else {
        const error = await res.json()
        toast({
          title: 'Errore',
          description: error.error || 'Impossibile iniziare l\'approvazione.',
          variant: 'destructive',
        })
        setApprovalModalOpen(false)
      }
    } catch (error) {
      console.error('Error initiating approval:', error)
      toast({
        title: 'Errore',
        description: 'Errore di connessione.',
        variant: 'destructive',
      })
      setApprovalModalOpen(false)
    } finally {
      setProcessing(false)
    }
  }

  // STEP 2: Conferma approvazione (doppio click)
  const handleConfirmApproval = async () => {
    if (!selectedRelease || !confirmationToken) return

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/pending-releases/${selectedRelease.id}/confirm-approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation_token: confirmationToken,
          notes: approvalNotes || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast({
          title: '✅ Approvato!',
          description: data.message,
        })
        setApprovalModalOpen(false)
        fetchPendingReleases() // Refresh lista
      } else {
        const error = await res.json()
        toast({
          title: 'Errore',
          description: error.error || 'Impossibile completare l\'approvazione.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error confirming approval:', error)
      toast({
        title: 'Errore',
        description: 'Errore di connessione.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // Rifiuta richiesta
  const handleReject = async () => {
    if (!selectedRelease) return

    if (!rejectReason.trim()) {
      toast({
        title: 'Motivo richiesto',
        description: 'Inserisci un motivo per il rifiuto.',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/pending-releases/${selectedRelease.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })

      if (res.ok) {
        toast({
          title: 'Rifiutato',
          description: 'La richiesta è stata rifiutata.',
        })
        setRejectModalOpen(false)
        fetchPendingReleases()
      } else {
        const error = await res.json()
        toast({
          title: 'Errore',
          description: error.error || 'Impossibile rifiutare la richiesta.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error rejecting:', error)
      toast({
        title: 'Errore',
        description: 'Errore di connessione.',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const openRejectModal = (release: PendingRelease) => {
    setSelectedRelease(release)
    setRejectReason('')
    setRejectModalOpen(true)
  }

  const getTypeBadge = (type: string) => {
    const info = TYPE_LABELS[type] || { label: type, color: 'bg-gray-500', icon: 'help' }
    return (
      <Badge className={`${info.color} flex items-center gap-1`}>
        <span className="material-symbols-outlined text-sm">{info.icon}</span>
        {info.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-500' }
    return <Badge className={info.color}>{info.label}</Badge>
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays} giorn${diffDays === 1 ? 'o' : 'i'} fa`
    if (diffHours > 0) return `${diffHours} or${diffHours === 1 ? 'a' : 'e'} fa`
    return 'Poco fa'
  }

  if (userLoading || (loading && pendingReleases.length === 0)) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Caricamento...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-emerald-500/10 blur-[100px]"></div>
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
                  <h1 className="text-3xl font-bold">Rilascio Fondi</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Approva manualmente i rilasci di fondi con doppia conferma
                </p>
              </div>
              <Link href="/admin/audit-log">
                <Button variant="outline" className="gap-2">
                  <span className="material-symbols-outlined text-sm">history</span>
                  Audit Log
                </Button>
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-panel p-4 border-l-4 border-l-yellow-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-yellow-500">pending</span>
                  <div>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <div className="text-sm text-gray-500">In Attesa</div>
                  </div>
                </div>
              </Card>
              <Card className="glass-panel p-4 border-l-4 border-l-green-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-green-500">check_circle</span>
                  <div>
                    <div className="text-2xl font-bold">{stats.approved}</div>
                    <div className="text-sm text-gray-500">Approvati</div>
                  </div>
                </div>
              </Card>
              <Card className="glass-panel p-4 border-l-4 border-l-red-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-red-500">cancel</span>
                  <div>
                    <div className="text-2xl font-bold">{stats.rejected}</div>
                    <div className="text-sm text-gray-500">Rifiutati</div>
                  </div>
                </div>
              </Card>
              <Card className="glass-panel p-4 border-l-4 border-l-gray-500">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-gray-500">schedule</span>
                  <div>
                    <div className="text-2xl font-bold">{stats.expired}</div>
                    <div className="text-sm text-gray-500">Scaduti</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti gli stati</SelectItem>
                  <SelectItem value="PENDING">In Attesa</SelectItem>
                  <SelectItem value="APPROVED">Approvati</SelectItem>
                  <SelectItem value="REJECTED">Rifiutati</SelectItem>
                  <SelectItem value="EXPIRED">Scaduti</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti i tipi</SelectItem>
                  <SelectItem value="RELEASE_TO_SELLER">Rilascio Venditore</SelectItem>
                  <SelectItem value="REFUND_FULL">Rimborso Totale</SelectItem>
                  <SelectItem value="REFUND_PARTIAL">Rimborso Parziale</SelectItem>
                  <SelectItem value="HUB_COMMISSION">Commissione Hub</SelectItem>
                  <SelectItem value="WITHDRAWAL">Prelievo</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={fetchPendingReleases}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Aggiorna
              </Button>
            </div>

            {/* List */}
            {pendingReleases.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">payments</span>
                <h3 className="text-xl font-bold mb-2">Nessuna richiesta</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {statusFilter === 'PENDING' 
                    ? 'Non ci sono richieste di rilascio in attesa di approvazione.'
                    : 'Non ci sono richieste che corrispondono ai filtri selezionati.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingReleases.map((release) => (
                  <Card key={release.id} className="glass-panel p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getTypeBadge(release.type)}
                          {getStatusBadge(release.status)}
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(release.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl font-bold text-primary">
                            €{release.amount.toFixed(2)}
                          </span>
                          <span className="text-gray-500">→</span>
                          <span className="font-medium">
                            {release.recipient.name || release.recipient.email}
                          </span>
                        </div>

                        {release.reason && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="font-medium">Motivo:</span> {release.reason}
                          </p>
                        )}

                        {release.order && (
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">Ordine:</span>{' '}
                            #{release.order.id.slice(0, 8)}...{' '}
                            {release.order.shop && (
                              <span className="text-primary">@ {release.order.shop.name}</span>
                            )}
                            {release.order.hub && (
                              <span className="text-purple-500">@ {release.order.hub.name} (Hub)</span>
                            )}
                          </div>
                        )}

                        {release.dispute && (
                          <div className="text-sm text-orange-500 mt-1">
                            <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                            Dispute: {release.dispute.title} ({release.dispute.status})
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {release.status === 'PENDING' ? (
                          <>
                            <Button
                              onClick={() => handleInitiateApproval(release)}
                              className="bg-green-600 hover:bg-green-700 gap-2"
                              disabled={processing}
                            >
                              <span className="material-symbols-outlined text-sm">check</span>
                              Approva
                            </Button>
                            <Button
                              onClick={() => openRejectModal(release)}
                              variant="destructive"
                              className="gap-2"
                              disabled={processing}
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                              Rifiuta
                            </Button>
                          </>
                        ) : release.status === 'APPROVED' ? (
                          <div className="text-sm text-green-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">verified</span>
                            Approvato da {release.approvedBy?.name || release.approvedBy?.email}
                          </div>
                        ) : release.status === 'REJECTED' ? (
                          <div className="text-sm text-red-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">block</span>
                            Rifiutato da {release.rejectedBy?.name || release.rejectedBy?.email}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="flex items-center px-4">
                  Pagina {page} di {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Approvazione (Doppia Conferma) */}
      <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {confirmationStep === 'initial' ? (
                <>
                  <span className="material-symbols-outlined text-yellow-500">hourglass_top</span>
                  Generazione Token...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-green-500">verified_user</span>
                  Conferma Approvazione
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmationStep === 'initial' 
                ? 'Attendi mentre generiamo il token di conferma...'
                : 'Verifica i dettagli e conferma l\'approvazione. Questa azione è irreversibile.'}
            </DialogDescription>
          </DialogHeader>

          {confirmationStep === 'confirm' && selectedRelease && (
            <div className="py-4 space-y-4">
              {/* Warning Banner */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-yellow-500">warning</span>
                  <div>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">
                      Attenzione: Azione Irreversibile
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Stai per rilasciare fondi reali. Verifica attentamente prima di confermare.
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Importo:</span>
                  <span className="font-bold text-2xl text-primary">€{selectedRelease.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destinatario:</span>
                  <span className="font-medium">{selectedRelease.recipient.name || selectedRelease.recipient.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tipo:</span>
                  {getTypeBadge(selectedRelease.type)}
                </div>
                {selectedRelease.order && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ordine:</span>
                    <span>#{selectedRelease.order.id.slice(0, 8)}...</span>
                  </div>
                )}
              </div>

              {/* Token Timer */}
              {tokenExpiresAt && (
                <div className="text-center text-sm text-gray-500">
                  Token valido fino alle{' '}
                  <span className="font-mono font-medium">
                    {tokenExpiresAt.toLocaleTimeString('it-IT')}
                  </span>
                  {' '}(5 minuti)
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Note (opzionale)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                  placeholder="Aggiungi note per l'audit log..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setApprovalModalOpen(false)}
              disabled={processing}
            >
              Annulla
            </Button>
            {confirmationStep === 'confirm' && (
              <Button
                onClick={handleConfirmApproval}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                {processing ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Sì, sono sicuro!
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Rifiuto */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">block</span>
              Rifiuta Richiesta
            </DialogTitle>
            <DialogDescription>
              Specifica il motivo del rifiuto. Questo sarà registrato nell'audit log.
            </DialogDescription>
          </DialogHeader>

          {selectedRelease && (
            <div className="py-4 space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Importo:</span>
                  <span className="font-bold">€{selectedRelease.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Destinatario:</span>
                  <span>{selectedRelease.recipient.name || selectedRelease.recipient.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Motivo del rifiuto <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white dark:bg-gray-900 text-sm"
                  placeholder="Es: Dispute in corso, verifica tracking non completata..."
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setRejectModalOpen(false)}
              disabled={processing}
            >
              Annulla
            </Button>
            <Button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              variant="destructive"
              className="gap-2"
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                  Elaborazione...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">block</span>
                  Conferma Rifiuto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

