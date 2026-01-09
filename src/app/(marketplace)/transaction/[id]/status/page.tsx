'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import QRCode from 'qrcode'

interface Transaction {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string | null
  scheduledTime: string | null
  notes: string | null
  createdAt: string
  userA: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
  userB: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
  shop: {
    id: string
    name: string
    address: string | null
    city: string | null
  }
  proposal?: {
    listing: {
      title: string
      images: string[]
    }
    offerPrice: number | null
    tradeItems: string | null
    type: string
  }
}

interface EscrowSession {
  id: string
  qrCode: string
  totalAmount: number
  feePercentage: number
  feePaidBy: 'SELLER' | 'BUYER'
  feeAmount: number
  finalAmount: number
  paymentMethod: string
  status: string
}

export default function TransactionStatusPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [escrowSession, setEscrowSession] = useState<EscrowSession | null>(null)
  const [qrCodeData, setQrCodeData] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string>('')
  const [cancelling, setCancelling] = useState(false)

  const handleCancelTransaction = async () => {
    if (!transaction || !user) return
    
    const confirmed = window.confirm('Sei sicuro di voler annullare questa transazione? Questa azione non può essere annullata.')
    if (!confirmed) return

    setCancelling(true)
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: 'Cancelled by user',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to cancel transaction')
      }

      toast({
        title: 'Transazione Annullata',
        description: 'La transazione è stata annullata con successo',
      })

      router.push('/dashboard')
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile annullare la transazione',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        // Fetch transaction
        const res = await fetch(`/api/transactions/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
          
          // Fetch escrow session
          const escrowRes = await fetch(`/api/escrow/sessions?transactionId=${id}`)
          if (escrowRes.ok) {
            const escrowData = await escrowRes.json()
            setEscrowSession(escrowData)

            // Fetch QR code from API
            if (escrowData.id) {
              const qrRes = await fetch(`/api/escrow/sessions/${escrowData.id}/qr`)
              if (qrRes.ok) {
                const qrData = await qrRes.json()
                setQrCodeData(qrData.qrData) // This is the data URL
                setQrCode(qrData.qrCode) // This is the unique code string
              }
            }
          }
        } else {
          toast({
            title: 'Error',
            description: 'Transaction not found',
            variant: 'destructive',
          })
          router.push('/dashboard')
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
        toast({
          title: 'Error',
          description: 'Failed to load transaction',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchTransaction()
    }
  }, [id, user, router, toast])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500'
      case 'CONFIRMED':
        return 'bg-blue-500'
      case 'COMPLETED':
        return 'bg-green-500'
      case 'CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending'
      case 'CONFIRMED':
        return 'Confirmed'
      case 'COMPLETED':
        return 'Completed'
      case 'CANCELLED':
        return 'Cancelled'
      default:
        return status
    }
  }

  const getOtherUser = () => {
    if (!transaction || !user) return null
    return transaction.userA.id === user.id ? transaction.userB : transaction.userA
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  if (!transaction) {
    return null
  }

  const otherUser = getOtherUser()

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            {/* Status Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getStatusColor(transaction.status)}/20 mb-4`}>
                <span className={`material-symbols-outlined text-4xl ${getStatusColor(transaction.status).replace('bg-', 'text-')}`}>
                  {transaction.status === 'COMPLETED' ? 'check_circle' :
                   transaction.status === 'CANCELLED' ? 'cancel' :
                   transaction.status === 'CONFIRMED' ? 'verified' :
                   'schedule'}
                </span>
              </div>
              <h1 className="text-3xl font-bold mb-2">SafeTrade Transaction</h1>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(transaction.status)}/20`}>
                <span className={`w-2 h-2 rounded-full ${getStatusColor(transaction.status)}`}></span>
                <span className="font-bold">{getStatusLabel(transaction.status)}</span>
              </div>
            </div>

            {/* QR Code Card - Large and prominent! */}
            {transaction.status !== 'COMPLETED' && transaction.status !== 'CANCELLED' && (
              <Card className="glass-panel p-8 mb-8 border-2 border-primary/20">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">📱 Il Tuo Codice QR</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Presenta questo codice al negozio il giorno dell'appuntamento
                  </p>
                </div>

                {qrCodeData ? (
                  <div className="flex flex-col items-center">
                    {/* QR Code - Large and centered */}
                    <div className="inline-block p-6 bg-white rounded-3xl shadow-2xl mb-6">
                      <img src={qrCodeData} alt="QR Code" className="w-64 h-64" />
                    </div>

                    {/* QR Code String */}
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-2">Codice univoco:</p>
                      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm">
                        {qrCode}
                      </div>
                    </div>

                    {/* Payment Breakdown */}
                    {escrowSession && (
                      <div className="w-full max-w-md bg-white/50 dark:bg-black/20 rounded-2xl p-6">
                        <h3 className="font-bold mb-4">💰 Dettaglio Pagamento</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Prezzo articolo:</span>
                            <span className="font-bold">€{escrowSession.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">
                              Commissione SafeTrade ({escrowSession.feePercentage}%):
                            </span>
                            <span className="font-bold">€{escrowSession.feeAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Pagata da:</span>
                            <span className="font-semibold">
                              {escrowSession.feePaidBy === 'SELLER' ? '👤 Venditore' : '🛒 Acquirente'}
                            </span>
                          </div>
                          <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-lg">
                            <span className="font-bold">
                              {user?.id === transaction.userA.id 
                                ? 'Pagherai:' 
                                : 'Riceverai:'}
                            </span>
                            <span className="font-bold text-primary text-xl">
                              €{escrowSession.finalAmount.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Download/Print Buttons */}
                    <div className="flex gap-3 mt-6">
                      <Button
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = qrCodeData
                          link.download = `safetrade-${qrCode}.png`
                          link.click()
                        }}
                        variant="outline"
                        className="gap-2"
                      >
                        <span className="material-symbols-outlined">download</span>
                        Scarica QR
                      </Button>
                      <Button
                        onClick={() => window.print()}
                        variant="outline"
                        className="gap-2"
                      >
                        <span className="material-symbols-outlined">print</span>
                        Stampa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-64 h-64 bg-gray-200 dark:bg-gray-700 rounded-3xl animate-pulse mb-4" />
                    <p className="text-sm text-gray-500">Generazione QR code in corso...</p>
                  </div>
                )}
              </Card>
            )}

            {/* Transaction Details */}
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Transaction Details</h3>
              
              {/* Item */}
              {transaction.proposal?.listing && (
                <div className="flex items-center gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl mb-4">
                  {transaction.proposal.listing.images[0] && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={transaction.proposal.listing.images[0]}
                        alt={transaction.proposal.listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold">{transaction.proposal.listing.title}</h4>
                    {transaction.proposal.offerPrice && (
                      <p className="text-primary font-bold">€{transaction.proposal.offerPrice.toLocaleString()}</p>
                    )}
                    {transaction.proposal.tradeItems && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Trade: {transaction.proposal.tradeItems}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Other Party */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400">person</span>
                  <div>
                    <p className="text-sm text-gray-500">Trading with</p>
                    <p className="font-bold">{otherUser?.name || otherUser?.email}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Appointment Details */}
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4">Appointment</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">store</span>
                  <div>
                    <p className="text-sm text-gray-500">Store</p>
                    <p className="font-bold">{transaction.shop.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {[transaction.shop.address, transaction.shop.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                {transaction.scheduledDate && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-bold">
                        {new Date(transaction.scheduledDate).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {transaction.scheduledTime && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-bold">{transaction.scheduledTime}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Timeline */}
            <Card className="glass-panel p-6">
              <h3 className="font-bold text-lg mb-4">Transaction Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">check</span>
                  </div>
                  <div>
                    <p className="font-bold">Transaction Created</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${
                    transaction.status !== 'PENDING' ? 'bg-green-500' : 'bg-gray-300'
                  } flex items-center justify-center flex-shrink-0`}>
                    {transaction.status !== 'PENDING' ? (
                      <span className="material-symbols-outlined text-white text-sm">check</span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </div>
                  <div>
                    <p className={transaction.status !== 'PENDING' ? 'font-bold' : 'text-gray-400'}>
                      Check-in at Store
                    </p>
                    <p className="text-sm text-gray-500">Both parties check in with QR code</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full ${
                    transaction.status === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-300'
                  } flex items-center justify-center flex-shrink-0`}>
                    {transaction.status === 'COMPLETED' ? (
                      <span className="material-symbols-outlined text-white text-sm">check</span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white"></span>
                    )}
                  </div>
                  <div>
                    <p className={transaction.status === 'COMPLETED' ? 'font-bold' : 'text-gray-400'}>
                      Transaction Complete
                    </p>
                    <p className="text-sm text-gray-500">Exchange verified and completed</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
                className="flex-1"
              >
                Back to Dashboard
              </Button>
              {transaction.status === 'PENDING' && (
                <Button
                  onClick={handleCancelTransaction}
                  disabled={cancelling}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                >
                  {cancelling ? 'Annullamento...' : 'Annulla Transazione'}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

