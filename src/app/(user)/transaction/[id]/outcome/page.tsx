'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TransactionOutcomePage({ params }: { params: { id: string } }) {
  const { id } = params
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
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Transaction not found</div>
        </main>
      </div>
    )
  }

  const success = transaction.status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <Card className="glass-panel w-full max-w-2xl rounded-3xl p-8 sm:p-10">
            <div className="text-center mb-8">
              {success ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-green-500 text-5xl">check_circle</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2 text-green-600 dark:text-green-400">
                    Transaction Completed!
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your SafeTrade transaction has been successfully verified
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-red-500 text-5xl">cancel</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2 text-red-600 dark:text-red-400">
                    Transaction Failed
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    There was an issue with your transaction
                  </p>
                </>
              )}
            </div>

            {success && transaction.shop && (
              <div className="space-y-6 mb-8">
                <Card className="bg-white/50 dark:bg-black/20 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Store</span>
                      <span className="font-bold">{transaction.shop.name}</span>
                    </div>
                    {transaction.verifiedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Completed At</span>
                        <span className="font-medium">{new Date(transaction.verifiedAt).toLocaleString()}</span>
                      </div>
                    )}
                    {transaction.notes && (
                      <div className="flex items-start justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Notes</span>
                        <span className="font-medium text-right max-w-md">{transaction.notes}</span>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary-dark" asChild>
                <Link href="/marketplace">Continue Shopping</Link>
              </Button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}

