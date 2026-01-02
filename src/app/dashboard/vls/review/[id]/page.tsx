'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function VLSReviewPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transactions/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransaction()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background-dark text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Transaction not found</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      <Header />

      <main className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Review Transaction</h1>
            <p className="text-white/70">Review transaction details before final confirmation</p>
          </div>

          <Card className="glass-panel p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Transaction Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/70">Transaction ID:</span>
                <span className="font-mono text-sm">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Status:</span>
                <span className="font-bold">{transaction.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">User A:</span>
                <span>{transaction.userA?.name || transaction.userA?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">User B:</span>
                <span>{transaction.userB?.name || transaction.userB?.email}</span>
              </div>
              {transaction.shop && (
                <div className="flex justify-between">
                  <span className="text-white/70">Store:</span>
                  <span>{transaction.shop.name}</span>
                </div>
              )}
              {transaction.checkedInAt && (
                <div className="flex justify-between">
                  <span className="text-white/70">Checked In:</span>
                  <span>{new Date(transaction.checkedInAt).toLocaleString()}</span>
                </div>
              )}
              {transaction.notes && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-white/70 block mb-2">Verification Notes:</span>
                  <p className="text-sm">{transaction.notes}</p>
                </div>
              )}
            </div>
          </Card>

          {transaction.proposal?.listing && (
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Listing Details</h3>
              <div className="space-y-2">
                <div className="font-bold">{transaction.proposal.listing.title}</div>
                {transaction.proposal.listing.images?.[0] && (
                  <img
                    src={transaction.proposal.listing.images[0]}
                    alt={transaction.proposal.listing.title}
                    className="w-32 h-48 object-cover rounded-lg mt-2"
                  />
                )}
              </div>
            </Card>
          )}

          <div className="flex gap-4">
            <Button
              onClick={() => router.push(`/dashboard/vls/appointments`)}
              variant="outline"
              className="flex-1 border-white/10"
            >
              Back to Appointments
            </Button>
            {transaction.status === 'COMPLETED' && (
              <Button
                onClick={() => router.push(`/transaction/${id}/outcome`)}
                className="flex-1 bg-primary hover:bg-primary-dark"
              >
                View Outcome
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

