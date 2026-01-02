'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatPriceNumber } from '@/lib/utils'

interface EscrowSession {
  id: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'
  transaction: {
    id: string
    status: string
    scheduledDate: string | null
    scheduledTime: string | null
    userA: { id: string; name: string | null; avatar: string | null }
    userB: { id: string; name: string | null; avatar: string | null }
    shop: { id: string; name: string; address: string | null }
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
  messages: Array<{
    id: string
    content: string
    isSystem: boolean
    createdAt: string
    sender: { id: string; name: string | null; avatar: string | null; role: string }
  }>
  _count: { messages: number }
}

interface EscrowPayment {
  id: string
  amount: number
  status: 'PENDING' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'CANCELLED'
  paymentMethod: 'CASH' | 'ONLINE' | 'BANK_TRANSFER'
  riskScore: number | null
  flaggedForReview: boolean
  paymentHeldAt: string | null
  paymentReleasedAt: string | null
}

export default function EscrowSessionPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  
  const [session, setSession] = useState<EscrowSession | null>(null)
  const [payment, setPayment] = useState<EscrowPayment | null>(null)
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user) {
      fetchSession()
      fetchPayment()
      fetchQRCode()
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        fetchSession()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [user, sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session?.messages])

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/escrow/sessions/${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        setSession(data)
      }
    } catch (error) {
      console.error('Error fetching session:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayment = async () => {
    if (!session) return
    try {
      const res = await fetch(`/api/escrow/payments?transactionId=${session.transaction.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setPayment(data)
        }
      }
    } catch (error) {
      console.error('Error fetching payment:', error)
    }
  }

  const fetchQRCode = async () => {
    try {
      const res = await fetch(`/api/escrow/sessions/${sessionId}/qr`)
      if (res.ok) {
        const data = await res.json()
        setQrData(data)
      }
    } catch (error) {
      console.error('Error fetching QR code:', error)
    }
  }

  const downloadQRCode = () => {
    if (!qrData?.qrData) return
    
    // Create download link
    const link = document.createElement('a')
    link.href = qrData.qrData
    link.download = `SafeTrade-QR-${sessionId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: 'QR Code Scaricato',
      description: 'Il QR code è stato salvato sul tuo dispositivo',
    })
  }

  useEffect(() => {
    if (session) {
      fetchPayment()
    }
  }, [session])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/escrow/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      setMessage('')
      fetchSession()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const initiatePayment = async () => {
    if (!session) return

    const amount = session.transaction.proposal?.listing?.price || 
                   session.transaction.proposal?.offerPrice || 0

    if (amount <= 0) {
      toast({
        title: 'Error',
        description: 'No payment amount available',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch('/api/escrow/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: session.transaction.id,
          amount,
          paymentMethod: 'CASH',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to initiate payment')
      }

      toast({
        title: 'Success',
        description: 'Payment initiated. Funds will be held in escrow.',
      })

      fetchPayment()
      fetchSession()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate payment',
        variant: 'destructive',
      })
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

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-500',
      HELD: 'bg-blue-500',
      RELEASED: 'bg-green-500',
      REFUNDED: 'bg-orange-500',
      CANCELLED: 'bg-red-500',
    }
    return <Badge className={colors[status] || 'bg-gray-500'}>{status}</Badge>
  }

  const isBuyer = user?.id === session?.buyer.id
  const isSeller = user?.id === session?.seller.id
  const isMerchant = user?.id === session?.merchant.id

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="glass-panel p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This escrow session does not exist or you don't have access to it.
            </p>
            <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
          </Card>
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">Escrow Session</h1>
              {getStatusBadge(session.status)}
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Secure communication and payment management for your SafeTrade transaction
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chat Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Transaction Info */}
              <Card className="glass-panel p-6">
                <div className="flex items-start gap-4">
                  {session.transaction.proposal?.listing?.images?.[0] && (
                    <img
                      src={session.transaction.proposal.listing.images[0]}
                      alt={session.transaction.proposal.listing.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">
                      {session.transaction.proposal?.listing?.title || 'Transaction'}
                    </h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Buyer:</span>{' '}
                        {session.buyer.name || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-medium">Seller:</span>{' '}
                        {session.seller.name || 'Unknown'}
                      </p>
                      <p>
                        <span className="font-medium">Store:</span>{' '}
                        {session.transaction.shop.name}
                      </p>
                      {session.transaction.scheduledDate && (
                        <p>
                          <span className="font-medium">Scheduled:</span>{' '}
                          {new Date(session.transaction.scheduledDate).toLocaleDateString('it-IT')}
                          {session.transaction.scheduledTime && ` at ${session.transaction.scheduledTime}`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Payment Status */}
              {payment && (
                <Card className="glass-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Payment Status</h3>
                    {getPaymentStatusBadge(payment.status)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                      <span className="font-bold text-lg text-primary">
                        €{formatPriceNumber(payment.amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Method:</span>
                      <span>{payment.paymentMethod}</span>
                    </div>
                    {payment.riskScore !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Risk Score:</span>
                        <span className={payment.riskScore > 70 ? 'text-red-500' : 'text-green-500'}>
                          {payment.riskScore}/100
                        </span>
                      </div>
                    )}
                    {payment.flaggedForReview && (
                      <div className="mt-2 p-2 bg-yellow-500/20 rounded text-sm text-yellow-600 dark:text-yellow-400">
                        ⚠️ This transaction has been flagged for review
                      </div>
                    )}
                    {!payment && isBuyer && session.status === 'ACTIVE' && (
                      <Button onClick={initiatePayment} className="w-full mt-4">
                        Initiate Payment
                      </Button>
                    )}
                  </div>
                </Card>
              )}

              {/* QR Code for In-Store Payment */}
              {qrData && (
                <Card className="glass-panel p-6 bg-gradient-to-br from-primary/10 to-orange-500/10 border-2 border-primary/30">
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {qrData.qrData && (
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <img
                            src={qrData.qrData}
                            alt="SafeTrade QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">qr_code_2</span>
                          QR Code Pagamento
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Mostra questo QR code al merchant quando sei in negozio per completare la transazione
                        </p>
                      </div>

                      <div className="space-y-2 bg-white/50 dark:bg-black/20 p-4 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Importo Totale:</span>
                          <span className="font-bold text-lg">€{formatPriceNumber(qrData.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Fee ({qrData.feePercentage}%):</span>
                          <span className="text-sm">€{formatPriceNumber(qrData.feeAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                          <span>Pagata da:</span>
                          <span>{qrData.feePaidBy === 'SELLER' ? 'Venditore' : 'Compratore'}</span>
                        </div>
                        <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {isBuyer ? 'Tu pagherai:' : 'Venditore riceverà:'}
                          </span>
                          <span className="font-bold text-primary text-lg">
                            €{formatPriceNumber(isBuyer ? qrData.buyerPays : qrData.sellerReceives)}
                          </span>
                        </div>
                        <div className="mt-3 p-2 bg-blue-500/20 rounded text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                          <span className="material-symbols-outlined text-sm">payments</span>
                          <span>💵 <strong>SOLO CONTANTI</strong> - Pagamento in negozio</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={downloadQRCode}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Scarica QR
                        </Button>
                        <Button
                          onClick={() => window.print()}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">print</span>
                          Stampa
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Messages */}
              <Card className="glass-panel p-6">
                <h3 className="font-bold text-lg mb-4">Messages</h3>
                <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                  {session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.sender.id === user?.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        {msg.sender.avatar ? (
                          <img src={msg.sender.avatar} alt="" className="w-full h-full rounded-full" />
                        ) : (
                          <span className="text-xs font-bold">
                            {(msg.sender.name || 'U').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className={`flex-1 ${msg.sender.id === user?.id ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            msg.isSystem
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm'
                              : msg.sender.id === user?.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          {!msg.isSystem && (
                            <div className="text-xs font-medium mb-1">
                              {msg.sender.name || 'Unknown'}
                              {msg.sender.role === 'MERCHANT' && ' (Merchant)'}
                            </div>
                          )}
                          <div>{msg.content}</div>
                          <div className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {session.status === 'ACTIVE' && (
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type a message..."
                      disabled={sending}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sending || !message.trim()}>
                      {sending ? 'Sending...' : 'Send'}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Participants */}
              <Card className="glass-panel p-6">
                <h3 className="font-bold text-lg mb-4">Participants</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Buyer</p>
                    <div className="flex items-center gap-2">
                      {session.buyer.avatar ? (
                        <img
                          src={session.buyer.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold">
                            {(session.buyer.name || 'B').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{session.buyer.name || 'Unknown'}</span>
                      {isBuyer && <Badge className="bg-blue-500">You</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Seller</p>
                    <div className="flex items-center gap-2">
                      {session.seller.avatar ? (
                        <img
                          src={session.seller.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold">
                            {(session.seller.name || 'S').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{session.seller.name || 'Unknown'}</span>
                      {isSeller && <Badge className="bg-blue-500">You</Badge>}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Merchant</p>
                    <div className="flex items-center gap-2">
                      {session.merchant.avatar ? (
                        <img
                          src={session.merchant.avatar}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-xs font-bold">
                            {(session.merchant.name || 'M').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{session.merchant.name || 'Unknown'}</span>
                      {isMerchant && <Badge className="bg-orange-500">You</Badge>}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              {isMerchant && payment && payment.status === 'PENDING' && (
                <Card className="glass-panel p-6">
                  <h3 className="font-bold text-lg mb-4">Merchant Actions</h3>
                  <Button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/escrow/payments/${payment.id}/hold`, {
                          method: 'POST',
                        })
                        if (res.ok) {
                          toast({
                            title: 'Success',
                            description: 'Funds held in escrow',
                          })
                          fetchPayment()
                          fetchSession()
                        }
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to hold funds',
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="w-full mb-2"
                  >
                    Confirm Payment & Hold Funds
                  </Button>
                </Card>
              )}

              {isMerchant && payment && payment.status === 'HELD' && session.transaction.status === 'COMPLETED' && (
                <Card className="glass-panel p-6">
                  <h3 className="font-bold text-lg mb-4">Release Funds</h3>
                  <Button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/escrow/payments/${payment.id}/release`, {
                          method: 'POST',
                        })
                        if (res.ok) {
                          toast({
                            title: 'Success',
                            description: 'Funds released to seller',
                          })
                          fetchPayment()
                          fetchSession()
                        }
                      } catch (error) {
                        toast({
                          title: 'Error',
                          description: 'Failed to release funds',
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Release Funds to Seller
                  </Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

