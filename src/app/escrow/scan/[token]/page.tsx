'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, Calendar, MapPin, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'
import { formatPriceNumber } from '@/lib/utils'

interface EscrowSessionInfo {
  entityType: 'CHECKIN_SESSION'
  sessionId: string
  status: string
  appointmentSlot: string | null
  expiredAt: string | null
  shop: {
    id: string
    name: string
    address: string | null
    city: string | null
    phone: string | null
    email: string | null
  } | null
  hasBuyerSeller: boolean
}

export default function EscrowScanPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const { toast } = useToast()
  
  const [sessionInfo, setSessionInfo] = useState<EscrowSessionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchSessionInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = params.token as string
      if (!token) {
        throw new Error('Token non fornito')
      }

      const res = await fetch(`/api/escrow/public/scan/${token}`)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Errore sconosciuto' }))
        throw new Error(errorData.error || 'Sessione non trovata o token non valido')
      }

      const data = await res.json()
      setSessionInfo(data)
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento della sessione')
    } finally {
      setLoading(false)
    }
  }, [params.token])

  useEffect(() => {
    if (params.token) {
      fetchSessionInfo()
    }
  }, [params.token, fetchSessionInfo])

  // Check if user is authorized (merchant for this session)
  const isAuthorized = user && sessionInfo && user.role === 'MERCHANT'

  // Determine what actions are available
  const canCheckIn = sessionInfo?.status === 'CHECKIN_PENDING' && isAuthorized
  const canStartVerification = sessionInfo?.status === 'CHECKED_IN' && isAuthorized
  const canViewDetails = isAuthorized || (user && (user.role === 'ADMIN' || user.role === 'MODERATOR'))

  const handleCheckIn = () => {
    if (sessionInfo) {
      router.push(`/merchant/escrow/sessions/${sessionInfo.sessionId}/checkin`)
    }
  }

  const handleStartVerification = () => {
    if (sessionInfo) {
      router.push(`/merchant/escrow/sessions/${sessionInfo.sessionId}/verification`)
    }
  }

  const handleViewDetails = () => {
    if (sessionInfo) {
      router.push(`/escrow/sessions/${sessionInfo.sessionId}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !sessionInfo) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Token QR Non Valido</h2>
          <p className="text-white/60 mb-6">{error || 'Il token QR scansionato non è valido o è scaduto'}</p>
          <Button onClick={() => router.push('/')} className="bg-primary text-white">
            Torna alla Home
          </Button>
        </div>
      </div>
    )
  }

  const statusBadgeColor = {
    CREATED: 'bg-gray-500',
    BOOKED: 'bg-blue-500',
    CHECKIN_PENDING: 'bg-yellow-500',
    CHECKED_IN: 'bg-green-500',
    VERIFICATION_IN_PROGRESS: 'bg-purple-500',
    VERIFICATION_PASSED: 'bg-green-600',
    VERIFICATION_FAILED: 'bg-red-500',
    RELEASE_REQUESTED: 'bg-orange-500',
    RELEASE_APPROVED: 'bg-green-700',
    COMPLETED: 'bg-green-800',
    DISPUTED: 'bg-red-600',
    CANCELLED: 'bg-gray-600',
    EXPIRED: 'bg-red-700',
  }[sessionInfo.status] || 'bg-gray-500'

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non specificato'
    const date = new Date(dateString)
    return date.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-background-dark text-white selection:bg-primary/30 relative overflow-x-hidden">
      <style jsx>{`
        body {
          font-family: 'Manrope', sans-serif;
          background-color: #16181d;
        }
        .liquid-glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
        }
        .grid-bg {
          background-image: radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.05) 1px, transparent 0);
          background-size: 40px 40px;
        }
        .shield-glow {
          filter: drop-shadow(0 0 30px rgba(20, 156, 184, 0.3));
        }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40"></div>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-accent-orange/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="layout-container flex h-full grow flex-col relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-20 border-b border-white/5 bg-background-dark/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="size-8 text-primary shield-glow">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-white text-xl font-extrabold leading-tight tracking-tight">
              SafeTrade <span className="text-primary">Escrow</span>
            </h2>
          </div>
          {!user && (
            <Button
              onClick={() => router.push('/login')}
              className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            >
              <span>Accedi</span>
            </Button>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:py-20">
          <div className="max-w-[900px] w-full flex flex-col items-center gap-8">
            {/* Headline */}
            <div className="text-center space-y-4">
              <Badge className={`${statusBadgeColor} text-white px-3 py-1`}>
                Sessione Escrow
              </Badge>
              <h1 className="text-white tracking-tight text-4xl md:text-5xl font-extrabold leading-[1.1]">
                Sessione <span className="text-primary">Identificata</span>
              </h1>
            </div>

            {/* Session Info Card */}
            <Card className="liquid-glass w-full rounded-3xl overflow-hidden border border-white/10">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={sessionInfo.status} />
                    <div>
                      <p className="text-white/40 text-xs uppercase font-bold mb-1">Stato Sessione</p>
                      <p className="text-white font-bold text-lg">{getStatusLabel(sessionInfo.status)}</p>
                    </div>
                  </div>
                  <Badge className={statusBadgeColor}>{sessionInfo.status}</Badge>
                </div>

                <div className="h-[1px] w-full bg-white/5"></div>

                {/* Shop Info */}
                {sessionInfo.shop && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs uppercase font-bold">
                      <MapPin className="h-4 w-4" />
                      Negozio
                    </div>
                    <p className="text-white font-bold text-xl">{sessionInfo.shop.name}</p>
                    {sessionInfo.shop.address && (
                      <p className="text-white/60 text-sm">
                        {sessionInfo.shop.address}
                        {sessionInfo.shop.city && `, ${sessionInfo.shop.city}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Appointment Slot */}
                {sessionInfo.appointmentSlot && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs uppercase font-bold">
                      <Calendar className="h-4 w-4" />
                      Appuntamento
                    </div>
                    <p className="text-white font-semibold">{formatDate(sessionInfo.appointmentSlot)}</p>
                  </div>
                )}

                {/* Expired At */}
                {sessionInfo.expiredAt && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs uppercase font-bold">
                      <Clock className="h-4 w-4" />
                      Scadenza Check-in
                    </div>
                    <p className="text-white/60 text-sm">{formatDate(sessionInfo.expiredAt)}</p>
                  </div>
                )}

                {/* Buyer/Seller Info */}
                {sessionInfo.hasBuyerSeller && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-white/40 text-xs uppercase font-bold">
                      <Users className="h-4 w-4" />
                      Partecipanti
                    </div>
                    <p className="text-white/60 text-sm">
                      Buyer e Seller registrati
                      {!isAuthorized && ' (dettagli disponibili solo per merchant)'}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-3">
                  {!user && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <p className="text-yellow-500 text-sm font-semibold mb-2">Accesso Richiesto</p>
                      <p className="text-white/60 text-sm mb-4">
                        Accedi per visualizzare i dettagli completi e gestire la sessione escrow.
                      </p>
                      <Button
                        onClick={() => router.push('/login')}
                        className="w-full bg-primary text-white"
                      >
                        Accedi
                      </Button>
                    </div>
                  )}

                  {user && !isAuthorized && !canViewDetails && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                      <p className="text-blue-500 text-sm font-semibold mb-2">Non Autorizzato</p>
                      <p className="text-white/60 text-sm">
                        Solo il merchant associato a questa sessione può eseguire azioni.
                      </p>
                    </div>
                  )}

                  {canCheckIn && (
                    <Button
                      onClick={handleCheckIn}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-14 text-lg font-bold"
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Esegui Check-in
                    </Button>
                  )}

                  {canStartVerification && (
                    <Button
                      onClick={handleStartVerification}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white h-14 text-lg font-bold"
                    >
                      <Shield className="mr-2 h-5 w-5" />
                      Avvia Verifica
                    </Button>
                  )}

                  {canViewDetails && (
                    <Button
                      onClick={handleViewDetails}
                      variant="outline"
                      className="w-full border-white/10 text-white hover:bg-white/5 h-12"
                    >
                      Apri Dettagli Sessione
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Footer CTA */}
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="text-white/40 hover:text-white"
            >
              Torna alla Home
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  const iconClass = "h-6 w-6"
  switch (status) {
    case 'COMPLETED':
    case 'VERIFICATION_PASSED':
      return <CheckCircle2 className={`${iconClass} text-green-500`} />
    case 'CHECKIN_PENDING':
    case 'VERIFICATION_IN_PROGRESS':
      return <Clock className={`${iconClass} text-yellow-500`} />
    case 'EXPIRED':
    case 'CANCELLED':
    case 'VERIFICATION_FAILED':
      return <AlertCircle className={`${iconClass} text-red-500`} />
    default:
      return <Shield className={`${iconClass} text-primary`} />
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    CREATED: 'Creata',
    BOOKED: 'Prenotata',
    CHECKIN_PENDING: 'In Attesa Check-in',
    CHECKED_IN: 'Check-in Completato',
    VERIFICATION_IN_PROGRESS: 'Verifica in Corso',
    VERIFICATION_PASSED: 'Verifica Superata',
    VERIFICATION_FAILED: 'Verifica Fallita',
    RELEASE_REQUESTED: 'Rilascio Richiesto',
    RELEASE_APPROVED: 'Rilascio Approvato',
    COMPLETED: 'Completata',
    DISPUTED: 'In Dispute',
    CANCELLED: 'Cancellata',
    EXPIRED: 'Scaduta',
  }
  return labels[status] || status
}

