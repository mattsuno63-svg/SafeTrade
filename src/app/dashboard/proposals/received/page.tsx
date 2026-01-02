'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function ProposalsReceivedPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const res = await fetch('/api/proposals?type=received')
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

  const handleAccept = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to accept proposal')
      }

      toast({
        title: 'Success',
        description: 'Proposal accepted! Please select a store.',
      })

      // Redirect to select store
      router.push(`/select-store?proposalId=${proposalId}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to accept proposal',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (proposalId: string) => {
    if (!confirm('Are you sure you want to reject this proposal?')) return

    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reject proposal')
      }

      toast({
        title: 'Success',
        description: 'Proposal rejected',
      })

      // Refresh proposals
      const proposalsRes = await fetch('/api/proposals?type=received')
      if (proposalsRes.ok) {
        const data = await proposalsRes.json()
        setProposals(data.proposals || [])
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject proposal',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Received Proposals</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage proposals you've received for your listings
            </p>
          </div>

          {proposals.length === 0 ? (
            <Card className="glass-panel p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                inbox
              </span>
              <h2 className="text-2xl font-bold mb-2">No Proposals Yet</h2>
              <p className="text-gray-600 dark:text-gray-400">
                You haven't received any proposals yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <Card key={proposal.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold">{proposal.listing.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          proposal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' :
                          proposal.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {proposal.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">From:</span>
                          <span className="font-bold">{proposal.proposer.name || proposal.proposer.email}</span>
                        </div>
                        {proposal.offerPrice && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Offer Price:</span>
                            <span className="font-bold text-primary">€{proposal.offerPrice}</span>
                          </div>
                        )}
                        {proposal.message && (
                          <div className="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                            <p className="text-sm">{proposal.message}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {proposal.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAccept(proposal.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleReject(proposal.id)}
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          Reject
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
  )
}

