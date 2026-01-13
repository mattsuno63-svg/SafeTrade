'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatPriceNumber } from '@/lib/utils'
import { QRScanner } from '@/components/qr/QRScanner'
import { Scan } from 'lucide-react'

interface EscrowSessionData {
  id: string
  status: string
  totalAmount: number
  feePercentage: number
  feePaidBy: string
  feeAmount: number
  finalAmount: number
  paymentMethod: string
  qrCode: string
  qrScannedAt: string | null
  buyer: { name: string | null; email: string }
  seller: { name: string | null; email: string }
  merchant: { name: string | null }
  transaction: {
    id: string
    proposal: {
      listing: {
        title: string
        images: string[]
        price: number | null
      }
    } | null
  }
}

export default function MerchantVerifyQRPage({ params }: { params: { qrCode: string } }) {
  const { qrCode } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()

  const [session, setSession] = useState<EscrowSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [finalPrice, setFinalPrice] = useState<string>('')
  const [showPriceInput, setShowPriceInput] = useState(false)
  const [reason, setReason] = useState<string>('')

  useEffect(() => {
    if (user) {
      fetchSession()
    }
  }, [user, qrCode])

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/merchant/verify/${qrCode}`)
      if (res.ok) {
        const data = await res.json()
        setSession(data)
      } else {
        toast({
          title: 'Errore',
          description: 'QR Code non valido o sessione non trovata',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching session:', error)
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento della sessione',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTransaction = async () => {
    if (!session) return

    try {
      setVerifying(true)

      // Mark QR as scanned
      const res = await fetch(`/api/escrow/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrScannedAt: new Date().toISOString(),
          qrScannedBy: user?.id,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to verify')
      }

      toast({
        title: '✅ Transazione Verificata',
        description: 'Il pagamento in contanti può procedere',
      })

      fetchSession()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore nella verifica',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleCompleteTransaction = async (actualPrice?: number) => {
    if (!session) return

    // Se non è stato passato un prezzo e non abbiamo uno specifico, usa il prezzo originale
    const priceToUse = actualPrice !== undefined ? actualPrice : session.totalAmount

    try {
      setVerifying(true)

      // Calcola la nuova fee basata sul prezzo effettivo
      const newFeeAmount = priceToUse * (session.feePercentage / 100)
      const newFinalAmount =
        session.feePaidBy === 'SELLER'
          ? priceToUse - newFeeAmount
          : priceToUse

      // Update escrow session con i nuovi importi
      await fetch(`/api/escrow/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount: priceToUse,
          feeAmount: newFeeAmount,
          finalAmount: newFinalAmount,
          status: 'COMPLETED',
        }),
      })

      // Complete the transaction
      const res = await fetch(`/api/transactions/${session.transaction.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationCode: qrCode,
          paymentReceived: true,
          notes: actualPrice
            ? `Cash payment received. Final price: €${priceToUse.toFixed(2)}`
            : 'Cash payment received and verified via QR code',
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to complete transaction')
      }

      toast({
        title: '🎉 Transazione Completata!',
        description: `Pagamento confermato: €${priceToUse.toFixed(2)}`,
      })

      // Redirect to merchant dashboard after 2 seconds
      setTimeout(() => {
        router.push('/merchant/shop')
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore nel completamento',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleRejectTransaction = async () => {
    if (!session || !reason) {
      toast({
        title: 'Errore',
        description: 'Inserisci un motivo per il rifiuto',
        variant: 'destructive',
      })
      return
    }

    try {
      setVerifying(true)

      // Update escrow session status
      await fetch(`/api/escrow/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'REJECTED',
        }),
      })

      // Mark transaction as cancelled
      await fetch(`/api/transactions/${session.transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          notes: `Transazione rifiutata dal merchant: ${reason}`,
        }),
      })

      toast({
        title: 'Transazione Rifiutata',
        description: 'La transazione è stata annullata',
      })

      setTimeout(() => {
        router.push('/merchant/shop')
      }, 2000)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Errore nel rifiuto',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleSubmitFinalPrice = () => {
    const price = parseFloat(finalPrice)
    if (isNaN(price) || price <= 0) {
      toast({
        title: 'Errore',
        description: 'Inserisci un prezzo valido',
        variant: 'destructive',
      })
      return
    }
    handleCompleteTransaction(price)
  }

  const calculateAmounts = () => {
    if (!session) return { buyerPays: 0, sellerReceives: 0 }

    const buyerPays =
      session.feePaidBy === 'BUYER'
        ? session.totalAmount + session.feeAmount
        : session.totalAmount

    const sellerReceives = session.finalAmount

    return { buyerPays, sellerReceives }
  }

  const { buyerPays, sellerReceives } = calculateAmounts()

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Caricamento...</div>
        </main>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="glass-panel p-8 text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">error</span>
            <h2 className="text-2xl font-bold mb-2">QR Code Non Valido</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Questo QR code non è valido o la sessione non esiste
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setShowScanner(true)} className="flex items-center gap-2">
                <Scan className="h-4 w-4" />
                Scansiona Nuovo QR Code
              </Button>
              <Button variant="outline" onClick={() => router.push('/merchant/shop')}>
                Torna alla Dashboard
              </Button>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  const isAlreadyScanned = session.qrScannedAt !== null
  const isCompleted = session.status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      {showScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <QRScanner
              onScanSuccess={(decodedText) => {
                try {
                  const data = JSON.parse(decodedText)
                  if (data.qrCode || data.verifyUrl) {
                    const newQrCode = data.qrCode || data.verifyUrl.split('/merchant/verify/')[1]
                    router.push(`/merchant/verify/${newQrCode}`)
                  }
                } catch {
                  if (decodedText.includes('/merchant/verify/')) {
                    const newQrCode = decodedText.split('/merchant/verify/')[1]?.split('?')[0]
                    if (newQrCode) {
                      router.push(`/merchant/verify/${newQrCode}`)
                    }
                  }
                }
                setShowScanner(false)
              }}
              onClose={() => setShowScanner(false)}
            />
          </div>
        </div>
      )}
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="material-symbols-outlined text-5xl text-primary">verified</span>
              <h1 className="text-3xl font-bold">Verifica Transazione</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Controlla i dettagli e completa il pagamento in contanti
            </p>
            <Button
              onClick={() => setShowScanner(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Scan className="h-4 w-4" />
              Scansiona Nuovo QR Code
            </Button>
          </div>

          <div className="space-y-6">
            {/* Status Banner */}
            {isAlreadyScanned && (
              <Card className="glass-panel p-4 bg-green-500/10 border-green-500/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-500 text-3xl">check_circle</span>
                  <div>
                    <h3 className="font-bold">QR Code già scannerizzato</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Scannerizzato il {new Date(session.qrScannedAt!).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {isCompleted && (
              <Card className="glass-panel p-4 bg-blue-500/10 border-blue-500/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-500 text-3xl">task_alt</span>
                  <div>
                    <h3 className="font-bold">Transazione Completata</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Questa transazione è già stata completata
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Transaction Details */}
            <Card className="glass-panel p-6">
              <h2 className="text-xl font-bold mb-4">Dettagli Transazione</h2>
              <div className="space-y-4">
                {session.transaction.proposal?.listing && (
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                    {session.transaction.proposal.listing.images[0] && (
                      <img
                        src={session.transaction.proposal.listing.images[0]}
                        alt={session.transaction.proposal.listing.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{session.transaction.proposal.listing.title}</h3>
                      <Badge>{session.status}</Badge>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">👤 Compratore</h4>
                    <p className="text-sm">{session.buyer.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{session.buyer.email}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">💼 Venditore</h4>
                    <p className="text-sm">{session.seller.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{session.seller.email}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Details */}
            <Card className="glass-panel p-6 bg-gradient-to-br from-primary/5 to-orange-500/5">
              <h2 className="text-xl font-bold mb-4">💰 Dettagli Pagamento</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-lg">
                  <span>Importo Totale:</span>
                  <span className="font-bold">€{formatPriceNumber(session.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fee SafeTrade ({session.feePercentage}%):</span>
                  <span>€{formatPriceNumber(session.feeAmount)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Fee pagata da:</span>
                  <span>{session.feePaidBy === 'SELLER' ? 'Venditore' : 'Compratore'}</span>
                </div>
                <div className="border-t-2 border-gray-300 dark:border-gray-600 my-3"></div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Compratore paga:</span>
                  <span className="text-primary">€{formatPriceNumber(buyerPays)}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Venditore riceve:</span>
                  <span className="text-green-600">€{formatPriceNumber(sellerReceives)}</span>
                </div>
                <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg text-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-yellow-600">info</span>
                  <span>
                    <strong>METODO PAGAMENTO:</strong> SOLO CONTANTI 💵
                  </span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="space-y-3">
              {!isAlreadyScanned && !isCompleted && (
                <Button
                  onClick={handleVerifyTransaction}
                  disabled={verifying}
                  className="w-full bg-primary hover:bg-primary-dark text-white py-6 text-lg"
                >
                  <span className="material-symbols-outlined mr-2">qr_code_scanner</span>
                  {verifying ? 'Verificando...' : '1. Verifica QR Code'}
                </Button>
              )}

              {isAlreadyScanned && !isCompleted && (
                <>
                  {/* Price Confirmation Section */}
                  <Card className="glass-panel p-6 bg-blue-50 dark:bg-blue-900/20">
                    <h3 className="font-bold text-lg mb-4">💵 Conferma Pagamento</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Il prezzo concordato era €{formatPriceNumber(session.totalAmount)}.
                      Se il prezzo è stato modificato durante la trattativa, inseriscilo qui:
                    </p>

                    <div className="flex items-center gap-3 mb-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showPriceInput}
                          onChange={(e) => {
                            setShowPriceInput(e.target.checked)
                            if (!e.target.checked) setFinalPrice('')
                          }}
                          className="w-5 h-5"
                        />
                        <span className="text-sm">Il prezzo è stato modificato</span>
                      </label>
                    </div>

                    {showPriceInput && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">Prezzo Finale (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={finalPrice}
                          onChange={(e) => setFinalPrice(e.target.value)}
                          placeholder="es. 50.00"
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-lg font-bold"
                        />
                        {finalPrice && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Fee ({session.feePercentage}%): €
                            {(parseFloat(finalPrice) * (session.feePercentage / 100)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={() => {
                        if (showPriceInput) {
                          handleSubmitFinalPrice()
                        } else {
                          handleCompleteTransaction()
                        }
                      }}
                      disabled={verifying || (showPriceInput && !finalPrice)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg mb-3"
                    >
                      <span className="material-symbols-outlined mr-2">check_circle</span>
                      {verifying ? 'Confermando...' : '✅ Conferma Vendita'}
                    </Button>

                    {/* Reject Section */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 font-semibold mb-3">
                        ❌ Rifiuta Transazione
                      </summary>
                      <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <label className="block text-sm font-medium mb-2">Motivo del rifiuto</label>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="es. Articolo non corrisponde alla descrizione"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm min-h-[80px]"
                        />
                        <Button
                          onClick={handleRejectTransaction}
                          disabled={verifying || !reason}
                          variant="destructive"
                          className="w-full mt-3"
                        >
                          <span className="material-symbols-outlined mr-2">cancel</span>
                          {verifying ? 'Rifiutando...' : 'Conferma Rifiuto'}
                        </Button>
                      </div>
                    </details>
                  </Card>
                </>
              )}

              {isCompleted && (
                <Button
                  onClick={() => router.push('/merchant/shop')}
                  variant="outline"
                  className="w-full py-6 text-lg"
                >
                  <span className="material-symbols-outlined mr-2">home</span>
                  Torna alla Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

