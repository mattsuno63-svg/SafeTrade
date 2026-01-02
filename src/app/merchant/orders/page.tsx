'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatPriceNumber } from '@/lib/utils'

interface Order {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string | null
  scheduledTime: string | null
  createdAt: string
  userA: {
    id: string
    name?: string | null
    email: string
  }
  userB: {
    id: string
    name?: string | null
    email: string
  }
  proposal: {
    id: string
    type: 'SALE' | 'TRADE' | 'BOTH'
    offerPrice?: number | null
    listing: {
      id: string
      title: string
      price?: number | null
      images: string[]
    }
  } | null
}

export default function MerchantOrdersPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchOrders()
    }
  }, [user, userLoading, router])

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/merchant/appointments')
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-500">Confirmed</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-500">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTotalAmount = (order: Order) => {
    if (order.proposal?.offerPrice) {
      return order.proposal.offerPrice
    }
    if (order.proposal?.listing?.price) {
      return order.proposal.listing.price
    }
    return 0
  }

  const filteredOrders = filter === 'ALL' 
    ? orders 
    : orders.filter(o => o.status === filter)

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    totalRevenue: orders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + getTotalAmount(o), 0),
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Ordini</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Gestisci tutti gli ordini e le transazioni SafeTrade
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Totali</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">In Attesa</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.confirmed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Confermati</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completati</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  €{formatPriceNumber(stats.totalRevenue)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ricavi</div>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="capitalize whitespace-nowrap"
                >
                  {f === 'ALL' ? 'Tutti' : f.toLowerCase()}
                </Button>
              ))}
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  shopping_bag
                </span>
                <h3 className="text-xl font-bold mb-2">Nessun ordine</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filter === 'ALL' 
                    ? 'Non ci sono ordini al momento.'
                    : `Non ci sono ordini ${filter.toLowerCase()}.`}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id} className="glass-panel p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Product Image */}
                      {order.proposal?.listing?.images?.[0] && (
                        <div className="w-full md:w-32 h-32 flex-shrink-0">
                          <img
                            src={order.proposal.listing.images[0]}
                            alt={order.proposal.listing.title}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Order Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg mb-1">
                              {order.proposal?.listing?.title || 'Ordine'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              ID: {order.id.slice(0, 8)}...
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Venditore</p>
                            <p className="font-medium">{order.userA?.name || order.userA?.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Acquirente</p>
                            <p className="font-medium">{order.userB?.name || order.userB?.email}</p>
                          </div>
                          {order.scheduledDate && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Data Appuntamento</p>
                              <p className="font-medium">
                                {new Date(order.scheduledDate).toLocaleDateString('it-IT')} 
                                {order.scheduledTime && ` alle ${order.scheduledTime}`}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Importo</p>
                            <p className="font-bold text-lg text-primary">
                              €{formatPriceNumber(getTotalAmount(order))}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-500">
                            Creato: {new Date(order.createdAt).toLocaleDateString('it-IT')}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/merchant/appointments`)}
                          >
                            <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                            Dettagli
                          </Button>
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

