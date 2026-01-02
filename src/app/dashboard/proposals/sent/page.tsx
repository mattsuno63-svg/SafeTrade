'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Proposal {
  id: string
  type: 'SALE' | 'TRADE' | 'BOTH'
  offerPrice: number | null
  tradeItems: string | null
  message: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
  listing: {
    id: string
    title: string
    images: string[]
    price: number | null
  }
  receiver: {
    id: string
    name: string | null
    email: string
  }
}

export default function ProposalsSentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const res = await fetch('/api/proposals?type=sent')
        if (res.ok) {
          const data = await res.json()
          setProposals(data.proposals || [])
        }
      } catch (error) {
        console.error('Error fetching proposals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [])

  const handleCancel = async (proposalId: string) => {
    if (!confirm('Are you sure you want to cancel this proposal?')) return

    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to cancel proposal')
      }

      toast({
        title: 'Success',
        description: 'Proposal cancelled',
      })

      // Refresh proposals
      const proposalsRes = await fetch('/api/proposals?type=sent')
      if (proposalsRes.ok) {
        const data = await proposalsRes.json()
        setProposals(data.proposals || [])
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel proposal',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
            <span className="material-symbols-outlined text-sm mr-1 align-middle">schedule</span>
            Pending
          </span>
        )
      case 'ACCEPTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-600 dark:text-green-400">
            <span className="material-symbols-outlined text-sm mr-1 align-middle">check_circle</span>
            Accepted
          </span>
        )
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-600 dark:text-red-400">
            <span className="material-symbols-outlined text-sm mr-1 align-middle">cancel</span>
            Rejected
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/20 text-gray-600 dark:text-gray-400">
            <span className="material-symbols-outlined text-sm mr-1 align-middle">block</span>
            Cancelled
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
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
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Sent Proposals</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Track the proposals you've sent to other sellers
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/dashboard/proposals/received">
                  <Button variant="outline">
                    <span className="material-symbols-outlined mr-2">inbox</span>
                    Received
                  </Button>
                </Link>
              </div>
            </div>

            {proposals.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                  send
                </span>
                <h2 className="text-2xl font-bold mb-2">No Proposals Sent</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You haven't sent any proposals yet. Browse the marketplace to find cards you like!
                </p>
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Browse Marketplace
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => (
                  <Card key={proposal.id} className="glass-panel overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Image */}
                      <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                        {proposal.listing.images[0] ? (
                          <img
                            src={proposal.listing.images[0]}
                            alt={proposal.listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                              image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Link
                              href={`/listings/${proposal.listing.id}`}
                              className="text-xl font-bold hover:text-primary transition-colors"
                            >
                              {proposal.listing.title}
                            </Link>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              To: {proposal.receiver.name || proposal.receiver.email}
                            </p>
                          </div>
                          {getStatusBadge(proposal.status)}
                        </div>

                        {/* Proposal Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
                            <p className="font-bold flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm">
                                {proposal.type === 'SALE' ? 'payments' : 'swap_horiz'}
                              </span>
                              {proposal.type === 'SALE' ? 'Purchase' : 'Trade'}
                            </p>
                          </div>
                          
                          {proposal.offerPrice && (
                            <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Offer</p>
                              <p className="font-bold text-primary">€{proposal.offerPrice.toLocaleString()}</p>
                            </div>
                          )}
                          
                          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sent On</p>
                            <p className="font-bold">
                              {new Date(proposal.createdAt).toLocaleDateString('it-IT', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Trade Items */}
                        {proposal.tradeItems && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Offering to Trade</p>
                            <p className="text-sm">{proposal.tradeItems}</p>
                          </div>
                        )}

                        {/* Message */}
                        {proposal.message && (
                          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Your Message</p>
                            <p className="text-sm">{proposal.message}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                          {proposal.status === 'PENDING' && (
                            <Button
                              onClick={() => handleCancel(proposal.id)}
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500/10"
                            >
                              Cancel Proposal
                            </Button>
                          )}
                          
                          {proposal.status === 'ACCEPTED' && (
                            <Link href={`/select-store?proposalId=${proposal.id}`}>
                              <Button className="bg-green-600 hover:bg-green-700">
                                <span className="material-symbols-outlined mr-2">store</span>
                                Select Store for SafeTrade
                              </Button>
                            </Link>
                          )}

                          <Link href={`/listings/${proposal.listing.id}`}>
                            <Button variant="outline">
                              View Listing
                            </Button>
                          </Link>
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

