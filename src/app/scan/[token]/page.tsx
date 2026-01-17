'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface SlotInfo {
  id: string
  slotCode: string
  case: {
    id: string
    label: string | null
  }
  item: {
    id: string
    name: string
    game: string
    set: string | null
    priceFinal: number | null
    photos: string[]
    status: string
  } | null
  shop: {
    id: string
    name: string
    address: string | null
    city: string | null
    postalCode: string | null
    slug: string | null
  } | null
}

export default function PublicScanPage() {
  const params = useParams()
  const router = useRouter()
  const [slotInfo, setSlotInfo] = useState<SlotInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const fetchSlotInfo = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      // In produzione, questo endpoint dovrebbe essere pubblico e validare il token
      const res = await fetch(`/api/vault/public/scan/${params.token}`)
      
      if (!res.ok) {
        throw new Error('Slot non trovato o token non valido')
      }

      const data = await res.json()
      setSlotInfo(data.data)
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dello slot')
    } finally {
      setLoading(false)
    }
  }, [params.token])

  useEffect(() => {
    if (params.token) {
      fetchSlotInfo()
    }
  }, [params.token, fetchSlotInfo])

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !slotInfo) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Slot non trovato</h2>
          <p className="text-white/60 mb-6">{error || 'Lo slot richiesto non esiste'}</p>
          <Button onClick={() => router.push('/')}>Torna alla Home</Button>
        </div>
      </div>
    )
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
        .orange-glow {
          box-shadow: 0 0 20px rgba(255, 107, 0, 0.15);
        }
      `}</style>

      {/* Dynamic Background Layer */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40"></div>
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-accent-orange/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="layout-container flex h-full grow flex-col relative z-10">
        {/* Top Navigation */}
        <header className="flex items-center justify-between px-6 py-4 lg:px-20 border-b border-white/5 bg-background-dark/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="size-8 text-primary shield-glow">
              <span className="text-4xl">🛡️</span>
            </div>
            <h2 className="text-white text-xl font-extrabold leading-tight tracking-tight">
              SafeTrade <span className="text-primary">Vault</span>
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8">
              <button className="text-white/60 hover:text-white text-sm font-medium transition-colors">Esplora</button>
              <button className="text-white/60 hover:text-white text-sm font-medium transition-colors">Collezioni</button>
              <button className="text-white/60 hover:text-white text-sm font-medium transition-colors">Certificati</button>
            </nav>
            <div className="h-6 w-[1px] bg-white/10 hidden md:block"></div>
            <Button
              onClick={() => router.push('/login')}
              className="flex min-w-[100px] cursor-pointer items-center justify-center rounded-full h-10 px-6 bg-primary text-white text-sm font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
            >
              <span>Accedi</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:py-20">
          {/* Centralized Content Area */}
          <div className="max-w-[1000px] w-full flex flex-col items-center gap-12">
            {/* Headline Section */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-orange/10 border border-accent-orange/20 text-accent-orange text-[10px] uppercase tracking-[0.2em] font-bold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-orange opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-orange"></span>
                </span>
                Scansione Completata
              </div>
              <h1 className="text-white tracking-tight text-4xl md:text-6xl font-extrabold leading-[1.1] max-w-3xl">
                Hai scansionato lo <span className="text-primary italic">Slot {slotInfo.slotCode}</span> della{' '}
                {slotInfo.case.label || 'Teca'}
              </h1>
            </div>

            {/* Liquid Glass Card */}
            {slotInfo.item ? (
              <div className="liquid-glass w-full max-w-[850px] rounded-3xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row gap-8 items-center border border-white/10 relative">
                {/* Subtle refractive highlight */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                {/* Card Preview Image */}
                <div className="w-full md:w-2/5 aspect-[3/4] rounded-2xl overflow-hidden relative group orange-glow">
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark/80 to-transparent z-10"></div>
                  {slotInfo.item.photos && slotInfo.item.photos.length > 0 ? (
                    <Image
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      src={slotInfo.item.photos[0]}
                      alt={slotInfo.item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <span className="text-6xl">🃏</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 z-20">
                    <span className="bg-primary px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                      Identificato
                    </span>
                  </div>
                </div>

                {/* Card Info & Identity Check */}
                <div className="w-full md:w-3/5 flex flex-col gap-8">
                  <div>
                    <p className="text-accent-orange font-bold text-sm tracking-widest uppercase mb-1">Asset Protetto</p>
                    <h2 className="text-white text-3xl font-bold mb-2">{slotInfo.item.name}</h2>
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <p className="text-white/40 text-[10px] uppercase font-bold">Grado</p>
                        <p className="text-white font-bold">PSA 10</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                        <p className="text-white/40 text-[10px] uppercase font-bold">Certificato</p>
                        <p className="text-white font-bold">#{slotInfo.item.id.slice(-8).toUpperCase()}</p>
                      </div>
                      {slotInfo.item.priceFinal && (
                        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
                          <p className="text-white/40 text-[10px] uppercase font-bold">Valore</p>
                          <p className="text-white font-bold">
                            €{slotInfo.item.priceFinal.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="h-[1px] w-full bg-white/5"></div>

                  {/* Shop Info */}
                  {slotInfo.shop && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <p className="text-white/40 text-[10px] uppercase font-bold mb-1">Disponibile presso</p>
                      <p className="text-white font-bold text-lg">{slotInfo.shop.name}</p>
                      {slotInfo.shop.address && (
                        <p className="text-white/60 text-sm mt-1">
                          {slotInfo.shop.address}
                          {slotInfo.shop.city && `, ${slotInfo.shop.city}`}
                          {slotInfo.shop.postalCode && ` ${slotInfo.shop.postalCode}`}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTAs */}
                  <div className="flex flex-col gap-4">
                    {slotInfo.item && slotInfo.item.status === 'LISTED_ONLINE' ? (
                      <Button
                        onClick={() => slotInfo.item && router.push(`/vault/item/${slotInfo.item.id}`)}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl h-16 bg-accent-orange hover:bg-accent-orange/90 text-white text-lg font-bold transition-all shadow-xl shadow-accent-orange/20"
                      >
                        <span>🛒</span>
                        <span>Acquista Online</span>
                      </Button>
                    ) : (
                      <Button
                        onClick={() => router.push('/login')}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl h-16 bg-primary hover:bg-primary/90 text-white text-lg font-bold transition-all shadow-xl shadow-primary/20"
                      >
                        <span>🔓</span>
                        <span>Accedi per gestire questo slot</span>
                      </Button>
                    )}
                    {slotInfo.shop && slotInfo.shop.slug && (
                      <Button
                        onClick={() => slotInfo.shop && slotInfo.shop.slug && router.push(`/shops/${slotInfo.shop.slug}`)}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl h-12 bg-white/5 hover:bg-white/10 text-white border border-white/10 text-base font-semibold transition-all"
                      >
                        <span>🏪</span>
                        <span>Visita Negozio</span>
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push('/')}
                      className="w-full flex items-center justify-center h-12 text-white/40 hover:text-white text-base font-semibold transition-colors"
                    >
                      <span>Continua come ospite</span>
                      <span className="ml-2 text-sm">→</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="liquid-glass w-full max-w-[850px] rounded-3xl overflow-hidden p-6 md:p-8 flex flex-col items-center gap-6 border border-white/10">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Slot Vuoto</h2>
                  <p className="text-white/60">Lo slot {slotInfo.slotCode} è attualmente vuoto</p>
                </div>
                <Button
                  onClick={() => router.push('/')}
                  className="bg-primary text-white px-8 py-3 rounded-xl"
                >
                  Torna alla Home
                </Button>
              </div>
            )}

            {/* Feature Section */}
            <div className="w-full py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="liquid-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Custodia Fisica</h4>
                    <p className="text-white/50 text-sm mt-1">
                      Asset protetti in caveau sotterranei a temperatura controllata.
                    </p>
                  </div>
                </div>
                <div className="liquid-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <span className="text-2xl">🔗</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Blockchain Tracking</h4>
                    <p className="text-white/50 text-sm mt-1">
                      Tracciamento immutabile on-chain per ogni cambio di possesso.
                    </p>
                  </div>
                </div>
                <div className="liquid-glass p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
                  <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Assicurazione</h4>
                    <p className="text-white/50 text-sm mt-1">
                      Copertura Lloyd's per il 100% del valore di mercato stimato.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-10 border-t border-white/5 px-6 lg:px-20 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-white/30 text-xs">© 2024 SafeTrade Vault. Tutti i diritti riservati.</p>
            <div className="flex gap-8">
              <a className="text-white/30 hover:text-white text-xs transition-colors" href="#">
                Privacy Policy
              </a>
              <a className="text-white/30 hover:text-white text-xs transition-colors" href="#">
                Termini di Servizio
              </a>
              <a className="text-white/30 hover:text-white text-xs transition-colors" href="#">
                Contatti
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Floating 3D Shield Background Element */}
      <div className="fixed top-1/2 left-10 -translate-y-1/2 opacity-10 hidden xl:block pointer-events-none">
        <span className="text-[300px] text-primary select-none">🛡️</span>
      </div>
    </div>
  )
}

