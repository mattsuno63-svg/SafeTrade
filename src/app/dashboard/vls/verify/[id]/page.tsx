'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function VLSVerifyPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const [qrCodeInput, setQrCodeInput] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState<any>(null)

  // Fetch transaction on mount
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
      }
    }
    fetchTransaction()
  }, [id])

  const handleQRScan = async () => {
    if (!qrCodeInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter QR code data',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData: qrCodeInput }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Check-in failed')
      }

      toast({
        title: 'Success',
        description: 'Customer checked in successfully!',
      })

      // Refresh transaction data
      const transactionRes = await fetch(`/api/transactions/${id}`)
      if (transactionRes.ok) {
        const data = await transactionRes.json()
        setTransaction(data)
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Check-in failed',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (verified: boolean) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified,
          notes: verificationNotes,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Verification failed')
      }

      toast({
        title: 'Success',
        description: verified ? 'Transaction verified and completed!' : 'Transaction cancelled',
      })

      router.push(`/dashboard/vls/review/${id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Verification failed',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      <Header />

      <main className="py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Verify Transaction</h1>
            <p className="text-white/70">Scan QR code and verify the transaction</p>
          </div>

          {transaction && (
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Transaction Details</h3>
              <div className="space-y-2 text-sm">
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
                {transaction.scheduledDate && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Scheduled:</span>
                    <span>{transaction.scheduledDate} at {transaction.scheduledTime}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* QR Code Scan */}
          <Card className="glass-panel p-6 mb-6">
            <h3 className="font-bold text-lg mb-4">Scan QR Code</h3>
            <div className="space-y-4">
              <div>
                <Label>QR Code Data</Label>
                <Input
                  className="mt-2 bg-white/5 border-white/10 text-white"
                  placeholder="Paste QR code data here or scan with camera"
                  value={qrCodeInput}
                  onChange={(e) => setQrCodeInput(e.target.value)}
                />
              </div>
              <Button
                onClick={handleQRScan}
                disabled={loading || !qrCodeInput.trim()}
                className="w-full bg-primary hover:bg-primary-dark"
              >
                {loading ? 'Processing...' : 'Verify QR Code & Check In'}
              </Button>
            </div>
          </Card>

          {/* Verification */}
          {transaction?.status === 'CONFIRMED' && (
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Verify Cards</h3>
              <div className="space-y-4">
                <div>
                  <Label>Verification Notes</Label>
                  <textarea
                    className="mt-2 w-full rounded-xl bg-white/5 border-white/10 p-4 text-white placeholder:text-white/50"
                    rows={4}
                    placeholder="Enter verification notes (card condition, authenticity, etc.)"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleVerify(true)}
                    disabled={loading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    Verify & Complete
                  </Button>
                  <Button
                    onClick={() => handleVerify(false)}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                  >
                    Cancel Transaction
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

