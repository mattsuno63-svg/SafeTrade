'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Loader2, QrCode, CheckCircle2, XCircle, Package, Scan } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { QRScanner } from '@/components/qr/QRScanner'

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
    status: string
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

export default function MerchantVaultScanPage() {
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
  const [activeTab, setActiveTab] = useState<'posiziona' | 'sposta' | 'vendi' | 'fulfillment'>('posiziona')

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
    }
  }, [user, userLoading, router])

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
