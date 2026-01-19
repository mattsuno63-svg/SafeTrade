'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

interface Deposit {
  id: string
  trackingIn: string | null
  status: string
  notes: string | null
  createdAt: string
  receivedAt: string | null
  reviewedAt: string | null
  items: {
    id: string
    name: string
    game: string
    status: string
  }[]
  _count: {
    items: number
  }
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tutti gli Status' },
  { value: 'CREATED', label: 'Creato' },
  { value: 'RECEIVED', label: 'Ricevuto' },
  { value: 'IN_REVIEW', label: 'In Revisione' },
  { value: 'ACCEPTED', label: 'Accettato' },
  { value: 'PARTIAL', label: 'Parziale' },
  { value: 'REJECTED', label: 'Rifiutato' },
  { value: 'DISTRIBUTED', label: 'Distribuito' },
  { value: 'CLOSED', label: 'Chiuso' },
]

export default function DepositsPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchDeposits = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      const res = await fetch(`/api/vault/deposits?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setDeposits(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching deposits:', error)
      toast({
        title: 'Error',
        description: 'Errore nel caricamento dei depositi',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, toast])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchDeposits()
    }
  }, [user, userLoading, router, fetchDeposits])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-2">I Miei Depositi</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestisci i tuoi depositi SafeVault
                </p>
              </div>
              <Button
                onClick={() => router.push('/vault/deposit/new')}
                className="bg-primary hover:bg-primary-dark"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Nuovo Deposito
              </Button>
            </div>

            {/* Filters */}
            <Card className="glass-panel p-4 mb-6">
              <div className="flex items-center gap-4">
                <Label>Filtra per Status:</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {/* Deposits List */}
            {deposits.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                  inventory_2
                </span>
                <h3 className="font-bold text-xl mb-2">Nessun Deposito</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Non hai ancora creato nessun deposito. Crea il tuo primo deposito per iniziare!
                </p>
                <Button
                  onClick={() => router.push('/vault/deposit/new')}
                  className="bg-primary hover:bg-primary-dark"
                >
                  <span className="material-symbols-outlined mr-2">add</span>
                  Crea Primo Deposito
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deposits.map((deposit) => {
                  const statusBadge = getStatusBadge(deposit.status)
                  return (
                    <Link key={deposit.id} href={`/vault/deposits/${deposit.id}`}>
                      <Card className="glass-panel p-6 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer h-full">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-bold text-lg mb-1">Deposito #{deposit.id.slice(-8)}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(deposit.createdAt)}
                            </p>
                          </div>
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Carte:</span>
                            <span className="font-bold">{deposit._count.items}</span>
                          </div>
                          {deposit.trackingIn && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-blue-500 text-sm">local_shipping</span>
                              <span className="text-gray-600 dark:text-gray-400">Tracking:</span>
                              <span className="font-mono text-xs">{deposit.trackingIn}</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        {deposit.status === 'CREATED' && (
                          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={(e) => {
                                e.preventDefault()
                                router.push(`/vault/deposits/${deposit.id}?edit=true`)
                              }}
                            >
                              Modifica
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-500 hover:text-red-600"
                              onClick={async (e) => {
                                e.preventDefault()
                                if (confirm('Sei sicuro di voler eliminare questo deposito?')) {
                                  try {
                                    const res = await fetch(`/api/vault/deposits/${deposit.id}`, {
                                      method: 'DELETE',
                                    })
                                    if (res.ok) {
                                      toast({
                                        title: 'Successo',
                                        description: 'Deposito eliminato',
                                      })
                                      fetchDeposits()
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
                              Elimina
                            </Button>
                          </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <Button
                            variant="ghost"
                            className="w-full"
                            onClick={(e) => {
                              e.preventDefault()
                              router.push(`/vault/deposits/${deposit.id}`)
                            }}
                          >
                            Vedi Dettagli
                            <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                          </Button>
                        </div>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

