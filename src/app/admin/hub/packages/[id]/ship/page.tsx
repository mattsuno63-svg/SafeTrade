'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function ShipToBuyerPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const packageId = params.id as string

  const [returnTrackingNumber, setReturnTrackingNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState<any>(null)

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transactions/${packageId}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      }
    }

    if (packageId) {
      fetchTransaction()
    }
  }, [packageId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!returnTrackingNumber.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci il return tracking number',
        variant: 'destructive',
      })
      return
    }

    // Basic validation
    const trackingPattern = /^[A-Z0-9]{8,20}$/i
    if (!trackingPattern.test(returnTrackingNumber.trim())) {
      toast({
        title: 'Errore',
        description: 'Formato tracking number non valido (8-20 caratteri alfanumerici)',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/hub/packages/${packageId}/ship-to-buyer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnTrackingNumber: returnTrackingNumber.trim() }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella rispedizione')
      }

      toast({
        title: '✅ Pacco Rispedito',
        description: 'Il pacco è stato marcato come rispedito all\'acquirente.',
      })

      router.push('/admin/hub/packages')
    } catch (error: any) {
      console.error('Error shipping to buyer:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile rispedire il pacco',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mb-4"
            >
              ← Indietro
            </Button>
            <h1 className="text-3xl font-bold mb-2">Rispedisci a Buyer</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Transazione #{packageId?.slice(0, 8)}
            </p>
          </div>

          {/* Form */}
          <Card className="glass-panel p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="returnTrackingNumber">Return Tracking Number *</Label>
                <Input
                  id="returnTrackingNumber"
                  type="text"
                  placeholder="XYZ789012345"
                  value={returnTrackingNumber}
                  onChange={(e) => setReturnTrackingNumber(e.target.value.toUpperCase())}
                  className="h-12"
                  required
                  maxLength={20}
                />
                <p className="text-xs text-gray-500">
                  Inserisci il tracking number per la rispedizione all'acquirente (8-20 caratteri alfanumerici)
                </p>
              </div>

              {transaction && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-bold mb-2">Dettagli Transazione</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Buyer:</span> {transaction.userA?.name || transaction.userA?.email}</p>
                    <p><span className="font-medium">Seller:</span> {transaction.userB?.name || transaction.userB?.email}</p>
                    {transaction.trackingNumber && (
                      <p><span className="font-medium">Tracking In:</span> <span className="font-mono">{transaction.trackingNumber}</span></p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary-dark"
                  disabled={loading}
                >
                  {loading ? 'Rispedizione...' : 'Rispedisci a Buyer'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}


