'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Package {
  id: string
  status: string
  packageStatus: string | null
  trackingNumber: string | null
  returnTrackingNumber: string | null
  packageReceivedAt: string | null
  packageVerifiedAt: string | null
  packageShippedAt: string | null
  userA: { id: string; name: string | null; email: string; avatar: string | null }
  userB: { id: string; name: string | null; email: string; avatar: string | null }
  proposal: {
    listing: {
      id: string
      title: string
      images: string[]
    }
  } | null
  escrowPayment: {
    id: string
    amount: number
    status: string
  } | null
}

export default function HubPackagesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (userLoading) return

    // Check authorization
    if (!user || (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN')) {
      toast({
        title: 'Accesso Negato',
        description: 'Solo HUB_STAFF e ADMIN possono accedere a questa pagina.',
        variant: 'destructive',
      })
      router.push('/dashboard')
      return
    }

    fetchPackages()
  }, [user, userLoading, filter])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }

      const res = await fetch(`/api/admin/hub/packages?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPackages(data.packages || [])
      } else {
        throw new Error('Failed to fetch packages')
      }
    } catch (error) {
      console.error('Error fetching packages:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i pacchi',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReceive = async (packageId: string) => {
    try {
      const res = await fetch(`/api/admin/hub/packages/${packageId}/receive`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore')
      }

      toast({
        title: '✅ Pacco Ricevuto',
        description: 'Il pacco è stato marcato come ricevuto.',
      })

      fetchPackages()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile marcare il pacco come ricevuto',
        variant: 'destructive',
      })
    }
  }

  const handleStartVerification = async (packageId: string) => {
    try {
      const res = await fetch(`/api/admin/hub/packages/${packageId}/start-verification`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore')
      }

      toast({
        title: '✅ Verifica Avviata',
        description: 'La verifica è stata avviata.',
      })

      router.push(`/admin/hub/packages/${packageId}/verify`)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile avviare la verifica',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      AWAITING_HUB_RECEIPT: { label: 'In Attesa Ricezione', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
      HUB_RECEIVED: { label: 'Ricevuto', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      VERIFICATION_IN_PROGRESS: { label: 'Verifica in Corso', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      VERIFICATION_PASSED: { label: 'Verifica OK', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      VERIFICATION_FAILED: { label: 'Verifica Fallita', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
      SHIPPED_TO_BUYER: { label: 'Rispedito', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
      DELIVERED_TO_BUYER: { label: 'Consegnato', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
      CONFIRMED_BY_BUYER: { label: 'Confermato', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
    }

    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    )
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Gestione Pacchi Verified Escrow</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestisci i pacchi ricevuti all'hub SafeTrade
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Tutti
            </Button>
            <Button
              variant={filter === 'AWAITING_HUB_RECEIPT' ? 'default' : 'outline'}
              onClick={() => setFilter('AWAITING_HUB_RECEIPT')}
            >
              In Attesa
            </Button>
            <Button
              variant={filter === 'HUB_RECEIVED' ? 'default' : 'outline'}
              onClick={() => setFilter('HUB_RECEIVED')}
            >
              Ricevuti
            </Button>
            <Button
              variant={filter === 'VERIFICATION_IN_PROGRESS' ? 'default' : 'outline'}
              onClick={() => setFilter('VERIFICATION_IN_PROGRESS')}
            >
              In Verifica
            </Button>
            <Button
              variant={filter === 'VERIFICATION_PASSED' ? 'default' : 'outline'}
              onClick={() => setFilter('VERIFICATION_PASSED')}
            >
              Verificati
            </Button>
          </div>

          {/* Packages List */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="glass-panel p-6 animate-pulse">
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
                </Card>
              ))}
            </div>
          ) : packages.length === 0 ? (
            <Card className="glass-panel p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                inventory_2
              </span>
              <h2 className="text-2xl font-bold mb-2">Nessun Pacco Trovato</h2>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'all' 
                  ? 'Non ci sono pacchi al momento.'
                  : `Non ci sono pacchi con stato: ${filter}`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg">Transazione #{pkg.id.slice(0, 8)}</h3>
                        {getStatusBadge(pkg.status)}
                      </div>
                      {pkg.proposal?.listing && (
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {pkg.proposal.listing.title}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Buyer:</span>{' '}
                          <span className="font-medium">{pkg.userA.name || pkg.userA.email}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Seller:</span>{' '}
                          <span className="font-medium">{pkg.userB.name || pkg.userB.email}</span>
                        </div>
                        {pkg.trackingNumber && (
                          <div>
                            <span className="text-gray-500">Tracking:</span>{' '}
                            <span className="font-mono">{pkg.trackingNumber}</span>
                          </div>
                        )}
                        {pkg.escrowPayment && (
                          <div>
                            <span className="text-gray-500">Importo:</span>{' '}
                            <span className="font-bold">€{pkg.escrowPayment.amount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {pkg.status === 'AWAITING_HUB_RECEIPT' && (
                      <Button
                        onClick={() => handleReceive(pkg.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <span className="material-symbols-outlined mr-2 text-sm">inventory</span>
                        Marca come Ricevuto
                      </Button>
                    )}
                    {pkg.status === 'HUB_RECEIVED' && (
                      <Button
                        onClick={() => handleStartVerification(pkg.id)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <span className="material-symbols-outlined mr-2 text-sm">verified</span>
                        Avvia Verifica
                      </Button>
                    )}
                    {pkg.status === 'VERIFICATION_IN_PROGRESS' && (
                      <Button
                        onClick={() => router.push(`/admin/hub/packages/${pkg.id}/verify`)}
                        className="bg-primary hover:bg-primary-dark"
                      >
                        <span className="material-symbols-outlined mr-2 text-sm">photo_camera</span>
                        Completa Verifica
                      </Button>
                    )}
                    {pkg.status === 'VERIFICATION_PASSED' && (
                      <Button
                        onClick={() => router.push(`/admin/hub/packages/${pkg.id}/ship`)}
                        variant="outline"
                      >
                        <span className="material-symbols-outlined mr-2 text-sm">local_shipping</span>
                        Rispedisci a Buyer
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push(`/transaction/${pkg.id}/status`)}
                      variant="outline"
                    >
                      Dettagli
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}


