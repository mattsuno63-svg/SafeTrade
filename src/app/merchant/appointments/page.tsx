'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Appointment {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string
  scheduledTime: string
  qrCode: string
  verificationCode: string
  createdAt: string
  userA: {
    id: string
    name?: string
    email: string
  }
  userB: {
    id: string
    name?: string
    email: string
  }
  proposal: {
    id: string
    type: 'SALE' | 'TRADE'
    offerPrice?: number
    listing: {
      id: string
      title: string
      price?: number
    }
  }
}

export default function MerchantAppointmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'TODAY' | 'UPCOMING' | 'COMPLETED'>('ALL')
  const [verifyCode, setVerifyCode] = useState('')
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchAppointments()
    }
  }, [user, userLoading, router])

  const fetchAppointments = async () => {
    try {
      const res = await fetch('/api/merchant/appointments')
      if (!res.ok) throw new Error('Failed to fetch appointments')
      const data = await res.json()
      setAppointments(data)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (appointmentId: string) => {
    try {
      const res = await fetch(`/api/transactions/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      })

      if (!res.ok) throw new Error('Failed to confirm appointment')

      toast({
        title: 'Appointment Confirmed',
        description: 'Both parties will be notified.',
      })

      fetchAppointments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleVerifyAndComplete = async () => {
    if (!selectedAppointment || !verifyCode) return

    try {
      const res = await fetch(`/api/transactions/${selectedAppointment}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Verification failed')
      }

      toast({
        title: 'Transaction Completed',
        description: 'The SafeTrade has been successfully verified and completed.',
      })

      setShowVerifyModal(false)
      setVerifyCode('')
      setSelectedAppointment(null)
      fetchAppointments()
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleCancel = async (appointmentId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      const res = await fetch(`/api/transactions/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (!res.ok) throw new Error('Failed to cancel appointment')

      toast({
        title: 'Appointment Cancelled',
        description: 'Both parties will be notified.',
      })

      fetchAppointments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const filterAppointments = () => {
    const today = new Date().toISOString().split('T')[0]
    
    switch (filter) {
      case 'TODAY':
        return appointments.filter(a => a.scheduledDate?.startsWith(today))
      case 'UPCOMING':
        return appointments.filter(a => 
          a.status !== 'COMPLETED' && 
          a.status !== 'CANCELLED' &&
          new Date(a.scheduledDate) >= new Date(today)
        )
      case 'COMPLETED':
        return appointments.filter(a => a.status === 'COMPLETED')
      default:
        return appointments
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending</Badge>
      case 'CONFIRMED':
        return <Badge className="bg-blue-500">Confirmed</Badge>
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-500">Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const filteredAppointments = filterAppointments()

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">SafeTrade Appointments</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage in-store transaction appointments
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {(['ALL', 'TODAY', 'UPCOMING', 'COMPLETED'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  className="capitalize whitespace-nowrap"
                >
                  {f.toLowerCase().replace('_', ' ')}
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {appointments.filter(a => a.status === 'PENDING').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {appointments.filter(a => a.status === 'CONFIRMED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Confirmed</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {appointments.filter(a => a.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold">{appointments.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
              </Card>
            </div>

            {/* Appointments List */}
            {filteredAppointments.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  calendar_month
                </span>
                <h3 className="text-xl font-bold mb-2">No appointments</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  When customers schedule SafeTrade appointments at your store, they will appear here.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => (
                  <Card key={appointment.id} className="glass-panel p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Date/Time Block */}
                      <div className="w-full md:w-32 text-center p-4 bg-primary/10 rounded-lg flex-shrink-0">
                        <div className="text-3xl font-bold text-primary">
                          {appointment.scheduledDate 
                            ? new Date(appointment.scheduledDate).getDate() 
                            : '--'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {appointment.scheduledDate 
                            ? new Date(appointment.scheduledDate).toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })
                            : '--'}
                        </div>
                        <div className="text-lg font-medium mt-1">
                          {appointment.scheduledTime || '--:--'}
                        </div>
                      </div>

                      {/* Appointment Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">
                              {appointment.proposal?.listing?.title || 'Transaction'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {appointment.proposal?.type === 'TRADE' ? 'Trade' : 'Sale'} - 
                              {appointment.proposal?.offerPrice 
                                ? ` €${appointment.proposal.offerPrice.toFixed(2)}`
                                : appointment.proposal?.listing?.price 
                                  ? ` €${appointment.proposal.listing.price.toFixed(2)}`
                                  : ' Price TBD'}
                            </p>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">person</span>
                            <div>
                              <p className="text-xs text-gray-500">Seller</p>
                              <p className="font-medium">{appointment.userA?.name || appointment.userA?.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">person</span>
                            <div>
                              <p className="text-xs text-gray-500">Buyer</p>
                              <p className="font-medium">{appointment.userB?.name || appointment.userB?.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="material-symbols-outlined text-sm">qr_code_2</span>
                            Code: {appointment.verificationCode}
                          </div>

                          <div className="flex gap-2">
                            {appointment.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-500"
                                  onClick={() => handleCancel(appointment.id)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirm(appointment.id)}
                                >
                                  Confirm
                                </Button>
                              </>
                            )}
                            {appointment.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => {
                                  setSelectedAppointment(appointment.id)
                                  setShowVerifyModal(true)
                                }}
                              >
                                <span className="material-symbols-outlined text-sm mr-1">verified</span>
                                Verify & Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="glass-panel p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Verify Transaction</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter the verification code shown on the customer's phone or scan their QR code.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Verification Code</label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Enter code or scan QR..."
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Inserisci il codice completo mostrato sul telefono del cliente
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10"
                onClick={() => {
                  setShowVerifyModal(false)
                  router.push('/merchant/verify/scan')
                }}
              >
                <span className="material-symbols-outlined mr-2">qr_code_scanner</span>
                Scan QR Code
              </Button>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowVerifyModal(false)
                    setVerifyCode('')
                    setSelectedAppointment(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  onClick={handleVerifyAndComplete}
                  disabled={!verifyCode}
                >
                  Complete Transaction
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

