'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface VaultRequest {
  id: string
  shopId: string
  requestedBy: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
  adminNotes: string | null
  paymentStatus: string | null
  createdAt: string
  approvedAt: string | null
  rejectedAt: string | null
  paidAt: string | null
  shop: {
    id: string
    name: string
    slug: string
  }
}

export default function MerchantVaultRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [requests, setRequests] = useState<VaultRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<any>(null)
  const [shopLoading, setShopLoading] = useState(true)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false)
  const [newRequestNotes, setNewRequestNotes] = useState('')
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<VaultRequest | null>(null)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const selectedRequestIdRef = useRef<string | null>(null)

  const fetchRequests = useCallback(async () => {
    if (!shop?.id) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/vault/requests?shopId=${shop.id}`)
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching vault requests:', error)
    } finally {
      setLoading(false)
    }
  }, [shop?.id])

  const fetchShop = useCallback(async () => {
    setShopLoading(true)
    try {
      const res = await fetch('/api/merchant/shop')
      if (res.ok) {
        const data = await res.json()
        // L'API restituisce direttamente lo shop, non { data: shop }
        setShop(data)
      } else if (res.status === 403 || res.status === 404) {
        router.push('/dashboard')
        setLoading(false)
        setShopLoading(false)
        return
      }
    } catch (error) {
      console.error('Error fetching shop:', error)
    } finally {
      setShopLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user && !userLoading) {
      fetchShop()
    }
  }, [user, userLoading, fetchShop])

  useEffect(() => {
    if (shop?.id) {
      fetchRequests()
    }
  }, [shop?.id, fetchRequests])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">In Attesa di Approvazione</Badge>
      case 'APPROVED':
        return <Badge className="bg-blue-500">Approvata - In Attesa Pagamento</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">Rifiutata</Badge>
      case 'PAID':
        return <Badge className="bg-purple-500">Pagata - Teca in Preparazione</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completata - Teca Attiva</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-500">Cancellata</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getStatusMessage = (request: VaultRequest) => {
    switch (request.status) {
      case 'PENDING':
        return 'La tua richiesta è in attesa di revisione da parte dell\'amministratore.'
      case 'APPROVED':
        if (request.paymentStatus === 'PENDING') {
          return 'Hai confermato l\'invio del bonifico. In attesa di verifica da parte dell\'amministratore.'
        }
        return 'La tua richiesta è stata approvata! Puoi ora procedere con il pagamento della teca.'
      case 'REJECTED':
        return request.adminNotes 
          ? `La tua richiesta non è stata approvata. Motivo: ${request.adminNotes}`
          : 'La tua richiesta non è stata approvata.'
      case 'PAID':
        return 'Il pagamento è stato ricevuto. La teca è in preparazione e ti verrà assegnata a breve.'
      case 'COMPLETED':
        return 'La tua teca è stata creata e assegnata al tuo negozio. Puoi ora iniziare a utilizzarla!'
      case 'CANCELLED':
        return 'La richiesta è stata cancellata.'
      default:
        return ''
    }
  }

  const handleProceedToPayment = (request: VaultRequest) => {
    setSelectedRequest(request)
    selectedRequestIdRef.current = request.id
    setShowPaymentDialog(true)
  }

  const handleCreateRequest = async () => {
    if (!shop?.id) {
      toast({
        title: 'Errore',
        description: 'Negoziante non trovato',
        variant: 'destructive',
      })
      return
    }

    setCreatingRequest(true)
    try {
      const res = await fetch('/api/vault/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shop.id,
          notes: newRequestNotes || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella creazione della richiesta')
      }

      toast({
        title: 'Richiesta Inviata',
        description: 'La tua richiesta per una teca Vault è stata inviata. Attendi l\'approvazione dell\'amministratore.',
      })

      setShowNewRequestDialog(false)
      setNewRequestNotes('')
      
      // Refresh requests
      hasFetchedRef.current = false
      await fetchRequests()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setCreatingRequest(false)
    }
  }

  const handleConfirmPaymentSent = () => {
    // Mostra dialog di conferma
    setShowConfirmDialog(true)
  }

  const handleFinalConfirmPayment = async () => {
    // Usa il ref per assicurarsi che l'ID sia sempre disponibile
    const requestId = selectedRequestIdRef.current || selectedRequest?.id
    
    if (!requestId || requestId === 'undefined') {
      toast({
        title: 'Errore',
        description: 'Richiesta non trovata. Ricarica la pagina e riprova.',
        variant: 'destructive',
      })
      return
    }

    setConfirmingPayment(true)
    try {
      const res = await fetch(`/api/vault/requests/${requestId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella conferma del pagamento')
      }

      toast({
        title: 'Bonifico Confermato',
        description: 'Hai confermato l\'invio del bonifico. L\'amministratore verificherà il pagamento.',
      })

      setShowPaymentDialog(false)
      setShowConfirmDialog(false)
      setSelectedRequest(null)
      selectedRequestIdRef.current = null
      
      // Refresh requests
      hasFetchedRef.current = false
      await fetchRequests()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setConfirmingPayment(false)
    }
  }

  const hasFetchedRef = useRef(false)

  if (userLoading || shopLoading || (loading && !shop?.id)) {
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
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-cyan-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => router.push('/merchant/vault')} className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h1 className="text-3xl font-bold">Richieste Teca Vault</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestisci le tue richieste per le teche Vault
                </p>
              </div>
              <Button
                onClick={() => setShowNewRequestDialog(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Richiedi Teca Vault
              </Button>
            </div>

            {/* Requests List */}
            {requests.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  inventory_2
                </span>
                <h3 className="text-xl font-bold mb-2">Nessuna Richiesta</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Non hai ancora inviato richieste per una teca Vault.
                </p>
                <Button onClick={() => setShowNewRequestDialog(true)}>
                  Richiedi Teca Vault
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.map((req) => (
                  <Card key={req.id} className="glass-panel p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">Richiesta Teca Vault</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Negozio: {req.shop.name}
                            </p>
                          </div>
                          {getStatusBadge(req.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
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
                          {req.approvedAt && (
                            <div>
                              <span className="text-xs text-gray-500 block">Approvata il</span>
                              <span className="font-medium">
                                {new Date(req.approvedAt).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          {req.rejectedAt && (
                            <div>
                              <span className="text-xs text-gray-500 block">Rifiutata il</span>
                              <span className="font-medium">
                                {new Date(req.rejectedAt).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {req.notes && (
                          <div className="mb-4">
                            <span className="text-xs text-gray-500 block">Tue Note</span>
                            <p className="text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">{req.notes}</p>
                          </div>
                        )}

                        {req.adminNotes && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                            <span className="text-xs text-gray-500 block">Note dell'Amministratore</span>
                            <p className="text-sm">{req.adminNotes}</p>
                          </div>
                        )}

                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {getStatusMessage(req)}
                          </p>
                        </div>
                      </div>

                      {/* Action Panel */}
                      {req.status === 'APPROVED' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Prossimi Passi</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Procedi con il pagamento per completare l'assegnazione della teca.
                          </p>
                          <Button
                            className="w-full bg-green-500 hover:bg-green-600"
                            onClick={() => handleProceedToPayment(req)}
                          >
                            <span className="material-symbols-outlined mr-2">payments</span>
                            Procedi con il Pagamento
                          </Button>
                        </div>
                      )}

                      {req.status === 'COMPLETED' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Teca Attiva</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            La tua teca è pronta! Puoi iniziare a utilizzarla.
                          </p>
                          <Button
                            className="w-full"
                            onClick={() => router.push('/merchant/vault')}
                          >
                            <span className="material-symbols-outlined mr-2">inventory_2</span>
                            Vai alla Gestione Vault
                          </Button>
                        </div>
                      )}

                      {req.status === 'REJECTED' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Richiesta Rifiutata</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Puoi inviare una nuova richiesta dopo aver risolto i problemi indicati.
                          </p>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => router.push('/merchant/shop')}
                          >
                            Richiedi Nuovamente
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dati per il Bonifico</DialogTitle>
            <DialogDescription>
              Esegui il bonifico utilizzando i seguenti dati bancari. Dopo aver inviato il bonifico, conferma l'operazione.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Card className="p-4 bg-gray-50 dark:bg-gray-800">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Intestatario</span>
                  <span className="font-bold">SafeTrade S.r.l.</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">IBAN</span>
                  <span className="font-mono text-sm">IT60 X054 2811 1010 0000 0123 456</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">BIC/SWIFT</span>
                  <span className="font-mono text-sm">BCITITMM</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Importo</span>
                  <span className="font-bold text-lg text-green-600">€ 299,00</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Causale</span>
                  <span className="text-sm">Teca Vault - {selectedRequest?.shop?.name || 'Negoziante'}</span>
                </div>
              </div>
            </Card>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                <strong>Importante:</strong> Includi nella causale il nome del tuo negozio per facilitare l'identificazione del pagamento.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false)
                setSelectedRequest(null)
                selectedRequestIdRef.current = null
              }}
              disabled={confirmingPayment}
            >
              Annulla
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleConfirmPaymentSent}
              disabled={confirmingPayment}
            >
              {confirmingPayment ? (
                <>
                  <span className="material-symbols-outlined mr-2 animate-spin">sync</span>
                  Conferma in corso...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">check_circle</span>
                  Ho Inviato il Bonifico
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conferma Invio Bonifico</DialogTitle>
            <DialogDescription>
              Sei sicuro di aver inviato il bonifico? Questa azione notificherà l'amministratore per la verifica del pagamento.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                <strong>Attenzione:</strong> Assicurati di aver effettivamente inviato il bonifico prima di confermare.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                // Non resettare selectedRequest qui, potrebbe essere ancora necessario
              }}
              disabled={confirmingPayment}
            >
              Annulla
            </Button>
            <Button
              className="bg-green-500 hover:bg-green-600"
              onClick={handleFinalConfirmPayment}
              disabled={confirmingPayment}
            >
              {confirmingPayment ? (
                <>
                  <span className="material-symbols-outlined mr-2 animate-spin">sync</span>
                  Conferma in corso...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">check_circle</span>
                  Sì, Confermo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Request Dialog */}
      <Dialog open={showNewRequestDialog} onOpenChange={setShowNewRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Richiedi Teca Vault</DialogTitle>
            <DialogDescription>
              Invia una richiesta per ottenere una teca Vault per il tuo negozio. L'amministratore esaminerà la tua richiesta e ti notificherà l'esito.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Note (Opzionale)
                </label>
                <textarea
                  value={newRequestNotes}
                  onChange={(e) => setNewRequestNotes(e.target.value)}
                  placeholder="Aggiungi eventuali note per l'amministratore..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={4}
                />
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                  <strong>Importante:</strong> Dopo l'approvazione, dovrai procedere con il pagamento di € 299,00 tramite bonifico bancario.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewRequestDialog(false)
                setNewRequestNotes('')
              }}
              disabled={creatingRequest}
            >
              Annulla
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleCreateRequest}
              disabled={creatingRequest}
            >
              {creatingRequest ? (
                <>
                  <span className="material-symbols-outlined mr-2 animate-spin">sync</span>
                  Invio in corso...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">send</span>
                  Invia Richiesta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

