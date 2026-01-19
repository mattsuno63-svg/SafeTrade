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

export default function GenerateShippingLabelPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const transactionId = params.id as string
  
  const [weight, setWeight] = useState('0.5')
  const [dimensions, setDimensions] = useState({ length: '30', width: '20', height: '5' })
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState<any>(null)
  const [shippingLabel, setShippingLabel] = useState<any>(null)
  const [labelPdfUrl, setLabelPdfUrl] = useState<string | null>(null)
  
  // Seller shipping address (if not in profile)
  const [sellerAddress, setSellerAddress] = useState({
    street: '', // Via senza numero civico
    houseNumber: '', // Numero civico separato
    city: '',
    zip: '',
    province: '',
    phone: '',
  })
  const [needsSellerAddress, setNeedsSellerAddress] = useState(false)

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transactions/${transactionId}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
          
          // Check if shipping label already exists
          if (data.shippingLabel) {
            setShippingLabel(data.shippingLabel)
            if (data.shippingLabel.labelUrl) {
              setLabelPdfUrl(data.shippingLabel.labelUrl)
            }
          }
          
          // Check if seller address needs to be completed
          if (data.userB) {
            const seller = data.userB
            const sellerCity = seller.city || ''
            
            // Verifica se l'indirizzo è placeholder o mancante
            // IMPORTANTE: Se l'utente ha solo "city" nel profilo ma non ha "street" e "zip",
            // dobbiamo sempre mostrare il form perché l'indirizzo non è completo
            const hasPlaceholderAddress = 
              !sellerCity || 
              sellerCity.trim() === '' ||
              sellerCity === 'Città' ||
              sellerCity === 'Città non specificata'
            
            // SEMPRE mostra il form se mancano dati essenziali (street, zip non sono nel profilo User)
            // Per ora, mostra sempre il form perché il profilo User non ha "street" e "zip"
            setNeedsSellerAddress(true) // SEMPRE true perché il profilo non ha indirizzo completo
            
            // Pre-fill con dati disponibili dal profilo
            setSellerAddress({
              street: '',
              houseNumber: '',
              city: sellerCity || '',
              zip: '',
              province: seller.province || '',
              phone: '',
            })
          } else {
            // Se userB non è disponibile, mostra comunque il form
            setNeedsSellerAddress(true)
          }
        } else {
          // Se la richiesta fallisce (500), logga l'errore ma continua
          const errorData = await res.json().catch(() => ({}))
          console.error('Error fetching transaction:', {
            status: res.status,
            statusText: res.statusText,
            error: errorData
          })
          // Continua comunque - il form può funzionare anche senza i dati della transazione
          // I dati vengono validati server-side quando si genera l'etichetta
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
        // Continua comunque - il form può funzionare anche senza i dati della transazione
      }
    }
    
    if (transactionId) {
      fetchTransaction()
    }
  }, [transactionId])

  const handleGenerateLabel = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const weightNum = parseFloat(weight)
    if (!weightNum || weightNum <= 0 || weightNum > 30) {
      toast({
        title: 'Errore',
        description: 'Peso pacco non valido. Deve essere tra 0.1 e 30 kg',
        variant: 'destructive',
      })
      return
    }

    // Valida indirizzo seller - SEMPRE necessario perché il profilo User non ha indirizzo completo
    // Controlla se i campi obbligatori (street, city, zip) sono compilati
    if (!sellerAddress.street?.trim() || 
        !sellerAddress.city?.trim() || 
        !sellerAddress.zip?.trim()) {
      toast({
        title: 'Errore',
        description: 'Completa tutti i campi obbligatori dell\'indirizzo di spedizione: Via, Città, CAP',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/verified-escrow/generate-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: weightNum,
          weightUnit: 'kg',
          dimensions: {
            length: parseFloat(dimensions.length) || 30,
            width: parseFloat(dimensions.width) || 20,
            height: parseFloat(dimensions.height) || 5,
          },
          service: 'STANDARD',
          // Invia sempre l'indirizzo seller (viene sempre richiesto perché non nel profilo)
          sellerAddress: sellerAddress,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella generazione dell\'etichetta')
      }

      const data = await res.json()
      setShippingLabel(data.shippingLabel)
      
      if (data.shippingLabel.labelUrl) {
        setLabelPdfUrl(data.shippingLabel.labelUrl)
      }

      toast({
        title: '✅ Etichetta Generata',
        description: `Etichetta di spedizione generata con successo! Tracking: ${data.shippingLabel.trackingNumber}`,
      })
    } catch (error: any) {
      console.error('Error generating label:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile generare l\'etichetta di spedizione',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadLabel = () => {
    if (labelPdfUrl) {
      window.open(labelPdfUrl, '_blank')
    }
  }

  const handleConfirmShipped = async () => {
    if (!shippingLabel?.trackingNumber) {
      toast({
        title: 'Errore',
        description: 'Etichetta non trovata',
        variant: 'destructive',
      })
      return
    }

    // Redirect to status page - il tracking è già salvato quando viene generata l'etichetta
    router.push(`/transaction/${transactionId}/status`)
  }

  // SECURITY: Client-side authorization check - only seller or admin can view this page
  // Only seller can actually generate label (server-side enforces this)
  useEffect(() => {
    if (!transaction || !user) return

    // Check if transaction is Verified Escrow
    if (transaction.escrowType !== 'VERIFIED') {
      toast({
        title: 'Errore',
        description: 'Questa transazione non è Verified Escrow',
        variant: 'destructive',
      })
      router.push(`/transaction/${transactionId}/status`)
      return
    }

    // Allow seller (userB) and admin to view the page
    // Only seller can generate label (server-side check in API)
    const isSeller = transaction.userBId === user.id
    const userRole = user.user_metadata?.role || 'USER'
    const isAdmin = userRole === 'ADMIN'

    if (!isSeller && !isAdmin) {
      toast({
        title: 'Accesso Negato',
        description: 'Solo il venditore può generare l\'etichetta di spedizione',
        variant: 'destructive',
      })
      router.push('/dashboard/proposals/received')
      return
    }
  }, [transaction, user, transactionId, router, toast])

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <span className="material-symbols-outlined text-3xl text-primary">local_shipping</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Genera Etichetta di Spedizione</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Genera automaticamente l'etichetta di spedizione per il tuo pacco
            </p>
          </div>

          {/* Info Card */}
          <Card className="glass-panel p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
              </div>
              <div>
                <h4 className="font-bold mb-2">Come Funziona</h4>
                <div className="space-y-3">
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span><strong>Inserisci il peso del pacco</strong> qui sotto (in kg).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span><strong>Clicca "Genera Etichetta"</strong> - il sistema genererà automaticamente l'etichetta PDF.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span><strong>Scarica e stampa l'etichetta</strong> - incolla l'etichetta sul pacco.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">4.</span>
                      <span><strong>Spedisci il pacco</strong> all'indirizzo hub SafeTrade tramite corriere.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">5.</span>
                      <span>Il nostro team riceverà il pacco e <strong>verificherà la carta</strong> quando arriverà all'hub.</span>
                    </li>
                  </ol>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-1">📮 Indirizzo Hub SafeTrade</p>
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      SafeTrade Hub<br />
                      {process.env.NEXT_PUBLIC_HUB_ADDRESS || 'Via [Indirizzo Hub], [Città], [CAP] Italia'}<br />
                      <span className="text-gray-500 italic">(Indirizzo completo da configurare)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Form */}
          {!shippingLabel ? (
            <Card className="glass-panel p-6">
              <form onSubmit={handleGenerateLabel} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso Pacco (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="30"
                    placeholder="0.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-12"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">
                    Inserisci il peso del pacco in chilogrammi (es. 0.5 per 500g)
                  </p>
                </div>

                <div className="space-y-4">
                  <Label>Dimensioni Pacco (opzionale, in cm)</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="length" className="text-xs">Lunghezza</Label>
                      <Input
                        id="length"
                        type="number"
                        placeholder="30"
                        value={dimensions.length}
                        onChange={(e) => setDimensions({ ...dimensions, length: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="width" className="text-xs">Larghezza</Label>
                      <Input
                        id="width"
                        type="number"
                        placeholder="20"
                        value={dimensions.width}
                        onChange={(e) => setDimensions({ ...dimensions, width: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height" className="text-xs">Altezza</Label>
                      <Input
                        id="height"
                        type="number"
                        placeholder="5"
                        value={dimensions.height}
                        onChange={(e) => setDimensions({ ...dimensions, height: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Le dimensioni sono opzionali. Se non specificate, verranno usati valori predefiniti (30x20x5 cm).
                  </p>
                </div>

                {/* Seller Shipping Address Form - SEMPRE visibile perché profilo User non ha indirizzo completo */}
                <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <Label className="text-base font-bold">📮 Indirizzo di Spedizione (Venditore) *</Label>
                      <p className="text-xs text-gray-500 mt-1">
                        Completa il tuo indirizzo di spedizione per generare l'etichetta
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="seller-street" className="text-sm">Via *</Label>
                          <Input
                            id="seller-street"
                            type="text"
                            placeholder="Via Roma"
                            value={sellerAddress.street}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, street: e.target.value })}
                            className="h-12"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="seller-house-number" className="text-sm">Numero Civico *</Label>
                          <Input
                            id="seller-house-number"
                            type="text"
                            placeholder="15"
                            value={sellerAddress.houseNumber}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, houseNumber: e.target.value })}
                            className="h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="seller-city" className="text-sm">Città *</Label>
                          <Input
                            id="seller-city"
                            type="text"
                            placeholder="Roma"
                            value={sellerAddress.city}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, city: e.target.value })}
                            className="h-12"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="seller-zip" className="text-sm">CAP *</Label>
                          <Input
                            id="seller-zip"
                            type="text"
                            placeholder="00100"
                            maxLength={5}
                            value={sellerAddress.zip}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, zip: e.target.value.replace(/\D/g, '') })}
                            className="h-12"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="seller-province" className="text-sm">Provincia</Label>
                          <Input
                            id="seller-province"
                            type="text"
                            placeholder="RM"
                            maxLength={2}
                            value={sellerAddress.province}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, province: e.target.value.toUpperCase().substring(0, 2) })}
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="seller-phone" className="text-sm">Telefono</Label>
                          <Input
                            id="seller-phone"
                            type="tel"
                            placeholder="+39 123 456 7890"
                            value={sellerAddress.phone}
                            onChange={(e) => setSellerAddress({ ...sellerAddress, phone: e.target.value })}
                            className="h-12"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

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
                    {loading ? 'Generazione...' : 'Genera Etichetta'}
                  </Button>
                </div>
              </form>
            </Card>
          ) : (
            <Card className="glass-panel p-6">
              <div className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    <span className="font-bold">Etichetta Generata con Successo!</span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    <p><strong>Tracking Number:</strong> {shippingLabel.trackingNumber}</p>
                    <p><strong>Costo Spedizione:</strong> €{shippingLabel.costAmount?.toFixed(2) || '0.00'}</p>
                    {shippingLabel.marginAmount > 0 && (
                      <p className="text-xs text-gray-500">(Margine: €{shippingLabel.marginAmount?.toFixed(2)})</p>
                    )}
                  </div>
                </div>

                {/* Download Label Button */}
                {labelPdfUrl && (
                  <div className="space-y-2">
                    <Label>Etichetta PDF</Label>
                    <Button
                      type="button"
                      onClick={handleDownloadLabel}
                      className="w-full bg-primary hover:bg-primary-dark"
                      variant="default"
                    >
                      <span className="material-symbols-outlined mr-2">download</span>
                      Scarica PDF Etichetta
                    </Button>
                    <p className="text-xs text-gray-500">
                      Stampa l'etichetta e incollala sul pacco prima di spedire
                    </p>
                  </div>
                )}

                {/* Confirm Shipped Button */}
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    onClick={handleConfirmShipped}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <span className="material-symbols-outlined mr-2">check_circle</span>
                    Ho Spedito il Pacco
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Clicca questo pulsante solo dopo aver spedito fisicamente il pacco al corriere
                  </p>
                </div>

                {/* Back Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full"
                >
                  Indietro
                </Button>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

