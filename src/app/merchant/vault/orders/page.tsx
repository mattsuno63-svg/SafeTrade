'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, Truck, MapPin } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface VaultOrder {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  item: {
    id: string
    name: string
    game: string
    set: string | null
    photos: string[]
    owner?: { id: string; name: string | null }
    case?: { id: string; label: string | null }
    slot?: { id: string; slotCode: string }
  }
  buyer: {
    id: string
    name: string | null
    email: string
  }
  fulfillment?: {
    id: string
    trackingCarrier: string | null
    trackingCode: string | null
    shippedAt: string | null
  } | null
}

export default function MerchantVaultOrdersPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [orders, setOrders] = useState<VaultOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/vault/merchant/orders?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }
    if (user) fetchOrders()
  }, [user, userLoading, router, fetchOrders])

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PENDING_PAYMENT: { label: 'In attesa pagamento', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      PAID: { label: 'Pagato', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      FULFILLING: { label: 'In preparazione', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      SHIPPED: { label: 'Spedito', className: 'bg-primary/20 text-primary border-primary/30' },
      DELIVERED: { label: 'Consegnato', className: 'bg-green-600/20 text-green-300 border-green-600/30' },
      CANCELLED: { label: 'Annullato', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      REFUNDED: { label: 'Rimborsato', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    }
    return map[status] || { label: status, className: 'bg-white/10 text-white/80 border-white/20' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark font-display flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen font-display bg-background-light dark:bg-background-dark text-[#101719] dark:text-white transition-colors duration-300">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(40, 122, 138, 0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/10 px-8 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-3">
                <div className="size-9 bg-primary flex items-center justify-center rounded-lg shadow-lg shadow-primary/20">
                  <span>🛡️</span>
                </div>
                <h2 className="text-xl font-extrabold tracking-tight">
                  SafeTrade <span className="text-primary">Vault</span>
                </h2>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <button
                  onClick={() => router.push('/merchant/vault')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => router.push('/merchant/vault/scan')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Scan Hub
                </button>
                <button
                  onClick={() => router.push('/merchant/vault/sales')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Vendite
                </button>
                <button className="text-sm font-semibold border-b-2 border-primary text-primary pb-1">
                  Ordini
                </button>
                <button
                  onClick={() => router.push('/merchant/vault/statement')}
                  className="text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity"
                >
                  Statement
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-10 max-w-7xl mx-auto w-full space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#101719] dark:text-white">
                Ordini{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-orange">
                  Vault
                </span>
              </h1>
              <p className="text-lg text-[#5a848c] dark:text-[#a0b0b3] font-medium">
                Ordini online da evadere (pick & ship).
              </p>
            </div>
            <Button
              onClick={() => router.push('/merchant/vault/scan?tab=fulfillment')}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white hover:shadow-lg hover:shadow-primary/30 rounded-xl font-bold transition-all"
            >
              <Truck className="h-5 w-5" />
              Fulfillment
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {['all', 'PAID', 'FULFILLING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
              <Button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  statusFilter === status ? 'bg-primary/20 border border-primary/40 text-primary' : 'glass hover:bg-white/10'
                }`}
              >
                {status === 'all' ? 'Tutti' : getStatusBadge(status).label}
              </Button>
            ))}
          </div>

          <div className="glass rounded-2xl overflow-hidden shadow-2xl shadow-black/5">
            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="h-16 w-16 mx-auto mb-4 text-[#5a848c] opacity-40" />
                <h3 className="text-xl font-bold mb-2">Nessun ordine</h3>
                <p className="text-[#5a848c] dark:text-[#a0b0b3] mb-6">
                  Non ci sono ordini nel periodo selezionato.
                </p>
                <Button
                  onClick={() => router.push('/merchant/vault/scan?tab=fulfillment')}
                  className="bg-primary text-white hover:shadow-lg hover:shadow-primary/30 rounded-xl font-bold"
                >
                  Vai al Fulfillment
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-primary/5 border-b border-primary/10">
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Data</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Carta</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Acquirente</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Importo</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Status</th>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-[#5a848c]">Tracking</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/5">
                    {orders.map((order) => {
                      const badge = getStatusBadge(order.status)
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-6 py-5 text-sm font-medium">{formatDate(order.createdAt)}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              {order.item.photos?.length > 0 && (
                                <div className="size-12 rounded-lg overflow-hidden bg-white/5">
                                  <Image
                                    src={order.item.photos[0]}
                                    alt={order.item.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div>
                                <p className="font-bold">{order.item.name}</p>
                                <p className="text-xs opacity-60">{order.item.game} {order.item.slot && `• Slot ${order.item.slot.slotCode}`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-sm">
                            <p className="font-medium">{order.buyer.name || order.buyer.email}</p>
                            <p className="text-xs opacity-60">{order.buyer.email}</p>
                          </td>
                          <td className="px-6 py-5 font-bold">
                            €{order.totalAmount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-5">
                            <Badge className={badge.className}>{badge.label}</Badge>
                          </td>
                          <td className="px-6 py-5 text-sm">
                            {order.fulfillment?.trackingCode ? (
                              <span className="font-mono text-primary">
                                {order.fulfillment.trackingCarrier && `${order.fulfillment.trackingCarrier} `}
                                {order.fulfillment.trackingCode}
                              </span>
                            ) : (
                              <span className="text-white/40">—</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {(order.status === 'PAID' || order.status === 'FULFILLING') && (
                              <Button
                                size="sm"
                                onClick={() => router.push('/merchant/vault/scan?tab=fulfillment')}
                                className="bg-primary text-white"
                              >
                                Evadi
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
