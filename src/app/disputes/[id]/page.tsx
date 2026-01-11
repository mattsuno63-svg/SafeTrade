'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatDistanceToNow, format } from 'date-fns'
import { it } from 'date-fns/locale'

interface DisputeMessage {
  id: string
  content: string
  photos: string[]
  isInternal: boolean
  createdAt: string
  sender: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    role: string
  }
}

interface Dispute {
  id: string
  type: string
  status: string
  title: string
  description: string
  photos: string[]
  resolution: string | null
  resolutionNotes: string | null
  resolutionAmount: number | null
  openedAt: string
  closedAt: string | null
  sellerResponseDeadline: string | null
  mediatorId: string | null
  openedBy: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
  transaction: {
    id: string
    status: string
    userA: { id: string; name: string | null; email: string; avatar: string | null }
    userB: { id: string; name: string | null; email: string; avatar: string | null }
    proposal?: {
      listing?: {
        id: string
        title: string
        price: number
        images: string[]
      }
    }
    escrowPayment?: {
      amount: number
      status: string
    }
    hub?: { id: string; providerId: string; name: string }
  }
  messages: DisputeMessage[]
  pendingReleases: Array<{
    id: string
    type: string
    amount: number
    status: string
  }>
}

interface Meta {
  isDeadlinePassed: boolean
  hoursUntilDeadline: number | null
  canRespond: boolean
  canEscalate: boolean
  canResolve: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
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

const RESOLUTION_CONFIG: Record<string, string> = {
  REFUND_FULL: 'Rimborso totale',
  REFUND_PARTIAL: 'Rimborso parziale',
  REPLACEMENT: 'Sostituzione',
  RETURN_REQUIRED: 'Reso richiesto',
  REJECTED: 'Rifiutata',
  IN_FAVOR_BUYER: 'A favore acquirente',
  IN_FAVOR_SELLER: 'A favore venditore',
}

export default function DisputeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [dispute, setDispute] = useState<Dispute | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [showResolveModal, setShowResolveModal] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const disputeId = params.id as string

  const fetchDispute = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/disputes/${disputeId}`)
      
      if (res.status === 404) {
        toast({ title: 'Disputa non trovata', variant: 'destructive' })
        router.push('/admin/disputes')
        return
      }

      if (res.status === 403) {
        toast({ title: 'Accesso negato', variant: 'destructive' })
        router.push('/dashboard')
        return
      }

      if (res.ok) {
        const data = await res.json()
        setDispute(data.dispute)
        setMeta(data.meta)
      }
    } catch (error) {
      console.error('Error fetching dispute:', error)
      toast({ title: 'Errore nel caricamento', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [disputeId, router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    if (user && disputeId) {
      fetchDispute()
    }
  }, [user, userLoading, disputeId, router, fetchDispute])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [dispute?.messages])

  const sendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      setSending(true)
      const res = await fetch(`/api/disputes/${disputeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      })

      if (res.ok) {
        setNewMessage('')
        fetchDispute()
        toast({ title: 'Messaggio inviato' })
      } else {
        const data = await res.json()
        toast({ title: 'Errore', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Errore', description: 'Impossibile inviare il messaggio', variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const handleAction = async (action: string, extraData?: Record<string, unknown>) => {
    try {
      setActionLoading(true)
      const res = await fetch(`/api/disputes/${disputeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({ title: 'Azione completata', description: `Disputa ${action === 'resolve' ? 'risolta' : 'aggiornata'}` })
        fetchDispute()
        setShowResolveModal(false)
      } else {
        toast({ title: 'Errore', description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: 'Errore', description: 'Azione fallita', variant: 'destructive' })
    } finally {
      setActionLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-3">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Caricamento disputa...
          </div>
        </main>
      </div>
    )
  }

  if (!dispute) return null

  const isBuyer = dispute.transaction.userA.id === user?.id
  const isSeller = dispute.transaction.userB.id === user?.id
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const statusConfig = STATUS_CONFIG[dispute.status]
  const typeConfig = TYPE_CONFIG[dispute.type] || TYPE_CONFIG.OTHER

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-red-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              {isAdmin && (
                <>
                  <Link href="/admin" className="hover:text-red-500 transition-colors">Admin</Link>
                  <span>/</span>
                </>
              )}
              <Link href={isAdmin ? '/admin/disputes' : '/dashboard'} className="hover:text-red-500 transition-colors">
                {isAdmin ? 'Disputes' : 'Dashboard'}
              </Link>
              <span>/</span>
              <span className="text-red-500">#{dispute.id.slice(0, 8)}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Header Card */}
                <Card className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${statusConfig?.color}/20`}>
                          <span className={`material-symbols-outlined text-sm ${statusConfig?.color.replace('bg-', 'text-')}`}>
                            {statusConfig?.icon}
                          </span>
                          <span className={statusConfig?.color.replace('bg-', 'text-')}>
                            {statusConfig?.label}
                          </span>
                        </span>
                        <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">{typeConfig.icon}</span>
                          {typeConfig.label}
                        </span>
                      </div>
                      <h1 className="text-2xl font-bold mb-1">{dispute.title}</h1>
                      <p className="text-sm text-gray-500">
                        Aperta {formatDistanceToNow(new Date(dispute.openedAt), { addSuffix: true, locale: it })} da {dispute.openedBy.name || dispute.openedBy.email}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 mb-4">
                    <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">description</span>
                      Descrizione problema
                    </h3>
                    <p className="text-sm whitespace-pre-wrap">{dispute.description}</p>
                  </div>

                  {/* Photos */}
                  {dispute.photos.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">photo_library</span>
                        Foto allegate ({dispute.photos.length})
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                        {dispute.photos.map((photo, idx) => (
                          <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                            <div className="aspect-square rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                              <Image
                                src={photo}
                                alt={`Evidenza ${idx + 1}`}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover hover:scale-105 transition-transform"
                              />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution */}
                  {dispute.resolution && (
                    <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <h3 className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 mb-2">
                        <span className="material-symbols-outlined">verified</span>
                        Risoluzione
                      </h3>
                      <p className="font-medium">{RESOLUTION_CONFIG[dispute.resolution] || dispute.resolution}</p>
                      {dispute.resolutionAmount && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Importo: €{dispute.resolutionAmount.toFixed(2)}
                        </p>
                      )}
                      {dispute.resolutionNotes && (
                        <p className="text-sm mt-2">{dispute.resolutionNotes}</p>
                      )}
                    </div>
                  )}

                  {/* Deadline Warning */}
                  {meta && meta.hoursUntilDeadline !== null && dispute.status === 'OPEN' && (
                    <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      meta.isDeadlinePassed 
                        ? 'bg-red-500/10 text-red-600' 
                        : 'bg-yellow-500/10 text-yellow-600'
                    }`}>
                      <span className="material-symbols-outlined">timer</span>
                      <span className="text-sm font-medium">
                        {meta.isDeadlinePassed 
                          ? 'Deadline scaduta! Il venditore non ha risposto in tempo.' 
                          : `${meta.hoursUntilDeadline}h rimanenti per la risposta del venditore`}
                      </span>
                    </div>
                  )}
                </Card>

                {/* Messages / Chat */}
                <Card className="glass-panel p-6">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">forum</span>
                    Messaggi ({dispute.messages.length})
                  </h2>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4 pr-2">
                    {dispute.messages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        Nessun messaggio ancora. Inizia la conversazione.
                      </p>
                    ) : (
                      dispute.messages.map((msg) => {
                        const isOwn = msg.sender.id === user?.id
                        const isAdminMsg = msg.sender.role === 'ADMIN' || msg.sender.role === 'MODERATOR'
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                {!isOwn && (
                                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600">
                                    {msg.sender.avatar ? (
                                      <Image
                                        src={msg.sender.avatar}
                                        alt={msg.sender.name || ''}
                                        width={24}
                                        height={24}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs">
                                        {(msg.sender.name || msg.sender.email)[0].toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <span className={`text-xs ${isAdminMsg ? 'text-purple-500 font-semibold' : 'text-gray-500'}`}>
                                  {isOwn ? 'Tu' : msg.sender.name || msg.sender.email}
                                  {isAdminMsg && ' (Staff)'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {format(new Date(msg.createdAt), 'HH:mm', { locale: it })}
                                </span>
                              </div>
                              <div className={`rounded-2xl px-4 py-2 ${
                                isOwn 
                                  ? 'bg-red-500 text-white' 
                                  : isAdminMsg 
                                    ? 'bg-purple-500/20 border border-purple-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              </div>
                              {msg.photos.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {msg.photos.map((photo, idx) => (
                                    <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                                      <div className="w-16 h-16 rounded overflow-hidden">
                                        <Image
                                          src={photo}
                                          alt={`Allegato ${idx + 1}`}
                                          width={64}
                                          height={64}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input */}
                  {!['RESOLVED', 'CLOSED'].includes(dispute.status) && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Scrivi un messaggio..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-red-500"
                        disabled={sending}
                      />
                      <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                        {sending ? (
                          <span className="material-symbols-outlined animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined">send</span>
                        )}
                      </Button>
                    </div>
                  )}
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Transaction Info */}
                <Card className="glass-panel p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">receipt</span>
                    Transazione
                  </h3>
                  
                  {dispute.transaction.proposal?.listing && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {dispute.transaction.proposal.listing.images?.[0] && (
                          <Image
                            src={dispute.transaction.proposal.listing.images[0]}
                            alt={dispute.transaction.proposal.listing.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{dispute.transaction.proposal.listing.title}</p>
                        <p className="text-sm text-gray-500">€{dispute.transaction.proposal.listing.price}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Acquirente</span>
                      <span className="font-medium">{dispute.transaction.userA.name || dispute.transaction.userA.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Venditore</span>
                      <span className="font-medium">{dispute.transaction.userB.name || dispute.transaction.userB.email}</span>
                    </div>
                    {dispute.transaction.escrowPayment && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">In Escrow</span>
                        <span className="font-bold text-green-500">
                          €{dispute.transaction.escrowPayment.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Link href={`/transactions/${dispute.transaction.id}`}>
                    <Button variant="outline" className="w-full mt-4" size="sm">
                      <span className="material-symbols-outlined text-sm mr-1">open_in_new</span>
                      Vedi transazione
                    </Button>
                  </Link>
                </Card>

                {/* Actions */}
                <Card className="glass-panel p-6">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined">bolt</span>
                    Azioni
                  </h3>

                  <div className="space-y-2">
                    {/* Seller respond */}
                    {isSeller && dispute.status === 'OPEN' && (
                      <Button 
                        className="w-full bg-blue-500 hover:bg-blue-600"
                        onClick={() => handleAction('respond', { message: 'Risposta dal venditore...' })}
                        disabled={actionLoading}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">reply</span>
                        Rispondi alla disputa
                      </Button>
                    )}

                    {/* Escalate */}
                    {(isBuyer || isSeller) && ['OPEN', 'SELLER_RESPONSE'].includes(dispute.status) && (
                      <Button 
                        variant="outline"
                        className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        onClick={() => handleAction('escalate')}
                        disabled={actionLoading}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">priority_high</span>
                        Escala ad Admin
                      </Button>
                    )}

                    {/* Admin: Mediate */}
                    {isAdmin && dispute.status === 'ESCALATED' && (
                      <Button 
                        className="w-full bg-purple-500 hover:bg-purple-600"
                        onClick={() => handleAction('mediate')}
                        disabled={actionLoading}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">support_agent</span>
                        Prendi in carico
                      </Button>
                    )}

                    {/* Admin: Resolve */}
                    {isAdmin && ['ESCALATED', 'IN_MEDIATION'].includes(dispute.status) && (
                      <Button 
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={() => setShowResolveModal(true)}
                        disabled={actionLoading}
                      >
                        <span className="material-symbols-outlined text-sm mr-1">gavel</span>
                        Risolvi disputa
                      </Button>
                    )}

                    {dispute.status === 'RESOLVED' && (
                      <div className="text-center py-4 text-green-500">
                        <span className="material-symbols-outlined text-3xl mb-2 block">check_circle</span>
                        <p className="font-medium">Disputa risolta</p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Pending Releases */}
                {dispute.pendingReleases.length > 0 && (
                  <Card className="glass-panel p-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined">payments</span>
                      Rilasci in attesa
                    </h3>
                    <div className="space-y-2">
                      {dispute.pendingReleases.map((pr) => (
                        <div key={pr.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <span className="text-sm">{pr.type.replace(/_/g, ' ')}</span>
                          <span className="font-bold text-green-500">€{pr.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <ResolveDisputeModal
          dispute={dispute}
          onClose={() => setShowResolveModal(false)}
          onResolve={(resolution, amount, notes) => {
            handleAction('resolve', { resolution, resolutionAmount: amount, message: notes })
          }}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Modal per risolvere la disputa
function ResolveDisputeModal({
  dispute,
  onClose,
  onResolve,
  loading,
}: {
  dispute: Dispute
  onClose: () => void
  onResolve: (resolution: string, amount: number | null, notes: string) => void
  loading: boolean
}) {
  const [resolution, setResolution] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  
  const maxAmount = dispute.transaction.escrowPayment?.amount || 0

  const handleSubmit = () => {
    if (!resolution) return
    const amountNum = resolution === 'REFUND_PARTIAL' ? parseFloat(amount) : null
    onResolve(resolution, amountNum, notes)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-green-500">gavel</span>
              <h2 className="text-xl font-bold">Risolvi Disputa</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Risoluzione *</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent"
              >
                <option value="">Seleziona risoluzione...</option>
                <option value="REFUND_FULL">Rimborso totale all&apos;acquirente</option>
                <option value="REFUND_PARTIAL">Rimborso parziale</option>
                <option value="IN_FAVOR_BUYER">A favore acquirente</option>
                <option value="IN_FAVOR_SELLER">A favore venditore</option>
                <option value="REPLACEMENT">Sostituzione prodotto</option>
                <option value="RETURN_REQUIRED">Reso richiesto</option>
                <option value="REJECTED">Rifiuta disputa</option>
              </select>
            </div>

            {resolution === 'REFUND_PARTIAL' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Importo rimborso (max €{maxAmount.toFixed(2)}) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={maxAmount}
                  step="0.01"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Note (opzionale)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Motivazione della decisione..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent resize-none"
              />
            </div>

            {['REFUND_FULL', 'REFUND_PARTIAL', 'IN_FAVOR_BUYER'].includes(resolution) && (
              <div className="p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
                <span className="material-symbols-outlined text-sm mr-1">info</span>
                Verrà creata una richiesta di rimborso che richiederà approvazione manuale.
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !resolution || (resolution === 'REFUND_PARTIAL' && !amount)}
              className="flex-1 bg-green-500 hover:bg-green-600"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm mr-1">check</span>
                  Conferma
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

