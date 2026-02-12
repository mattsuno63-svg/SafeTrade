'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface VaultRequest {
  id: string
  shopId: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  adminNotes: string | null
  paymentStatus: string | null
  createdAt: string
  shop: {
    id: string
    name: string
    slug: string
  }
  requestedByUser: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminVaultRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [requests, setRequests] = useState<VaultRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [activeTab, setActiveTab] = useState<'REQUESTS' | 'PAYMENTS'>('REQUESTS')
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchRequests = useCallback(async (force = false) => {
    if (!force && (isFetchingRef.current || hasFetchedRef.current)) return
    isFetchingRef.current = true

    try {
      const res = await fetch('/api/vault/requests')
      if (res.status === 403 || res.status === 401) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
        hasFetchedRef.current = true
      }
    } catch (error) {
      console.error('Error fetching vault requests:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [router])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user && !userLoading) {
      // Verifica che l'utente sia admin
      const userRole = user.user_metadata?.role || user.role
      if (userRole !== 'ADMIN' && userRole !== 'HUB_STAFF') {
        router.push('/dashboard')
        return
      }
      fetchRequests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userLoading])

  const handleReview = async (requestId: string, status: 'APPROVED' | 'REJECTED' | 'PAID') => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/vault/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes: reviewNotes || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update request')
      }

      toast({
        title: status === 'APPROVED' 
          ? 'Richiesta Approvata' 
          : status === 'REJECTED' 
          ? 'Richiesta Rifiutata'
          : 'Pagamento Confermato',
        description: status === 'APPROVED' 
          ? 'Il merchant può ora procedere con il pagamento della teca.'
          : status === 'REJECTED'
          ? 'Il merchant è stato notificato.'
          : 'Il pagamento è stato confermato. La teca può essere preparata.',
      })

      setSelectedRequest(null)
      setReviewNotes('')
      // Force refetch per aggiornare la lista dopo l'approvazione
      hasFetchedRef.current = false
      await fetchRequests(true)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  // Separa richieste di approvazione da richieste di pagamento
  const approvalRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'REJECTED')
  const paymentRequests = requests.filter(r => r.status === 'APPROVED' && r.paymentStatus === 'PENDING')

  const filteredRequests = activeTab === 'REQUESTS'
    ? (filter === 'ALL' ? approvalRequests : approvalRequests.filter(r => r.status === filter))
    : paymentRequests

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">In Attesa</Badge>
      case 'APPROVED':
        return <Badge className="bg-blue-500">Approvata</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">Rifiutata</Badge>
      case 'PAID':
        return <Badge className="bg-purple-500">Pagata</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completata</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-500">Cancellata</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (userLoading || loading) {
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
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-yellow-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h1 className="text-3xl font-bold">Richieste Teche Vault</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Rivedi e approva le richieste per le teche Vault dai merchant
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-white/10">
              <button
                onClick={() => {
                  setActiveTab('REQUESTS')
                  setFilter('PENDING')
                }}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'REQUESTS'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-primary'
                }`}
              >
                Richieste Teca
                {approvalRequests.filter(r => r.status === 'PENDING').length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {approvalRequests.filter(r => r.status === 'PENDING').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('PAYMENTS')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'PAYMENTS'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-primary'
                }`}
              >
                Verifica Pagamenti
                {paymentRequests.length > 0 && (
                  <span className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {paymentRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Filters - Solo per tab Richieste */}
            {activeTab === 'REQUESTS' && (
              <div className="flex gap-2 mb-6">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => setFilter(f)}
                    size="sm"
                  >
                    {f === 'ALL' ? 'Tutte' : f === 'PENDING' ? 'In Attesa' : f === 'APPROVED' ? 'Approvate' : 'Rifiutate'}
                    {f === 'PENDING' && approvalRequests.filter(r => r.status === 'PENDING').length > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {approvalRequests.filter(r => r.status === 'PENDING').length}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            )}

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  {activeTab === 'REQUESTS' ? 'inventory_2' : 'payments'}
                </span>
                <h3 className="text-xl font-bold mb-2">
                  {activeTab === 'REQUESTS' ? 'Nessuna Richiesta' : 'Nessun Pagamento in Attesa'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {activeTab === 'REQUESTS'
                    ? (filter === 'PENDING' 
                      ? 'Tutte le richieste sono state revisionate.'
                      : `Nessuna richiesta ${filter === 'ALL' ? '' : filter.toLowerCase()} trovata.`)
                    : 'Non ci sono pagamenti in attesa di verifica.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <Card key={req.id} className="glass-panel p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{req.shop.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Richiesta da {req.requestedByUser.name || req.requestedByUser.email}
                            </p>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-xs text-gray-500 block">Negozio</span>
                            <span className="font-medium">{req.shop.name}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Richiesta il</span>
                            <span className="font-medium">
                              {new Date(req.createdAt).toLocaleDateString('it-IT', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {req.notes && (
                          <div className="mb-4">
                            <span className="text-xs text-gray-500 block">Note del Merchant</span>
                            <p className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">{req.notes}</p>
                          </div>
                        )}

                        {req.adminNotes && req.status !== 'PENDING' && (
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                            <span className="text-xs text-gray-500 block">Note di Revisione</span>
                            <p className="text-sm">{req.adminNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Review Panel - Solo per tab Richieste */}
                      {activeTab === 'REQUESTS' && req.status === 'PENDING' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Revisiona Richiesta</h4>
                          <Textarea
                            placeholder="Aggiungi note di revisione (opzionale)..."
                            value={selectedRequest === req.id ? reviewNotes : ''}
                            onChange={(e) => {
                              setSelectedRequest(req.id)
                              setReviewNotes(e.target.value)
                            }}
                            className="mb-3"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleReview(req.id, 'REJECTED')}
                              disabled={processing}
                            >
                              Rifiuta
                            </Button>
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => handleReview(req.id, 'APPROVED')}
                              disabled={processing}
                            >
                              Approva
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Payment Confirmation Panel */}
                      {req.status === 'APPROVED' && req.paymentStatus === 'PENDING' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl border-2 border-yellow-500/30">
                          <h4 className="font-bold mb-3 text-yellow-600 dark:text-yellow-400">
                            <span className="material-symbols-outlined align-middle mr-2">payments</span>
                            Verifica Pagamento
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Il merchant ha confermato l'invio del bonifico. Verifica il pagamento e conferma quando ricevuto.
                          </p>
                          <Textarea
                            placeholder="Note di verifica pagamento (opzionale)..."
                            value={selectedRequest === req.id ? reviewNotes : ''}
                            onChange={(e) => {
                              setSelectedRequest(req.id)
                              setReviewNotes(e.target.value)
                            }}
                            className="mb-3"
                            rows={2}
                          />
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600"
                            onClick={() => handleReview(req.id, 'PAID')}
                            disabled={processing}
                          >
                            <span className="material-symbols-outlined mr-2">check_circle</span>
                            Conferma Pagamento Ricevuto
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

