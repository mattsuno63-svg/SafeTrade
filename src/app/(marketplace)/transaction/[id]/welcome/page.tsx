'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import confetti from 'canvas-confetti'
import Image from 'next/image'

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
      price: number
    }
    offerPrice: number | null
    tradeItems: string | null
    type: string
  }
}

export default function TransactionWelcomePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [confettiFired, setConfettiFired] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Fire confetti animation
  const fireConfetti = () => {
    if (confettiFired) return
    setConfettiFired(true)
    
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      })
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      })
    }, 250)
  }

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!user) return
      
      try {
        const res = await fetch(`/api/transactions/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
          
          // Verify user is the buyer (userA)
          if (data.userA.id !== user.id) {
            toast({
              title: 'Accesso Negato',
              description: 'Questa pagina è riservata all\'acquirente.',
              variant: 'destructive',
            })
            router.push(`/transaction/${id}/status`)
            return
          }
          
          // Fire confetti after a short delay
          setTimeout(() => {
            fireConfetti()
          }, 500)
          
          // Auto-redirect after 5 seconds
          setTimeout(() => {
            setRedirecting(true)
            router.push(`/transaction/${id}/status`)
          }, 5000)
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
  }, [id, user, router, toast, confettiFired])

  const handleContinue = () => {
    setRedirecting(true)
    router.push(`/transaction/${id}/status`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Card className="glass-panel p-12 text-center">
              <div className="animate-pulse">Caricamento...</div>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (!transaction) {
    return null
  }

  const listing = transaction.proposal?.listing
  const cardImage = listing?.images?.[0] || '/placeholder-card.jpg'
  const appointmentDate = transaction.scheduledDate
    ? new Date(transaction.scheduledDate).toLocaleDateString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Data da definire'
  const appointmentTime = transaction.scheduledTime || 'Orario da definire'

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute -bottom-[20%] -left-[10%] h-[800px] w-[800px] rounded-full bg-primary/5 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Celebration Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-4 animate-bounce">
                <span className="material-symbols-outlined text-5xl text-primary">celebration</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                🎉 Transazione Creata!
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Il venditore ha selezionato il negozio. Ecco i dettagli della tua transazione.
              </p>
            </div>

            {/* Transaction Details Card */}
            <Card className="glass-panel p-6 mb-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Card Image */}
                <div className="flex flex-col items-center">
                  <h3 className="font-bold text-lg mb-4">La Tua Carta</h3>
                  <div className="relative w-full max-w-xs aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {cardImage && (
                      <Image
                        src={cardImage}
                        alt={listing?.title || 'Carta'}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <p className="mt-4 font-semibold text-center">{listing?.title || 'Carta'}</p>
                </div>

                {/* Transaction Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg mb-4">Dettagli Transazione</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">store</span>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Negozio</p>
                          <p className="font-semibold">{transaction.shop.name}</p>
                          {transaction.shop.address && (
                            <p className="text-sm text-gray-500">{transaction.shop.address}</p>
                          )}
                          {transaction.shop.city && (
                            <p className="text-sm text-gray-500">{transaction.shop.city}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">calendar_today</span>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Data Appuntamento</p>
                          <p className="font-semibold">{appointmentDate}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">schedule</span>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Orario</p>
                          <p className="font-semibold">{appointmentTime}</p>
                        </div>
                      </div>

                      {listing?.price && (
                        <div className="flex items-start gap-3">
                          <span className="material-symbols-outlined text-primary">euro</span>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Prezzo</p>
                            <p className="font-semibold">€{listing.price.toFixed(2)}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-primary">person</span>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Venditore</p>
                          <p className="font-semibold">{transaction.userB.name || transaction.userB.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Info Box */}
            <Card className="glass-panel p-6 mb-6 bg-blue-500/10 border-blue-500/30">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-blue-500 text-3xl">info</span>
                <div>
                  <h4 className="font-bold mb-2">Cosa Succede Ora?</h4>
                  <ol className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Ti reindirizzeremo alla pagina della transazione dove vedrai il tuo QR code univoco</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Presentati al negozio alla data e ora indicata</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span>Mostra il QR code al merchant per il check-in</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">4.</span>
                      <span>Il merchant verificherà la carta e completerà lo scambio</span>
                    </li>
                  </ol>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleContinue}
                disabled={redirecting}
                className="flex-1 bg-primary hover:bg-primary-dark text-white h-12 text-lg"
              >
                {redirecting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin mr-2">sync</span>
                    Reindirizzamento...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined mr-2">qr_code</span>
                    Vedi QR Code e Dettagli
                  </>
                )}
              </Button>
            </div>

            {/* Auto-redirect countdown */}
            {!redirecting && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Reindirizzamento automatico tra 5 secondi...
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

