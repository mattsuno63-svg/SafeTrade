'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import confetti from 'canvas-confetti'

const TIME_SLOTS = [
  '09:00-10:00',
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '14:00-15:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
  '18:00-19:00',
]

export default function SelectAppointmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const storeId = searchParams.get('storeId')
  const proposalId = searchParams.get('proposalId')
  
  const [shop, setShop] = useState<any>(null)
  const [proposal, setProposal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')

  // Generate next 7 days
  const getAvailableDates = () => {
    const dates = []
    for (let i = 1; i <= 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const availableDates = getAvailableDates()

  useEffect(() => {
    if (!storeId) {
      router.push('/select-store')
      return
    }

    const fetchData = async () => {
      try {
        // Fetch shop
        const shopRes = await fetch(`/api/shops/${storeId}`)
        if (shopRes.ok) {
          const shopData = await shopRes.json()
          setShop(shopData)
        } else {
          toast({
            title: 'Error',
            description: 'Store not found',
            variant: 'destructive',
          })
          router.push('/select-store')
          return
        }

        // Fetch proposal if available
        if (proposalId) {
          const proposalRes = await fetch(`/api/proposals/${proposalId}`)
          if (proposalRes.ok) {
            const proposalData = await proposalRes.json()
            setProposal(proposalData)
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [storeId, proposalId, router, toast])

  const fireConfetti = () => {
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

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Error',
        description: 'Please select a date and time',
        variant: 'destructive',
      })
      return
    }

    if (!proposalId) {
      toast({
        title: 'Error',
        description: 'No proposal found',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId,
          shopId: storeId,
          escrowType: 'LOCAL', // Explicitly set LOCAL for store-based escrow
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create transaction')
      }

      const transaction = await res.json()

      // 🎉 Fire confetti animation!
      fireConfetti()

      toast({
        title: '🎉 Complimenti!',
        description: `Hai prenotato per ${new Date(selectedDate).toLocaleDateString('it-IT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })} alle ${selectedTime}`,
      })

      // Wait for confetti animation then redirect
      setTimeout(() => {
        router.push(`/transaction/${transaction.id}/status`)
      }, 2000)
    } catch (error: any) {
      console.error('Error creating transaction:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule appointment',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const formatDateValue = (date: Date) => {
    return date.toISOString().split('T')[0]
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
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Change Store
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">calendar_month</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Select Appointment</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Choose when you'd like to meet at the store
              </p>
            </div>

            {/* Store Info */}
            {shop && (
              <Card className="glass-panel p-4 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">store</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{shop.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {[shop.address, shop.city].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Date Selection */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Select Date</h3>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {availableDates.map((date) => {
                  const dateValue = formatDateValue(date)
                  const isSelected = selectedDate === dateValue
                  return (
                    <button
                      key={dateValue}
                      onClick={() => setSelectedDate(dateValue)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-white/50 dark:bg-white/5 hover:bg-primary/10 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="text-xs font-medium">
                        {date.toLocaleDateString('it-IT', { weekday: 'short' })}
                      </div>
                      <div className="text-lg font-bold">{date.getDate()}</div>
                      <div className="text-xs">
                        {date.toLocaleDateString('it-IT', { month: 'short' })}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time Selection */}
            <div className="mb-8">
              <h3 className="font-bold mb-4">Select Time</h3>
              <div className="grid grid-cols-3 gap-3">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedTime === slot
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`p-4 rounded-xl text-center transition-all ${
                        isSelected
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-white/50 dark:bg-white/5 hover:bg-primary/10 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <span className="font-bold">{slot}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            {selectedDate && selectedTime && proposal && (
              <Card className="glass-panel p-6 mb-8">
                <h3 className="font-bold mb-4">Riepilogo Appuntamento</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">store</span>
                    <span>{shop?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">calendar_today</span>
                    <span>
                      {new Date(selectedDate).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    <span>{selectedTime}</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-bold mb-3">Dettaglio Pagamento</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Prezzo concordato:</span>
                      <span className="font-bold">€{proposal.offerPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Commissione SafeTrade (5%):</span>
                      <span className="font-bold">€{(proposal.offerPrice * 0.05).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Pagata da:</span>
                      <span className="font-semibold">
                        {proposal.feePaidBy === 'SELLER' ? '👤 Venditore' : 
                         proposal.feePaidBy === 'BUYER' ? '🛒 Acquirente' : 
                         '⚖️ Divisa 50/50'}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between text-lg">
                      <span className="font-bold">Acquirente paga:</span>
                      <span className="font-bold text-primary">
                        €
                        {proposal.feePaidBy === 'BUYER'
                          ? (proposal.offerPrice + proposal.offerPrice * 0.05).toFixed(2)
                          : proposal.feePaidBy === 'SPLIT'
                          ? (proposal.offerPrice + proposal.offerPrice * 0.025).toFixed(2)
                          : proposal.offerPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span className="font-bold">Venditore riceve:</span>
                      <span className="font-bold text-green-600">
                        €
                        {proposal.feePaidBy === 'SELLER'
                          ? (proposal.offerPrice - proposal.offerPrice * 0.05).toFixed(2)
                          : proposal.feePaidBy === 'SPLIT'
                          ? (proposal.offerPrice - proposal.offerPrice * 0.025).toFixed(2)
                          : proposal.offerPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Confirm Button */}
            <Button
              onClick={handleConfirm}
              disabled={!selectedDate || !selectedTime || submitting}
              className="w-full h-14 bg-primary hover:bg-primary-dark text-lg font-bold"
            >
              {submitting ? 'Scheduling...' : 'Confirm Appointment'}
            </Button>

            {/* Info */}
            <p className="text-center text-sm text-gray-500 mt-4">
              📱 Entrambi riceverete un codice QR univoco da presentare al negozio
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

