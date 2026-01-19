'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

interface DepositItem {
  id: string
  name: string
  game: string
  set: string | null
  conditionDeclared: string
  photos: string[]
  status: string
  conditionVerified: string | null
  priceFinal: number | null
  shop: { id: string; name: string } | null
  case: { id: string; label: string } | null
  slot: { id: string; slotCode: string } | null
}

interface Deposit {
  id: string
  trackingIn: string | null
  status: string
  notes: string | null
  createdAt: string
  receivedAt: string | null
  reviewedAt: string | null
  items: DepositItem[]
  depositor: {
    id: string
    name: string | null
    email: string
  }
}

export default function DepositDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  
  const [deposit, setDeposit] = useState<Deposit | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Edit form state
  const [editNotes, setEditNotes] = useState('')
  const [editTrackingIn, setEditTrackingIn] = useState('')
  const [newTrackingIn, setNewTrackingIn] = useState('')

  const id = params.id as string
  const isEditMode = searchParams.get('edit') === 'true'

  useEffect(() => {
    if (isEditMode) {
      setEditing(true)
    }
  }, [isEditMode])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (user && id) {
      fetchDeposit()
    }
  }, [user, userLoading, router, id])

  const fetchDeposit = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vault/deposits/${id}`)
      if (res.ok) {
        const data = await res.json()
        setDeposit(data.data)
        setEditNotes(data.data.notes || '')
        setEditTrackingIn(data.data.trackingIn || '')
        setNewTrackingIn(data.data.trackingIn || '')
      } else {
        toast({
          title: 'Error',
          description: 'Deposito non trovato',
          variant: 'destructive',
        })
        router.push('/vault/deposits')
      }
    } catch (error) {
      console.error('Error fetching deposit:', error)
      toast({
        title: 'Error',
        description: 'Errore nel caricamento del deposito',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!deposit) return

    try {
      setSubmitting(true)
      const res = await fetch(`/api/vault/deposits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: editNotes,
          trackingIn: editTrackingIn || undefined,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Successo',
          description: 'Deposito aggiornato',
        })
        setEditing(false)
        fetchDeposit()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Errore nell\'aggiornamento',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkShipped = async () => {
    if (!newTrackingIn.trim()) {
      toast({
        title: 'Error',
        description: 'Inserisci il codice di tracking',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch(`/api/vault/deposits/${id}/mark-shipped`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingIn: newTrackingIn,
        }),
      })

      if (res.ok) {
        toast({
          title: 'Successo',
          description: 'Tracking aggiornato',
        })
        fetchDeposit()
      } else {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Errore nell\'aggiornamento',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      CREATED: { label: 'Creato', className: 'bg-gray-500 text-white' },
      RECEIVED: { label: 'Ricevuto', className: 'bg-blue-500 text-white' },
      IN_REVIEW: { label: 'In Revisione', className: 'bg-yellow-500 text-white' },
      ACCEPTED: { label: 'Accettato', className: 'bg-green-500 text-white' },
      PARTIAL: { label: 'Parziale', className: 'bg-orange-500 text-white' },
      REJECTED: { label: 'Rifiutato', className: 'bg-red-500 text-white' },
      DISTRIBUTED: { label: 'Distribuito', className: 'bg-purple-500 text-white' },
      CLOSED: { label: 'Chiuso', className: 'bg-gray-600 text-white' },
    }
    return statusMap[status] || { label: status, className: 'bg-gray-500 text-white' }
  }

  const getItemStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING_REVIEW: { label: 'In Revisione', className: 'bg-yellow-500/10 text-yellow-500' },
      ACCEPTED: { label: 'Accettato', className: 'bg-green-500/10 text-green-500' },
      REJECTED: { label: 'Rifiutato', className: 'bg-red-500/10 text-red-500' },
      IN_CASE: { label: 'In Vault', className: 'bg-blue-500/10 text-blue-500' },
      LISTED_ONLINE: { label: 'In Vendita', className: 'bg-orange-500/10 text-orange-500' },
      ASSIGNED_TO_SHOP: { label: 'In Transito', className: 'bg-purple-500/10 text-purple-500' },
      SOLD: { label: 'Venduta', className: 'bg-emerald-500/10 text-emerald-500' },
    }
    return statusMap[status] || { label: status, className: 'bg-gray-500/10 text-gray-500' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  if (!deposit) {
    return null
  }

  const statusBadge = getStatusBadge(deposit.status)
  const hubAddress = process.env.NEXT_PUBLIC_HUB_ADDRESS || 'Via Tindari 15, 97100 Ragusa, Italia'

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/vault/deposits')}
                  className="mb-4"
                >
                  <span className="material-symbols-outlined mr-2">arrow_back</span>
                  Torna ai Depositi
                </Button>
                <h1 className="text-4xl font-bold mb-2">Deposito #{deposit.id.slice(-8)}</h1>
                <div className="flex items-center gap-4">
                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Creato il {formatDate(deposit.createdAt)}
                  </span>
                </div>
              </div>
              {deposit.status === 'CREATED' && !editing && (
                <Button
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <span className="material-symbols-outlined mr-2">edit</span>
                  Modifica
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Info Card */}
                <Card className="glass-panel p-6">
                  <CardHeader>
                    <CardTitle>Informazioni Deposito</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editing && deposit.status === 'CREATED' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="notes">Note</Label>
                          <Textarea
                            id="notes"
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Note sul deposito..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="trackingIn">Tracking In</Label>
                          <Input
                            id="trackingIn"
                            value={editTrackingIn}
                            onChange={(e) => setEditTrackingIn(e.target.value)}
                            placeholder="Codice di tracking"
                            className="h-12"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdate}
                            disabled={submitting}
                            className="bg-primary hover:bg-primary-dark"
                          >
                            {submitting ? 'Salvataggio...' : 'Salva Modifiche'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEditing(false)
                              setEditNotes(deposit.notes || '')
                              setEditTrackingIn(deposit.trackingIn || '')
                            }}
                          >
                            Annulla
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {deposit.notes && (
                          <div>
                            <Label className="text-sm font-semibold">Note</Label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{deposit.notes}</p>
                          </div>
                        )}
                        {deposit.trackingIn ? (
                          <div>
                            <Label className="text-sm font-semibold">Tracking In</Label>
                            <p className="text-sm font-mono text-gray-700 dark:text-gray-300 mt-1">
                              {deposit.trackingIn}
                            </p>
                          </div>
                        ) : deposit.status === 'CREATED' ? (
                          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                            <h4 className="font-bold mb-2">Aggiungi Tracking</h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                              Hai già spedito? Inserisci il codice di tracking qui sotto.
                            </p>
                            <div className="flex gap-2">
                              <Input
                                value={newTrackingIn}
                                onChange={(e) => setNewTrackingIn(e.target.value)}
                                placeholder="Codice di tracking"
                                className="flex-1"
                              />
                              <Button
                                onClick={handleMarkShipped}
                                disabled={submitting || !newTrackingIn.trim()}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                {submitting ? 'Salvataggio...' : 'Salva'}
                              </Button>
                            </div>
                          </Card>
                        ) : null}
                        {deposit.receivedAt && (
                          <div>
                            <Label className="text-sm font-semibold">Ricevuto il</Label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {formatDate(deposit.receivedAt)}
                            </p>
                          </div>
                        )}
                        {deposit.reviewedAt && (
                          <div>
                            <Label className="text-sm font-semibold">Revisionato il</Label>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {formatDate(deposit.reviewedAt)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Items Card */}
                <Card className="glass-panel p-6">
                  <CardHeader>
                    <CardTitle>Carte nel Deposito ({deposit.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deposit.items.map((item) => {
                        const itemStatusBadge = getItemStatusBadge(item.status)
                        return (
                          <Card key={item.id} className="p-4 border-2 border-gray-200 dark:border-gray-700">
                            <div className="flex items-start gap-4">
                              {item.photos[0] && (
                                <img
                                  src={item.photos[0]}
                                  alt={item.name}
                                  className="w-24 h-24 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-bold text-lg">{item.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {item.game} {item.set && `• ${item.set}`} • {item.conditionDeclared}
                                    </p>
                                  </div>
                                  <Badge className={itemStatusBadge.className}>
                                    {itemStatusBadge.label}
                                  </Badge>
                                </div>
                                {item.conditionVerified && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Condizione verificata: <strong>{item.conditionVerified}</strong>
                                  </p>
                                )}
                                {item.priceFinal && (
                                  <p className="text-sm font-semibold text-primary mt-1">
                                    Prezzo finale: €{item.priceFinal.toFixed(2)}
                                  </p>
                                )}
                                {item.shop && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Negozio: <strong>{item.shop.name}</strong>
                                  </p>
                                )}
                                {item.slot && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    Slot: <strong>{item.slot.slotCode}</strong>
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Hub Address */}
                <Card className="glass-panel p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-500">location_on</span>
                    Indirizzo Hub SafeTrade
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {hubAddress}
                  </p>
                </Card>

                {/* Quick Actions */}
                {deposit.status === 'CREATED' && (
                  <Card className="glass-panel p-6">
                    <h4 className="font-bold mb-4">Azioni Rapide</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setEditing(true)}
                      >
                        <span className="material-symbols-outlined mr-2">edit</span>
                        Modifica Deposito
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-500 hover:text-red-600"
                        onClick={async () => {
                          if (confirm('Sei sicuro di voler eliminare questo deposito?')) {
                            try {
                              const res = await fetch(`/api/vault/deposits/${id}`, {
                                method: 'DELETE',
                              })
                              if (res.ok) {
                                toast({
                                  title: 'Successo',
                                  description: 'Deposito eliminato',
                                })
                                router.push('/vault/deposits')
                              }
                            } catch (error) {
                              toast({
                                title: 'Error',
                                description: 'Errore nell\'eliminazione',
                                variant: 'destructive',
                              })
                            }
                          }
                        }}
                      >
                        <span className="material-symbols-outlined mr-2">delete</span>
                        Elimina Deposito
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

