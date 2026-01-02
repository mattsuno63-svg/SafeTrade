'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatPriceNumber } from '@/lib/utils'

interface EscrowSession {
  id: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
  lastActivity: string
  transaction: {
    id: string
    status: string
    scheduledDate: string | null
    proposal: {
      listing: {
        id: string
        title: string
        images: string[]
        price: number | null
      }
    } | null
  }
  buyer: { id: string; name: string | null; avatar: string | null }
  seller: { id: string; name: string | null; avatar: string | null }
  merchant: { id: string; name: string | null; avatar: string | null }
  _count: { messages: number }
}

export default function EscrowSessionsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [sessions, setSessions] = useState<EscrowSession[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL')

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchSessions()
    }
  }, [user, userLoading, router])

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/escrow/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      toast({
        title: 'Error',
        description: 'Failed to load escrow sessions',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-blue-500',
      COMPLETED: 'bg-green-500',
      CANCELLED: 'bg-red-500',
      DISPUTED: 'bg-yellow-500',
    }
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>
  }

  const filteredSessions = filter === 'ALL' 
    ? sessions 
    : sessions.filter(s => s.status === filter)

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
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Escrow Sessions</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your SafeTrade escrow sessions and payments
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize whitespace-nowrap"
              >
                {f === 'ALL' ? 'All' : f.toLowerCase()}
              </Button>
            ))}
          </div>

          {/* Sessions List */}
          {filteredSessions.length === 0 ? (
            <Card className="glass-panel p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                security
              </span>
              <h3 className="text-xl font-bold mb-2">No Escrow Sessions</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === 'ALL' 
                  ? 'You don\'t have any escrow sessions yet.'
                  : `No ${filter.toLowerCase()} sessions found.`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => (
                <Link key={session.id} href={`/escrow/sessions/${session.id}`}>
                  <Card className="glass-panel p-6 hover:shadow-xl transition-all cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">
                          {session.transaction.proposal?.listing?.title || 'Transaction'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">Buyer:</span> {session.buyer.name || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Seller:</span> {session.seller.name || 'Unknown'}
                          </div>
                          <div>
                            <span className="font-medium">Merchant:</span> {session.merchant.name || 'Unknown'}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(session.status)}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400">chat</span>
                          <span>{session._count.messages} messages</span>
                        </div>
                        {session.transaction.proposal?.listing?.price && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">payments</span>
                            <span className="font-bold text-primary">
                              €{formatPriceNumber(session.transaction.proposal.listing.price)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Last activity: {new Date(session.lastActivity).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

