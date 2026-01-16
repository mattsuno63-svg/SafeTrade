'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Offer {
  id: string
  type: 'SALE' | 'TRADE'
  offerPrice?: number
  tradeItems?: string
  message?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  proposer: {
    id: string
    name?: string
    email: string
  }
  product: {
    id: string
    title: string
    price: number
    images: string[]
  }
}

export default function MerchantOffersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL')

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchOffers()
    }
  }, [user, userLoading, router])

  const fetchOffers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/merchant/offers')
      if (res.ok) {
        const data = await res.json()
        setOffers(Array.isArray(data) ? data : [])
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        if (res.status === 404) {
          // No shop found - this is ok, just show empty state
          setOffers([])
        } else {
          throw new Error(errorData.error || 'Failed to fetch offers')
        }
      }
    } catch (error: any) {
      console.error('Error fetching offers:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare le offerte',
        variant: 'destructive',
      })
      setOffers([]) // Set empty array on error to show empty state
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (offerId: string) => {
    try {
      const res = await fetch(`/api/merchant/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      if (!res.ok) throw new Error('Failed to accept offer')

      toast({
        title: 'Offer Accepted',
        description: 'The buyer will be notified.',
      })

      fetchOffers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (offerId: string) => {
    try {
      const res = await fetch(`/api/merchant/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      if (!res.ok) throw new Error('Failed to reject offer')

      toast({
        title: 'Offer Rejected',
        description: 'The buyer will be notified.',
      })

      fetchOffers()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const filteredOffers = filter === 'ALL' 
    ? offers 
    : offers.filter(o => o.status === filter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'ACCEPTED':
        return <Badge className="bg-green-500">Accepted</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>
      case 'CANCELLED':
        return <Badge className="bg-gray-500">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Offers Received</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage offers from customers for your products
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f.toLowerCase()}
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {offers.filter(o => o.status === 'PENDING').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {offers.filter(o => o.status === 'ACCEPTED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-red-500">
                  {offers.filter(o => o.status === 'REJECTED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Rejected</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold">{offers.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </Card>
            </div>

            {/* Offers List */}
            {filteredOffers.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  inbox
                </span>
                <h3 className="text-xl font-bold mb-2">No offers yet</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  When customers make offers on your products, they will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOffers.map((offer) => (
                  <Card key={offer.id} className="glass-panel p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Product Image */}
                      <div className="w-full md:w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                        {offer.product.images[0] ? (
                          <img
                            src={offer.product.images[0]}
                            alt={offer.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-400">
                              image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Offer Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{offer.product.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              From: {offer.proposer.name || offer.proposer.email}
                            </p>
                          </div>
                          {getStatusBadge(offer.status)}
                        </div>

                        <div className="flex flex-wrap gap-4 mb-3">
                          <div>
                            <span className="text-sm text-gray-500">Original Price:</span>
                            <span className="ml-2 font-medium">€{offer.product.price.toFixed(2)}</span>
                          </div>
                          {offer.offerPrice && (
                            <div>
                              <span className="text-sm text-gray-500">Offer:</span>
                              <span className="ml-2 font-bold text-primary">€{offer.offerPrice.toFixed(2)}</span>
                            </div>
                          )}
                          {offer.tradeItems && (
                            <div>
                              <span className="text-sm text-gray-500">Trade Items:</span>
                              <span className="ml-2">{offer.tradeItems}</span>
                            </div>
                          )}
                        </div>

                        {offer.message && (
                          <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-3">
                            "{offer.message}"
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {new Date(offer.createdAt).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>

                          {offer.status === 'PENDING' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-500 hover:bg-red-500/10"
                                onClick={() => handleReject(offer.id)}
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleAccept(offer.id)}
                              >
                                Accept
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
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

