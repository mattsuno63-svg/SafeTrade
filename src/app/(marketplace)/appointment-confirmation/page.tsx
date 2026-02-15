'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function AppointmentConfirmationContent() {
  const searchParams = useSearchParams()
  const date = searchParams.get('date')
  const time = searchParams.get('time')
  const storeId = searchParams.get('storeId')

  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch transaction and generate QR code
  useEffect(() => {
    const fetchQRCode = async () => {
      if (!storeId) return

      try {
        // First, get or create transaction
        // For now, we'll use a mock transaction ID
        // In production, this would come from the appointment creation
        const transactionId = searchParams.get('transactionId') || 'temp'
        
        const res = await fetch(`/api/transactions/${transactionId}/qr`)
        if (res.ok) {
          const data = await res.json()
          setQrCode(data.qrCode)
        }
      } catch (error) {
        console.error('Error fetching QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQRCode()
  }, [storeId, searchParams])

  // Mock data
  const appointment = {
    id: searchParams.get('transactionId') || 'apt_123',
    store: {
      name: 'The Card Vault',
      address: 'Via Roma 123, Milan',
    },
    date: date || '2024-10-24',
    time: time || '14:00',
  }

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
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Appointment Confirmed!</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your SafeTrade appointment has been scheduled
              </p>
            </div>

            <div className="space-y-6 mb-8">
              <Card className="bg-white/50 dark:bg-black/20 p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Store</span>
                    <span className="font-bold">{appointment.store.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Address</span>
                    <span className="font-medium">{appointment.store.address}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date</span>
                    <span className="font-bold">{appointment.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Time</span>
                    <span className="font-bold">{appointment.time}</span>
                  </div>
                </div>
              </Card>

              {/* QR Code */}
              <div className="flex flex-col items-center">
                <p className="text-sm font-medium mb-4">Show this QR code at the store</p>
                {loading ? (
                  <div className="bg-white p-4 rounded-xl w-48 h-48 flex items-center justify-center">
                    <span className="text-gray-400">Loading QR code...</span>
                  </div>
                ) : qrCode ? (
                  <div className="bg-white p-4 rounded-xl">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded-xl w-48 h-48 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">QR code unavailable</span>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Transaction ID: {appointment.id}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/dashboard">View Dashboard</Link>
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

const fallback = <div className="flex min-h-[40vh] items-center justify-center"><span className="text-muted-foreground">Caricamento...</span></div>
export default function AppointmentConfirmationPage() {
  return <Suspense fallback={fallback}><AppointmentConfirmationContent /></Suspense>
}
