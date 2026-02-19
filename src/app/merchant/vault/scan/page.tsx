'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, QrCode, CheckCircle2, XCircle, Package, Scan } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { QRScanner } from '@/components/qr/QRScanner'
import { canSellPhysically } from '@/lib/vault/state-machine'

interface SlotInfo {
  id: string
  slotCode: string
  status: string
  case: {
    id: string
    label: string
  }
  item: {
    id: string
    name: string
    game: string
    set: string | null
    status: string
    priceFinal: number | null
    photos: string[]
  } | null
}

interface AvailableItem {
  id: string
  name: string
  game: string
  set: string | null
  conditionDeclared: string
  conditionVerified: string | null
  priceFinal: number | null
  owner: {
    id: string
    name: string | null
  }
  deposit: {
    id: string
    depositor: {
      id: string
      name: string | null
    }
  }
  createdAt: string
}

interface QueueItem {
  id: string
  name: string
  game: string
  set: string | null
  status: string
  photos: string[]
}

function MerchantVaultScanContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()
  const [qrToken, setQrToken] = useState<string>(searchParams.get('token') || '')
  const [scanning, setScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null)
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])
  const tabParam = searchParams.get('tab') as 'posiziona' | 'sposta' | 'vendi' | 'list-online' | 'fulfillment' | null
  const [activeTab, setActiveTab] = useState<'posiziona' | 'sposta' | 'vendi' | 'list-online' | 'fulfillment'>(
    tabParam && ['posiziona', 'sposta', 'vendi', 'list-online', 'fulfillment'].includes(tabParam) ? tabParam : 'posiziona'
  )
  
  // Tab "Sposta" state
  const [originSlot, setOriginSlot] = useState<SlotInfo | null>(null)
  const [destinationSlot, setDestinationSlot] = useState<SlotInfo | null>(null)
  const [moving, setMoving] = useState(false)

  // Tab "Vendi" state
  const [soldPrice, setSoldPrice] = useState<string>('')
  const [proofImage, setProofImage] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [requiresConfirmation, setRequiresConfirmation] = useState(false)
  const [selling, setSelling] = useState(false)

  // Tab "Lista Online" state
  const [listingOnline, setListingOnline] = useState(false)

  // Tab "Fulfillment" state
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [orderFilter, setOrderFilter] = useState<'RESERVED' | 'PAID' | 'FULFILLING' | 'SHIPPED' | 'all'>('all')
  const [fulfilling, setFulfilling] = useState(false)
  const [trackingCarrier, setTrackingCarrier] = useState<string>('')
  const [trackingCode, setTrackingCode] = useState<string>('')
  const [loadingOrders, setLoadingOrders] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  // Sync activeTab with URL tab param when it changes
  useEffect(() => {
    if (tabParam && ['posiziona', 'sposta', 'vendi', 'list-online', 'fulfillment'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleScanQR = useCallback(async () => {
    if (!qrToken.trim()) {
      setError('Inserisci il token QR dello slot')
      return
    }

    setScanning(true)
    setError('')
    setSuccess('')
    setSlotInfo(null)
    setAvailableItems([])
    setSelectedItemId('')

    try {
      const res = await fetch('/api/vault/merchant/scan-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella scansione')
      }

      setSlotInfo(data.data.slot)
      setAvailableItems(data.data.availableItems)

      if (data.data.slot.item) {
        setSuccess(`Slot ${data.data.slot.slotCode} già occupato da: ${data.data.slot.item.name}`)
      } else {
        setSuccess(`Slot ${data.data.slot.slotCode} libero. Seleziona una carta da assegnare.`)
      }
    } catch (err: any) {
      setError(err.message || 'Errore nella scansione QR')
    } finally {
      setScanning(false)
    }
  }, [qrToken])

  // Auto-scan if token is provided in URL
  useEffect(() => {
    if (qrToken && user && !scanning && !slotInfo) {
      handleScanQR()
    }
  }, [qrToken, user, handleScanQR, scanning, slotInfo])

  const fetchOrders = useCallback(async () => {
    try {
      setLoadingOrders(true)
      const params = new URLSearchParams()
      if (orderFilter !== 'all') {
        // Map 'RESERVED' to 'PAID' for API (orders in RESERVED state are actually PAID)
        params.append('status', orderFilter === 'RESERVED' ? 'PAID' : orderFilter)
      }
      const res = await fetch(`/api/vault/merchant/orders?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setOrders(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }, [orderFilter])

  // Fetch orders when fulfillment tab is active
  useEffect(() => {
    if (activeTab === 'fulfillment' && user) {
      fetchOrders()
    }
  }, [activeTab, user, fetchOrders])

  const handleAssignItem = async () => {
    if (!selectedItemId) {
      setError('Seleziona una carta da assegnare')
      return
    }

    if (!slotInfo) {
      setError('Scansiona prima uno slot')
      return
    }

    setAssigning(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/vault/merchant/assign-item-to-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItemId,
          slotId: slotInfo.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Errore nell\'assegnazione')
      }

      setSuccess(`Carta assegnata con successo allo slot ${slotInfo.slotCode}!`)
      setSelectedItemId('')
      
      // Ricarica info slot
      setTimeout(() => {
        handleScanQR()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Errore nell\'assegnazione')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark text-white font-display overflow-x-hidden">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="layout-container flex h-full min-h-screen flex-col relative z-10">
        {/* Top Navigation */}
        <header className="flex items-center justify-between border-b border-white/10 px-10 py-4 liquid-glass sticky top-0 z-50">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,187,204,0.5)]">
                <span className="text-background-dark font-bold">💼</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-white text-lg font-bold leading-tight tracking-tight">SafeTrade Vault</h2>
                <p className="text-primary text-[10px] uppercase tracking-[0.2em] font-black">Merchant Scan Hub</p>
              </div>
            </div>
            <nav className="flex items-center gap-6 ml-4">
              <button
                onClick={() => router.push('/merchant/vault')}
                className="text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                Dashboard
              </button>
              <button className="text-white text-sm font-bold border-b-2 border-primary pb-1">Inventory</button>
              <button
                onClick={() => router.push('/merchant/vault/orders')}
                className="text-white/60 hover:text-white text-sm font-medium transition-colors"
              >
                Orders
              </button>
              <button className="text-white/60 hover:text-white text-sm font-medium transition-colors">Settings</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
              <button className="p-2 text-white/40 hover:text-white transition-colors">🔔</button>
              <button className="p-2 text-white/40 hover:text-white transition-colors">💬</button>
            </div>
            <div className="h-10 w-px bg-white/10"></div>
            <div className="flex items-center gap-3 bg-white/5 pr-4 pl-1 py-1 rounded-full border border-white/10">
              <div className="size-8 rounded-full bg-primary/20 border border-white/20 flex items-center justify-center">
                <span>👤</span>
              </div>
              <span className="text-sm font-bold">Merchant</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex gap-6 px-10 py-8 max-w-[1600px] mx-auto w-full">
          {/* Left Operation Column */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Scan Hub Glass Panel */}
            <div className="liquid-glass rounded-3xl p-1 overflow-hidden">
              <div className="flex justify-between items-center p-6 pb-2">
                <div>
                  <h1 className="text-4xl font-black text-white tracking-tighter">Scan Hub</h1>
                  <p className="text-white/50 text-sm mt-1">Gestione flussi operativi in tempo reale</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                  <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                  <span className="text-primary text-xs font-bold uppercase tracking-widest">Scanner Live</span>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 border-b border-white/5 flex gap-10">
                <button
                  onClick={() => setActiveTab('posiziona')}
                  className={`flex flex-col items-center pt-4 pb-4 border-b-4 transition-all ${
                    activeTab === 'posiziona' ? 'border-primary' : 'border-transparent hover:border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-sm font-bold tracking-wider uppercase">Posiziona</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter" style={{ color: activeTab === 'posiziona' ? '#00bbcc' : 'rgba(255,255,255,0.5)' }}>
                    Inbound
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('sposta')}
                  className={`flex flex-col items-center pt-4 pb-4 border-b-4 transition-all ${
                    activeTab === 'sposta' ? 'border-primary' : 'border-transparent hover:border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-sm font-bold tracking-wider uppercase">Sposta</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter" style={{ color: activeTab === 'sposta' ? '#00bbcc' : 'rgba(255,255,255,0.5)' }}>
                    Relocation
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('vendi')}
                  className={`flex flex-col items-center pt-4 pb-4 border-b-4 transition-all ${
                    activeTab === 'vendi' ? 'border-primary' : 'border-transparent hover:border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-sm font-bold tracking-wider uppercase">Vendi</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter" style={{ color: activeTab === 'vendi' ? '#00bbcc' : 'rgba(255,255,255,0.5)' }}>
                    Listing
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('list-online')}
                  className={`flex flex-col items-center pt-4 pb-4 border-b-4 transition-all ${
                    activeTab === 'list-online' ? 'border-primary' : 'border-transparent hover:border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-sm font-bold tracking-wider uppercase">Lista Online</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter" style={{ color: activeTab === 'list-online' ? '#00bbcc' : 'rgba(255,255,255,0.5)' }}>
                    Publish
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('fulfillment')}
                  className={`flex flex-col items-center pt-4 pb-4 border-b-4 transition-all ${
                    activeTab === 'fulfillment' ? 'border-primary' : 'border-transparent hover:border-white/20 opacity-40 hover:opacity-100'
                  }`}
                >
                  <span className="text-white text-sm font-bold tracking-wider uppercase">Pick & Ship</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter" style={{ color: activeTab === 'fulfillment' ? '#00bbcc' : 'rgba(255,255,255,0.5)' }}>
                    Fulfillment
                  </span>
                </button>
              </div>

              <div className="p-8">
                {/* Tab Content: Posiziona */}
                {activeTab === 'posiziona' && (
                  <>
                    {/* Step Indicator */}
                    <div className="flex items-center gap-4 mb-8">
                      <div className="size-12 rounded-2xl bg-accent-orange/20 border border-accent-orange/40 flex items-center justify-center">
                        <QrCode className="text-accent-orange font-bold" size={24} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">Passo 1: Scansiona lo SLOT</h3>
                        <p className="text-white/40 text-sm leading-relaxed">
                          Posiziona il QR code dello slot della teca nell'area di scansione sottostante.
                        </p>
                      </div>
                    </div>

                {/* Scan Area / Viewfinder */}
                {showScanner ? (
                  <div className="mb-8">
                    <QRScanner
                      onScanSuccess={(decodedText) => {
                        // Parse QR data
                        try {
                          const data = JSON.parse(decodedText)
                          if (data.qrToken) {
                            setQrToken(data.qrToken)
                            setShowScanner(false)
                            handleScanQR()
                          } else if (data.scanUrl) {
                            // Extract token from URL
                            const token = data.scanUrl.split('/scan/')[1]
                            if (token) {
                              setQrToken(token)
                              setShowScanner(false)
                              handleScanQR()
                            }
                          }
                        } catch {
                          // If not JSON, try to extract token from URL
                          if (decodedText.includes('/scan/')) {
                            const token = decodedText.split('/scan/')[1]?.split('?')[0]
                            if (token) {
                              setQrToken(token)
                              setShowScanner(false)
                              handleScanQR()
                            }
                          } else {
                            setQrToken(decodedText)
                            setShowScanner(false)
                            handleScanQR()
                          }
                        }
                      }}
                      onScanError={(error) => {
                        setError(error)
                      }}
                      onClose={() => setShowScanner(false)}
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group mb-8">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-80 border-2 border-primary/40 rounded-xl relative">
                      <div className="absolute -top-1 -left-1 size-6 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                      <div className="absolute -top-1 -right-1 size-6 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                      <div className="absolute -bottom-1 -left-1 size-6 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                      <div className="absolute -bottom-1 -right-1 size-6 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                      {/* Animated Scan Line */}
                      <div className="absolute w-full h-0.5 bg-primary animate-pulse z-10" style={{ top: '50%' }}></div>
                    </div>
                  </div>
                  {/* Viewfinder HUD */}
                  <div className="absolute bottom-6 left-6 flex gap-4">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                      <span className="text-primary text-sm">🔍</span>
                      <span className="text-[10px] font-mono tracking-widest uppercase">AF-Lock</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                      <span className="text-primary text-sm">☀️</span>
                      <span className="text-[10px] font-mono tracking-widest uppercase">ISO-Auto</span>
                    </div>
                  </div>
                  <div className="absolute top-6 right-6">
                    <button className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 p-2 rounded-xl backdrop-blur-xl transition-all">
                      <span>🔍</span>
                    </button>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      onClick={() => setShowScanner(true)}
                      className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 px-8 py-4 rounded-2xl backdrop-blur-xl transition-all flex items-center gap-3"
                    >
                      <Scan className="h-5 w-5" />
                      <span className="font-bold">Avvia Scanner QR</span>
                    </Button>
                  </div>
                </div>
                )}

                {/* Manual Input Section */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
                      oppure inserimento manuale
                    </span>
                    <div className="h-px flex-1 bg-white/10"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-4 flex items-center text-white/40">
                        <span>🔑</span>
                      </div>
                      <input
                        type="text"
                        value={qrToken}
                        onChange={(e) => setQrToken(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleScanQR()}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all liquid-glass"
                        placeholder="ID Token o Serial Number Vault..."
                      />
                    </div>
                    <Button
                      onClick={handleScanQR}
                      disabled={scanning}
                      className="bg-primary text-background-dark px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,187,204,0.3)]"
                    >
                      {scanning ? <Loader2 className="animate-spin" size={16} /> : 'Elabora'}
                    </Button>
                  </div>
                </div>

                {/* Slot Info & Item Selection */}
                {slotInfo && (
                  <div className="mt-8 space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="border-green-500 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                      </Alert>
                    )}

                    {slotInfo.status === 'FREE' && availableItems.length > 0 && (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-6">
                          <h4 className="text-white font-bold mb-4">Seleziona Carta da Assegnare</h4>
                          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue placeholder="Seleziona una carta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  <div className="flex flex-col">
                                    <span className="font-semibold">{item.name}</span>
                                    <span className="text-sm text-gray-400">
                                      {item.game} • {item.set || 'N/A'} • €{item.priceFinal?.toFixed(2) || 'N/D'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedItemId && (
                            <Button
                              onClick={handleAssignItem}
                              disabled={assigning}
                              className="w-full mt-4 bg-primary text-white"
                            >
                              {assigning ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Assegnazione...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Assegna Carta allo Slot
                                </>
                              )}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Tab Content: Sposta */}
            {activeTab === 'sposta' && (
              <>
                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="size-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-500 text-2xl">swap_horiz</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {!originSlot ? 'Passo 1: Scansiona Slot ORIGINE' : !destinationSlot ? 'Passo 2: Scansiona Slot DESTINAZIONE' : 'Conferma Spostamento'}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {!originSlot 
                        ? 'Scansiona lo slot da cui vuoi spostare la carta (deve essere occupato).'
                        : !destinationSlot
                        ? 'Scansiona lo slot di destinazione (deve essere libero).'
                        : 'Verifica le informazioni e conferma lo spostamento.'}
                    </p>
                  </div>
                </div>

                {/* Scan Area */}
                {showScanner ? (
                  <div className="mb-8">
                    <QRScanner
                      onScanSuccess={(decodedText) => {
                        try {
                          const data = JSON.parse(decodedText)
                          if (data.qrToken) {
                            setQrToken(data.qrToken)
                            setShowScanner(false)
                            handleScanQR()
                          } else if (data.scanUrl) {
                            const token = data.scanUrl.split('/scan/')[1]
                            if (token) {
                              setQrToken(token)
                              setShowScanner(false)
                              handleScanQR()
                            }
                          }
                        } catch {
                          if (decodedText.includes('/scan/')) {
                            const token = decodedText.split('/scan/')[1]?.split('?')[0]
                            if (token) {
                              setQrToken(token)
                              setShowScanner(false)
                              handleScanQR()
                            }
                          } else {
                            setQrToken(decodedText)
                            setShowScanner(false)
                            handleScanQR()
                          }
                        }
                      }}
                      onScanError={(error) => setError(error)}
                      onClose={() => setShowScanner(false)}
                    />
                  </div>
                ) : (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group mb-8">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button
                        onClick={() => setShowScanner(true)}
                        className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 px-8 py-4 rounded-2xl backdrop-blur-xl transition-all flex items-center gap-3"
                      >
                        <Scan className="h-5 w-5" />
                        <span className="font-bold">Avvia Scanner QR</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Manual Input */}
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
                      oppure inserimento manuale
                    </span>
                    <div className="h-px flex-1 bg-white/10"></div>
                  </div>
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-4 flex items-center text-white/40">
                        <span>🔑</span>
                      </div>
                      <input
                        type="text"
                        value={qrToken}
                        onChange={(e) => setQrToken(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleScanQR()}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all liquid-glass"
                        placeholder="ID Token o Serial Number Vault..."
                      />
                    </div>
                    <Button
                      onClick={handleScanQR}
                      disabled={scanning}
                      className="bg-primary text-background-dark px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,187,204,0.3)]"
                    >
                      {scanning ? <Loader2 className="animate-spin" size={16} /> : 'Elabora'}
                    </Button>
                  </div>
                </div>

                {/* Origin Slot Info */}
                {slotInfo && !originSlot && slotInfo.status === 'OCCUPIED' && slotInfo.item && (
                  <Card className="bg-white/5 border-white/10 mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold">Slot Origine: {slotInfo.slotCode}</h4>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Occupato</Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-white/80"><strong>Carta:</strong> {slotInfo.item.name}</p>
                        <p className="text-white/60"><strong>Game:</strong> {slotInfo.item.game}</p>
                        <p className="text-white/60"><strong>Status:</strong> {slotInfo.item.status}</p>
                      </div>
                      <Button
                        onClick={() => {
                          setOriginSlot(slotInfo)
                          setSlotInfo(null)
                          setQrToken('')
                          setSuccess('Slot origine selezionato. Ora scansiona lo slot destinazione.')
                        }}
                        className="w-full bg-primary text-white"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Conferma Slot Origine
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Destination Slot Info */}
                {slotInfo && originSlot && slotInfo.status === 'FREE' && (
                  <Card className="bg-white/5 border-white/10 mb-4">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-white font-bold">Slot Destinazione: {slotInfo.slotCode}</h4>
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Libero</Badge>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-lg">
                          <p className="text-white/60 text-sm mb-2">Da spostare:</p>
                          <p className="text-white font-bold">{originSlot.item?.name}</p>
                          <p className="text-white/60 text-sm">Slot {originSlot.slotCode} → Slot {slotInfo.slotCode}</p>
                        </div>
                        <Button
                          onClick={async () => {
                            if (!originSlot.item) return
                            setMoving(true)
                            setError('')
                            try {
                              const res = await fetch(`/api/vault/merchant/items/${originSlot.item.id}/move-slot`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ slotId: slotInfo.id }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Errore nello spostamento')
                              setSuccess(`Carta spostata con successo da ${originSlot.slotCode} a ${slotInfo.slotCode}!`)
                              setOriginSlot(null)
                              setSlotInfo(null)
                              setQrToken('')
                              setTimeout(() => {
                                setSuccess('')
                              }, 3000)
                            } catch (err: any) {
                              setError(err.message || 'Errore nello spostamento')
                            } finally {
                              setMoving(false)
                            }
                          }}
                          disabled={moving}
                          className="w-full bg-primary text-white"
                        >
                          {moving ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Spostamento...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Conferma Spostamento
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Error Messages */}
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="mb-4 border-green-500 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-400">{success}</AlertDescription>
                  </Alert>
                )}

                {/* Reset Button */}
                {originSlot && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOriginSlot(null)
                      setDestinationSlot(null)
                      setSlotInfo(null)
                      setQrToken('')
                      setError('')
                      setSuccess('')
                    }}
                    className="w-full mt-4"
                  >
                    Reset
                  </Button>
                )}
              </>
            )}

            {/* Tab Content: Vendi */}
            {activeTab === 'vendi' && (
              <>
                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="size-12 rounded-2xl bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                    <span className="text-green-500 text-2xl">💰</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {!slotInfo || !slotInfo.item ? 'Passo 1: Scansiona Slot con Carta' : 'Passo 2: Registra Vendita'}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {!slotInfo || !slotInfo.item
                        ? 'Scansiona lo slot della teca che contiene la carta venduta.'
                        : 'Inserisci i dettagli della vendita e conferma.'}
                    </p>
                  </div>
                </div>

                {/* Scan Area */}
                {!slotInfo || !slotInfo.item ? (
                  <>
                    {showScanner ? (
                      <div className="mb-8">
                        <QRScanner
                          onScanSuccess={(decodedText) => {
                            try {
                              const data = JSON.parse(decodedText)
                              if (data.qrToken) {
                                setQrToken(data.qrToken)
                                setShowScanner(false)
                                handleScanQR()
                              } else if (data.scanUrl) {
                                const token = data.scanUrl.split('/scan/')[1]
                                if (token) {
                                  setQrToken(token)
                                  setShowScanner(false)
                                  handleScanQR()
                                }
                              }
                            } catch {
                              if (decodedText.includes('/scan/')) {
                                const token = decodedText.split('/scan/')[1]?.split('?')[0]
                                if (token) {
                                  setQrToken(token)
                                  setShowScanner(false)
                                  handleScanQR()
                                }
                              } else {
                                setQrToken(decodedText)
                                setShowScanner(false)
                                handleScanQR()
                              }
                            }
                          }}
                          onScanError={(error) => setError(error)}
                          onClose={() => setShowScanner(false)}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group mb-8">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            onClick={() => setShowScanner(true)}
                            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 px-8 py-4 rounded-2xl backdrop-blur-xl transition-all flex items-center gap-3"
                          >
                            <Scan className="h-5 w-5" />
                            <span className="font-bold">Avvia Scanner QR</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual Input */}
                    <div className="flex flex-col gap-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
                          oppure inserimento manuale
                        </span>
                        <div className="h-px flex-1 bg-white/10"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-4 flex items-center text-white/40">
                            <span>🔑</span>
                          </div>
                          <input
                            type="text"
                            value={qrToken}
                            onChange={(e) => setQrToken(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleScanQR()}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all liquid-glass"
                            placeholder="ID Token o Serial Number Vault..."
                          />
                        </div>
                        <Button
                          onClick={handleScanQR}
                          disabled={scanning}
                          className="bg-primary text-background-dark px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,187,204,0.3)]"
                        >
                          {scanning ? <Loader2 className="animate-spin" size={16} /> : 'Elabora'}
                        </Button>
                      </div>
                    </div>

                    {/* Error Messages */}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mb-4 border-green-500 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <>
                    {/* Validation: Slot must be occupied */}
                    {slotInfo.status === 'FREE' && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Questo slot è vuoto. Puoi vendere solo carte presenti nella teca.
                        </AlertDescription>
                      </Alert>
                    )}
                    {/* Validation: Item must be sellable physically (IN_CASE or LISTED_ONLINE) */}
                    {slotInfo.item && !canSellPhysically(slotInfo.item.status as any) && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Questa carta non può essere venduta fisicamente (stato: {slotInfo.item.status}). Solo carte in teca o già listate online possono essere vendute in negozio.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Item Info - only show form if can sell physically */}
                    {slotInfo.item && slotInfo.status === 'OCCUPIED' && canSellPhysically(slotInfo.item.status as any) && (
                      <Card className="bg-white/5 border-white/10 mb-6">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-white font-bold">Slot: {slotInfo.slotCode}</h4>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Occupato</Badge>
                          </div>
                          <div className="space-y-3 mb-4">
                            <div>
                              <p className="text-white/60 text-sm mb-1">Carta:</p>
                              <p className="text-white font-bold text-lg">{slotInfo.item.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-white/60 text-sm mb-1">Game:</p>
                                <p className="text-white font-medium">{slotInfo.item.game}</p>
                              </div>
                              {slotInfo.item.set && (
                                <div>
                                  <p className="text-white/60 text-sm mb-1">Set:</p>
                                  <p className="text-white font-medium">{slotInfo.item.set}</p>
                                </div>
                              )}
                            </div>
                            {slotInfo.item.priceFinal && (
                              <div>
                                <p className="text-white/60 text-sm mb-1">Valore Stimato:</p>
                                <p className="text-primary font-bold text-xl">
                                  €{slotInfo.item.priceFinal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Sale Form - only when item can be sold physically */}
                    {slotInfo.item && canSellPhysically(slotInfo.item.status as any) && (
                    <Card className="bg-white/5 border-white/10 mb-6">
                      <CardContent className="p-6 space-y-6">
                        <h4 className="text-white font-bold text-lg">Dettagli Vendita</h4>

                        {/* Price Input */}
                        <div>
                          <label className="text-white/60 text-sm font-medium mb-2 block">
                            Prezzo Vendita (€) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="100000"
                            value={soldPrice}
                            onChange={(e) => {
                              const val = e.target.value
                              setSoldPrice(val)
                              // Auto-set requiresConfirmation if price > 500
                              if (parseFloat(val) > 500) {
                                setRequiresConfirmation(false) // Reset, user will need to confirm
                              }
                            }}
                            placeholder={slotInfo.item?.priceFinal?.toFixed(2) || '0.00'}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                          {slotInfo.item?.priceFinal && (
                            <p className="text-white/40 text-xs mt-1">
                              Valore stimato: €{slotInfo.item.priceFinal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>

                        {/* Proof Image (Optional) */}
                        <div>
                          <label className="text-white/60 text-sm font-medium mb-2 block">
                            Foto Prova Vendita (opzionale)
                          </label>
                          <input
                            type="text"
                            value={proofImage}
                            onChange={(e) => setProofImage(e.target.value)}
                            placeholder="URL immagine..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                          <p className="text-white/40 text-xs mt-1">Inserisci l'URL di un'immagine di prova (opzionale)</p>
                        </div>

                        {/* Notes (Optional) */}
                        <div>
                          <label className="text-white/60 text-sm font-medium mb-2 block">Note (opzionale)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Note aggiuntive sulla vendita..."
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                          />
                        </div>

                        {/* Confirmation Checkbox for high-value sales */}
                        {parseFloat(soldPrice) > 500 && (
                          <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                            <input
                              type="checkbox"
                              id="confirmHighValue"
                              checked={requiresConfirmation}
                              onChange={(e) => setRequiresConfirmation(e.target.checked)}
                              className="mt-1 size-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
                            />
                            <label htmlFor="confirmHighValue" className="text-yellow-400 text-sm cursor-pointer">
                              ⚠️ Confermo che il prezzo di vendita (€{parseFloat(soldPrice).toLocaleString('it-IT', { minimumFractionDigits: 2 })}) è corretto per questa carta.
                            </label>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                          <Button
                            onClick={async () => {
                              if (!slotInfo?.item) {
                                setError('Nessuna carta selezionata')
                                return
                              }

                              const price = parseFloat(soldPrice)
                              if (!price || price < 0.01 || price > 100000) {
                                setError('Inserisci un prezzo valido (€0.01 - €100,000)')
                                return
                              }

                              // Check if confirmation required
                              if (price > 500 && !requiresConfirmation) {
                                setError('Conferma esplicita richiesta per vendite superiori a €500')
                                return
                              }

                              setSelling(true)
                              setError('')
                              setSuccess('')

                              try {
                                const res = await fetch('/api/vault/merchant/sales', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    itemId: slotInfo.item.id,
                                    soldPrice: price,
                                    proofImage: proofImage || undefined,
                                    requiresConfirmation: price > 500 ? requiresConfirmation : undefined,
                                  }),
                                })

                                const data = await res.json()

                                if (!res.ok) {
                                  // If requires confirmation, show it
                                  if (data.requiresConfirmation) {
                                    setRequiresConfirmation(true)
                                    setError(data.error || 'Conferma richiesta')
                                    return
                                  }
                                  throw new Error(data.error || 'Errore nella registrazione della vendita')
                                }

                                setSuccess(`Vendita registrata con successo! Prezzo: €${price.toFixed(2)}`)
                                
                                // Reset form
                                setTimeout(() => {
                                  setSlotInfo(null)
                                  setSoldPrice('')
                                  setProofImage('')
                                  setNotes('')
                                  setRequiresConfirmation(false)
                                  setQrToken('')
                                  setSuccess('')
                                }, 3000)
                              } catch (err: any) {
                                setError(err.message || 'Errore nella registrazione della vendita')
                              } finally {
                                setSelling(false)
                              }
                            }}
                            disabled={selling || !soldPrice || parseFloat(soldPrice) < 0.01}
                            className="flex-1 bg-primary text-white hover:bg-primary/90 h-12 rounded-xl font-bold"
                          >
                            {selling ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Registrazione...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Registra Vendita
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSlotInfo(null)
                              setSoldPrice('')
                              setProofImage('')
                              setNotes('')
                              setRequiresConfirmation(false)
                              setQrToken('')
                              setError('')
                              setSuccess('')
                            }}
                            className="h-12 rounded-xl"
                          >
                            Reset
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    )}

                    {/* Error/Success Messages */}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mb-4 border-green-500 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </>
            )}

            {/* Tab Content: Lista Online */}
            {activeTab === 'list-online' && (
              <>
                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="size-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                    <span className="text-purple-500 text-2xl">🌐</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {!slotInfo || !slotInfo.item ? 'Passo 1: Scansiona Slot con Carta' : 'Passo 2: Pubblica Online'}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {!slotInfo || !slotInfo.item
                        ? 'Scansiona lo slot della teca che contiene la carta da pubblicare online.'
                        : 'Pubblica la carta sul marketplace per la vendita online.'}
                    </p>
                  </div>
                </div>

                {/* Scan Area */}
                {!slotInfo || !slotInfo.item ? (
                  <>
                    {showScanner ? (
                      <div className="mb-8">
                        <QRScanner
                          onScanSuccess={(decodedText) => {
                            try {
                              const data = JSON.parse(decodedText)
                              if (data.qrToken) {
                                setQrToken(data.qrToken)
                                setShowScanner(false)
                                handleScanQR()
                              } else if (data.scanUrl) {
                                const token = data.scanUrl.split('/scan/')[1]
                                if (token) {
                                  setQrToken(token)
                                  setShowScanner(false)
                                  handleScanQR()
                                }
                              }
                            } catch {
                              if (decodedText.includes('/scan/')) {
                                const token = decodedText.split('/scan/')[1]?.split('?')[0]
                                if (token) {
                                  setQrToken(token)
                                  setShowScanner(false)
                                  handleScanQR()
                                }
                              } else {
                                setQrToken(decodedText)
                                setShowScanner(false)
                                handleScanQR()
                              }
                            }
                          }}
                          onScanError={(error) => setError(error)}
                          onClose={() => setShowScanner(false)}
                        />
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group mb-8">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Button
                            onClick={() => setShowScanner(true)}
                            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 px-8 py-4 rounded-2xl backdrop-blur-xl transition-all flex items-center gap-3"
                          >
                            <Scan className="h-5 w-5" />
                            <span className="font-bold">Avvia Scanner QR</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Manual Input */}
                    <div className="flex flex-col gap-4 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-xs font-bold text-white/30 uppercase tracking-[0.3em]">
                          oppure inserimento manuale
                        </span>
                        <div className="h-px flex-1 bg-white/10"></div>
                      </div>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-4 flex items-center text-white/40">
                            <span>🔑</span>
                          </div>
                          <input
                            type="text"
                            value={qrToken}
                            onChange={(e) => setQrToken(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleScanQR()}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all liquid-glass"
                            placeholder="ID Token o Serial Number Vault..."
                          />
                        </div>
                        <Button
                          onClick={handleScanQR}
                          disabled={scanning}
                          className="bg-primary text-background-dark px-8 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(0,187,204,0.3)]"
                        >
                          {scanning ? <Loader2 className="animate-spin" size={16} /> : 'Elabora'}
                        </Button>
                      </div>
                    </div>

                    {/* Error/Success Messages */}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert className="mb-4 border-green-500 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <>
                    {/* Validation: Slot must be occupied and item must be IN_CASE */}
                    {slotInfo.status === 'FREE' && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          Questo slot è vuoto. Puoi pubblicare online solo carte presenti nella teca.
                        </AlertDescription>
                      </Alert>
                    )}

                    {slotInfo.item && slotInfo.item.status !== 'IN_CASE' && (
                      <Alert variant="destructive" className="mb-4">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          La carta deve essere nella teca (stato: IN_CASE) per essere pubblicata online. Stato corrente: {slotInfo.item.status}
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Item Info */}
                    {slotInfo.item && slotInfo.status === 'OCCUPIED' && slotInfo.item.status === 'IN_CASE' && (
                      <>
                        <Card className="bg-white/5 border-white/10 mb-6">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-white font-bold">Slot: {slotInfo.slotCode}</h4>
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Occupato</Badge>
                            </div>
                            <div className="space-y-3 mb-4">
                              <div>
                                <p className="text-white/60 text-sm mb-1">Carta:</p>
                                <p className="text-white font-bold text-lg">{slotInfo.item.name}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-white/60 text-sm mb-1">Game:</p>
                                  <p className="text-white font-medium">{slotInfo.item.game}</p>
                                </div>
                                {slotInfo.item.set && (
                                  <div>
                                    <p className="text-white/60 text-sm mb-1">Set:</p>
                                    <p className="text-white font-medium">{slotInfo.item.set}</p>
                                  </div>
                                )}
                              </div>
                              {slotInfo.item.priceFinal && (
                                <div>
                                  <p className="text-white/60 text-sm mb-1">Valore Stimato:</p>
                                  <p className="text-primary font-bold text-xl">
                                    €{slotInfo.item.priceFinal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* List Online Form */}
                        <Card className="bg-white/5 border-white/10 mb-6">
                          <CardContent className="p-6 space-y-6">
                            <h4 className="text-white font-bold text-lg">Pubblica Online</h4>
                            
                            <div className="space-y-4">
                              <Alert className="border-purple-500/20 bg-purple-500/10">
                                <AlertDescription className="text-purple-400">
                                  💡 La carta sarà pubblicata sul marketplace con il prezzo stimato ({slotInfo.item.priceFinal ? `€${slotInfo.item.priceFinal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'}). 
                                  Gli utenti potranno acquistarla online.
                                </AlertDescription>
                              </Alert>

                              <div className="p-4 glass rounded-xl bg-primary/5 border border-primary/20">
                                <p className="text-white/60 text-sm mb-2">Cosa succede:</p>
                                <ul className="text-white/80 text-sm space-y-1 list-disc list-inside">
                                  <li>La carta rimarrà fisicamente nella teca</li>
                                  <li>Lo status passerà da IN_CASE a LISTED_ONLINE</li>
                                  <li>Diventerà visibile sul marketplace</li>
                                  <li>Quando venduta online, verrà gestita tramite il tab "Fulfillment"</li>
                                </ul>
                              </div>
                            </div>

                            {/* Action Button */}
                            <Button
                              onClick={async () => {
                                if (!slotInfo?.item) {
                                  setError('Nessuna carta selezionata')
                                  return
                                }

                                if (slotInfo.item.status !== 'IN_CASE') {
                                  setError(`La carta deve essere nella teca (IN_CASE) per essere pubblicata online. Stato corrente: ${slotInfo.item.status}`)
                                  return
                                }

                                setListingOnline(true)
                                setError('')
                                setSuccess('')

                                try {
                                  const res = await fetch(`/api/vault/merchant/items/${slotInfo.item.id}/list-online`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                  })

                                  const data = await res.json()

                                  if (!res.ok) {
                                    throw new Error(data.error || 'Errore nella pubblicazione online')
                                  }

                                  setSuccess(`Carta "${slotInfo.item.name}" pubblicata online con successo!`)
                                  
                                  // Reset form
                                  setTimeout(() => {
                                    setSlotInfo(null)
                                    setQrToken('')
                                    setSuccess('')
                                  }, 3000)
                                } catch (err: any) {
                                  setError(err.message || 'Errore nella pubblicazione online')
                                } finally {
                                  setListingOnline(false)
                                }
                              }}
                              disabled={listingOnline || !slotInfo?.item || slotInfo.item.status !== 'IN_CASE'}
                              className="w-full bg-purple-500 text-white hover:bg-purple-600 h-12 rounded-xl font-bold"
                            >
                              {listingOnline ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Pubblicazione...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Pubblica Online
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              onClick={() => {
                                setSlotInfo(null)
                                setQrToken('')
                                setError('')
                                setSuccess('')
                              }}
                              className="w-full h-12 rounded-xl"
                            >
                              Reset
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Error/Success Messages */}
                        {error && (
                          <Alert variant="destructive" className="mb-4">
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        )}

                        {success && (
                          <Alert className="mb-4 border-green-500 bg-green-500/10">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-400">{success}</AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}

            {/* Tab Content: Fulfillment */}
            {activeTab === 'fulfillment' && (
              <>
                {/* Step Indicator */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="size-12 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                    <Package className="text-blue-500 font-bold" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {!selectedOrder ? 'Gestione Ordini da Evadere' : selectedOrder.status === 'PAID' ? 'Passo 1: Prepara Spedizione' : 'Passo 2: Aggiungi Tracking'}
                    </h3>
                    <p className="text-white/40 text-sm leading-relaxed">
                      {!selectedOrder
                        ? 'Seleziona un ordine da evadere o scansiona lo slot della carta.'
                        : selectedOrder.status === 'PAID'
                        ? 'Verifica che la carta corrisponda all\'ordine e prepara la spedizione.'
                        : 'Aggiungi il codice di tracking della spedizione.'}
                    </p>
                  </div>
                </div>

                {/* Orders List & Filters */}
                {!selectedOrder && (
                  <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setOrderFilter('all')}
                        className={`px-4 py-2 glass rounded-xl text-sm font-bold transition-all ${
                          orderFilter === 'all' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
                        }`}
                      >
                        Tutti
                      </Button>
                      <Button
                        onClick={() => setOrderFilter('PAID')}
                        className={`px-4 py-2 glass rounded-xl text-sm font-bold transition-all ${
                          orderFilter === 'PAID' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
                        }`}
                      >
                        Da Evadere (PAID)
                      </Button>
                      <Button
                        onClick={() => setOrderFilter('FULFILLING')}
                        className={`px-4 py-2 glass rounded-xl text-sm font-bold transition-all ${
                          orderFilter === 'FULFILLING' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
                        }`}
                      >
                        In Preparazione
                      </Button>
                      <Button
                        onClick={() => setOrderFilter('SHIPPED')}
                        className={`px-4 py-2 glass rounded-xl text-sm font-bold transition-all ${
                          orderFilter === 'SHIPPED' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
                        }`}
                      >
                        Spediti
                      </Button>
                    </div>

                    {/* Orders List */}
                    {loadingOrders ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : orders.length === 0 ? (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-8 text-center">
                          <Package className="h-16 w-16 mx-auto mb-4 text-white/20" />
                          <h4 className="text-xl font-bold mb-2">Nessun ordine trovato</h4>
                          <p className="text-white/40">
                            Non ci sono ordini nel periodo selezionato.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {orders
                          .filter((o) => {
                            if (orderFilter === 'all') return true
                            if (orderFilter === 'RESERVED') return o.status === 'PAID'
                            return o.status === orderFilter
                          })
                          .map((order) => (
                            <Card
                              key={order.id}
                              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                      <h4 className="text-lg font-bold">{order.item.name}</h4>
                                      <Badge
                                        className={
                                          order.status === 'PAID'
                                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                            : order.status === 'FULFILLING'
                                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                            : order.status === 'SHIPPED'
                                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                        }
                                      >
                                        {order.status}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <p className="text-white/60 mb-1">Acquirente:</p>
                                        <p className="font-medium">{order.buyer.name || order.buyer.email}</p>
                                      </div>
                                      <div>
                                        <p className="text-white/60 mb-1">Slot:</p>
                                        <p className="font-medium">{order.item.slot?.slotCode || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <p className="text-white/60 mb-1">Totale:</p>
                                        <p className="font-bold text-primary">
                                          €{((order.totals as any)?.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-white/60 mb-1">Data:</p>
                                        <p className="font-medium">{new Date(order.createdAt).toLocaleDateString('it-IT')}</p>
                                      </div>
                                    </div>
                                    {order.fulfillment?.trackingCode && (
                                      <div className="mt-3 pt-3 border-t border-white/10">
                                        <p className="text-xs text-white/60">
                                          Tracking: <span className="font-bold">{order.fulfillment.trackingCode}</span>
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedOrder(order)
                                    }}
                                    className="ml-4"
                                  >
                                    Dettagli →
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Detail & Actions */}
                {selectedOrder && (
                  <div className="space-y-6">
                    {/* Order Info */}
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="text-xl font-bold">Ordine #{selectedOrder.id.slice(-8).toUpperCase()}</h4>
                          <Button variant="ghost" onClick={() => setSelectedOrder(null)}>
                            ✕
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-white/60 text-sm mb-1">Carta:</p>
                            <p className="font-bold text-lg">{selectedOrder.item.name}</p>
                            <p className="text-sm text-white/60">{selectedOrder.item.game}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm mb-1">Slot:</p>
                            <p className="font-bold">{selectedOrder.item.slot?.slotCode || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm mb-1">Acquirente:</p>
                            <p className="font-medium">{selectedOrder.buyer.name || selectedOrder.buyer.email}</p>
                          </div>
                          <div>
                            <p className="text-white/60 text-sm mb-1">Totale:</p>
                            <p className="font-bold text-primary text-lg">
                              €{((selectedOrder.totals as any)?.total || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                        {selectedOrder.shippingAddress && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <p className="text-white/60 text-sm mb-1">Indirizzo Spedizione:</p>
                            <p className="text-sm">
                              {Object.values(selectedOrder.shippingAddress as any).filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Scan Slot for Pick (only if status is PAID) */}
                    {selectedOrder.status === 'PAID' && (
                      <Card className="bg-white/5 border-white/10">
                        <CardContent className="p-6 space-y-4">
                          <h4 className="text-white font-bold">Scansiona Slot per Pick</h4>
                          <p className="text-white/60 text-sm">
                            Scansiona lo slot della carta per verificare che corrisponda all'ordine (slot atteso: {selectedOrder.item.slot?.slotCode || 'N/A'}).
                          </p>
                          
                          {showScanner ? (
                            <div className="mb-4">
                              <QRScanner
                                onScanSuccess={(decodedText) => {
                                  try {
                                    const data = JSON.parse(decodedText)
                                    if (data.qrToken) {
                                      setQrToken(data.qrToken)
                                      setShowScanner(false)
                                      handleScanQR()
                                    } else if (data.scanUrl) {
                                      const token = data.scanUrl.split('/scan/')[1]
                                      if (token) {
                                        setQrToken(token)
                                        setShowScanner(false)
                                        handleScanQR()
                                      }
                                    }
                                  } catch {
                                    if (decodedText.includes('/scan/')) {
                                      const token = decodedText.split('/scan/')[1]?.split('?')[0]
                                      if (token) {
                                        setQrToken(token)
                                        setShowScanner(false)
                                        handleScanQR()
                                      }
                                    } else {
                                      setQrToken(decodedText)
                                      setShowScanner(false)
                                      handleScanQR()
                                    }
                                  }
                                }}
                                onScanError={(error) => setError(error)}
                                onClose={() => setShowScanner(false)}
                              />
                            </div>
                          ) : (
                            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner group mb-4">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Button
                                  onClick={() => setShowScanner(true)}
                                  className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 px-8 py-4 rounded-2xl backdrop-blur-xl transition-all flex items-center gap-3"
                                >
                                  <Scan className="h-5 w-5" />
                                  <span className="font-bold">Scansiona Slot</span>
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Manual Input */}
                          <div className="flex gap-4">
                            <div className="relative flex-1">
                              <div className="absolute inset-y-0 left-4 flex items-center text-white/40">
                                <span>🔑</span>
                              </div>
                              <input
                                type="text"
                                value={qrToken}
                                onChange={(e) => setQrToken(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleScanQR()}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all liquid-glass"
                                placeholder="QR Token dello slot..."
                              />
                            </div>
                            <Button
                              onClick={handleScanQR}
                              disabled={scanning}
                              className="bg-primary text-background-dark px-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all"
                            >
                              {scanning ? <Loader2 className="animate-spin" size={16} /> : 'Elabora'}
                            </Button>
                          </div>

                          {/* Slot Verification */}
                          {slotInfo && slotInfo.item && (
                            <div className="mt-4 p-4 glass rounded-xl">
                              {slotInfo.item.id === selectedOrder.itemId ? (
                                <Alert className="border-green-500 bg-green-500/10">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <AlertDescription className="text-green-400">
                                    ✅ Carta verificata! Slot {slotInfo.slotCode} corrisponde all'ordine. Puoi procedere con la preparazione.
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                <Alert variant="destructive">
                                  <XCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    ❌ Carta non corrispondente! Lo slot scansionato contiene una carta diversa da quella dell'ordine.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-4">
                      {selectedOrder.status === 'PAID' && (
                        <Button
                          onClick={async () => {
                            setFulfilling(true)
                            setError('')
                            try {
                              const res = await fetch(`/api/vault/merchant/orders/${selectedOrder.id}/fulfill`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'FULFILLING' }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Errore')
                              setSuccess('Ordine aggiornato: in preparazione')
                              await fetchOrders()
                              setTimeout(() => {
                                setSelectedOrder({ ...selectedOrder, status: 'FULFILLING' })
                                setSuccess('')
                              }, 2000)
                            } catch (err: any) {
                              setError(err.message || 'Errore')
                            } finally {
                              setFulfilling(false)
                            }
                          }}
                          disabled={fulfilling || (selectedOrder.status === 'PAID' && slotInfo?.item?.id !== selectedOrder.itemId)}
                          className="w-full bg-blue-500 text-white hover:bg-blue-600 h-12 rounded-xl font-bold"
                        >
                          {fulfilling ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Aggiornamento...
                            </>
                          ) : (
                            <>
                              <Package className="h-4 w-4 mr-2" />
                              Prepara Spedizione
                            </>
                          )}
                        </Button>
                      )}

                      {(selectedOrder.status === 'FULFILLING' || selectedOrder.status === 'PAID') && (
                        <Card className="bg-white/5 border-white/10">
                          <CardContent className="p-6 space-y-4">
                            <h4 className="text-white font-bold">Aggiungi Tracking</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-white/60 text-sm font-medium mb-2 block">Corriere (opzionale)</label>
                                <input
                                  type="text"
                                  value={trackingCarrier}
                                  onChange={(e) => setTrackingCarrier(e.target.value)}
                                  placeholder="es. Poste Italiane, DHL, ..."
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                              </div>
                              <div>
                                <label className="text-white/60 text-sm font-medium mb-2 block">Codice Tracking *</label>
                                <input
                                  type="text"
                                  value={trackingCode}
                                  onChange={(e) => setTrackingCode(e.target.value)}
                                  placeholder="es. AB123456789IT"
                                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                              </div>
                              <Button
                                onClick={async () => {
                                  if (!trackingCode.trim()) {
                                    setError('Inserisci il codice di tracking')
                                    return
                                  }
                                  setFulfilling(true)
                                  setError('')
                                  try {
                                    const res = await fetch(`/api/vault/merchant/orders/${selectedOrder.id}/fulfill`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        status: 'SHIPPED',
                                        carrier: trackingCarrier || undefined,
                                        trackingCode: trackingCode,
                                      }),
                                    })
                                    const data = await res.json()
                                    if (!res.ok) throw new Error(data.error || 'Errore')
                                    setSuccess('Tracking aggiunto! Ordine spedito.')
                                    setTrackingCarrier('')
                                    setTrackingCode('')
                                    await fetchOrders()
                                    setTimeout(() => {
                                      setSelectedOrder(null)
                                      setSuccess('')
                                    }, 2000)
                                  } catch (err: any) {
                                    setError(err.message || 'Errore')
                                  } finally {
                                    setFulfilling(false)
                                  }
                                }}
                                disabled={fulfilling || !trackingCode.trim()}
                                className="w-full bg-purple-500 text-white hover:bg-purple-600 h-12 rounded-xl font-bold"
                              >
                                {fulfilling ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Aggiornamento...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marca come Spedito
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Error/Success Messages */}
                      {error && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {success && (
                        <Alert className="border-green-500 bg-green-500/10">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-green-400">{success}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedOrder(null)
                          setSlotInfo(null)
                          setQrToken('')
                          setTrackingCarrier('')
                          setTrackingCode('')
                          setError('')
                          setSuccess('')
                        }}
                        className="w-full h-12 rounded-xl"
                      >
                        Torna alla Lista
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Queue */}
          <aside className="w-96 flex flex-col gap-6">
            <div className="liquid-glass rounded-3xl p-6 flex-1 flex flex-col border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-primary">📦</span>
                  <h2 className="text-xl font-bold tracking-tight">Queue</h2>
                </div>
                <span className="bg-white/10 px-2 py-1 rounded text-[10px] font-black uppercase text-white/60">
                  {queueItems.length} Items
                </span>
              </div>
              <div className="flex flex-col gap-4 overflow-y-auto pr-2">
                {queueItems.length === 0 && (
                  <div className="border-2 border-dashed border-white/10 p-8 rounded-2xl flex flex-col items-center justify-center gap-2 text-white/20 hover:text-white/40 transition-colors cursor-pointer">
                    <span className="text-4xl">📦</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Aggiungi Manuale</span>
                  </div>
                )}
              </div>
              <div className="mt-auto pt-6">
                <Button className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                  <span>Vedi Tutti i Log</span>
                  <span>→</span>
                </Button>
              </div>
            </div>

            {/* Status Card */}
            <div className="liquid-glass rounded-3xl p-6 border border-white/5 bg-accent-orange/5">
              <div className="flex gap-4 items-start">
                <div className="size-10 rounded-full bg-accent-orange/20 flex items-center justify-center text-accent-orange shrink-0">
                  <span>⚡</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Ottimizzazione Vault</h4>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">
                    Suggerimento: 12 slot liberi nel Settore B-4 per il posizionamento rapido.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {/* Footer Operational Status */}
        <footer className="px-10 py-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono tracking-widest uppercase text-white/30 bg-black/20 backdrop-blur-md">
          <div className="flex gap-8">
            <span className="flex items-center gap-2">
              <span className="size-1.5 bg-primary rounded-full"></span> System: Stable
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 bg-primary rounded-full"></span> Latency: 12ms
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 bg-primary rounded-full"></span> Camera: 4K 60FPS
            </span>
          </div>
          <div className="flex gap-4">
            <span>© 2024 SafeTrade Vault OS 26.1</span>
            <span>Terminal ID: STV-X8-BERLIN</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

const fallback = <div className="flex min-h-[40vh] items-center justify-center"><span className="text-muted-foreground">Caricamento...</span></div>
export default function MerchantVaultScanPage() {
  return <Suspense fallback={fallback}><MerchantVaultScanContent /></Suspense>
}
