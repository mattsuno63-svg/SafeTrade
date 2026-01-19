'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import { useUser } from '@/hooks/use-user'

interface Slot {
  id: string
  slotCode: string
  status: 'FREE' | 'OCCUPIED'
  item: {
    id: string
    name: string
    game: string
    set: string | null
    priceFinal: number | null
    status: string
    owner: {
      id: string
      name: string | null
    }
    photos: string[]
  } | null
}

interface VaultCase {
  id: string
  label: string | null
  status: string
  shop: {
    id: string
    name: string
  } | null
  slots: Slot[]
}

export default function VaultCaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [case_, setCase] = useState<VaultCase | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'FREE' | 'OCCUPIED'>('all')
  const [filterGame, setFilterGame] = useState<string | null>(null)

  const fetchCase = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vault/cases/${params.id}`)
      if (res.ok) {
        const data = await res.json()
        setCase(data.data)
      }
    } catch (error) {
      console.error('Error fetching case:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (params.id) {
      fetchCase()
    }
  }, [params.id, user, userLoading, router, fetchCase])

  // Generate all 30 slots (S01-S30) - must be before early returns
  const allSlots: (Slot | null)[] = useMemo(() => {
    if (!case_) return Array(30).fill(null)
    return Array.from({ length: 30 }, (_, i) => {
      const slotCode = `S${String(i + 1).padStart(2, '0')}`
      return case_.slots.find((s) => s.slotCode === slotCode) || null
    })
  }, [case_])

  // Calculate statistics
  const stats = useMemo(() => {
    const occupied = allSlots.filter((s) => s && s.status === 'OCCUPIED').length
    const free = 30 - occupied
    const totalValue = allSlots.reduce((sum, slot) => {
      return sum + (slot?.item?.priceFinal || 0)
    }, 0)
    const games = allSlots.reduce((acc, slot) => {
      if (slot?.item?.game) {
        acc[slot.item.game] = (acc[slot.item.game] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)
    return { occupied, free, totalValue, games }
  }, [allSlots])

  // Filter slots
  const filteredSlots = useMemo(() => {
    return allSlots.filter((slot) => {
      if (filterStatus === 'FREE' && slot) return false
      if (filterStatus === 'OCCUPIED' && !slot) return false
      if (filterGame && (!slot?.item || slot.item.game !== filterGame)) return false
      return true
    })
  }, [allSlots, filterStatus, filterGame])

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!case_) {
    return (
      <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Teca non trovata</h2>
          <Button onClick={() => router.push('/merchant/vault')}>Torna alla Dashboard</Button>
        </div>
      </div>
    )
  }

  const handleSlotClick = (slot: Slot | null, slotCode: string) => {
    if (slot) {
      setSelectedSlot(slot)
    } else {
      // Slot vuoto - potrebbe essere cliccabile per assegnare
      setSelectedSlot(null)
    }
  }

  return (
    <div className="min-h-screen bg-background-dark text-white overflow-hidden selection:bg-primary/30">
      <style jsx>{`
        body {
          font-family: 'Space Grotesk', sans-serif;
          background: radial-gradient(circle at 50% 50%, #243135 0%, #1a2023 100%);
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-tile {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .glass-tile:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: #1b8d98;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(27, 141, 152, 0.3);
        }
        .glass-tile.active {
          background: rgba(27, 141, 152, 0.1);
          border-color: #1b8d98;
          box-shadow: inset 0 0 15px rgba(27, 141, 152, 0.2);
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white">🛡️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                SafeTrade <span className="text-primary">Vault</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-medium leading-none">
                High-Security Terminal
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-6">
            <button
              onClick={() => router.push('/merchant/vault')}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer text-sm font-medium"
            >
              <span>📊</span>
              Dashboard
            </button>
            <button className="flex items-center gap-2 text-primary font-bold text-sm">
              <span>📦</span>
              Vault Cases
            </button>
            <button className="flex items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer text-sm font-medium">
              <span>📜</span>
              Ledger
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-white">Merchant Pro</span>
            <span className="text-[10px] text-primary">Status: Operational • v26.1</span>
          </div>
          <div className="size-10 rounded-full border-2 border-primary/30 p-0.5">
            <div className="w-full h-full rounded-full bg-primary/20 flex items-center justify-center">
              <span>👤</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 h-screen flex">
        {/* Main Content Area */}
        <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
          {/* Breadcrumbs & Heading */}
          <div className="mb-8 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 text-white/40 text-xs font-medium uppercase tracking-widest mb-2">
                <span>Merchant</span>
                <span>→</span>
                <span>Vault</span>
                <span>→</span>
                <span className="text-white/80">{case_.label || `Teca ${case_.id.slice(-4)}`}</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter">
                {case_.label || `TECA ${case_.id.slice(-4).toUpperCase()}`}{' '}
                <span className="text-primary ml-4 opacity-50 text-2xl font-light">30 SLOTS • 6X5 GRID</span>
              </h2>
            </div>
            <div className="flex gap-4">
              <Button 
                onClick={() => router.push(`/merchant/vault/cases/${params.id}/qr-print`)}
                className="px-6 h-12 glass-tile rounded-xl flex items-center gap-2 text-sm font-bold border-white/10 hover:bg-white/10 transition-colors"
              >
                <span>🖨️</span>
                Genera QR
              </Button>
              <Button 
                onClick={() => router.push('/merchant/vault/scan')}
                className="px-6 h-12 glass-tile rounded-xl flex items-center gap-2 text-sm font-bold border-white/10 hover:bg-white/10 transition-colors"
              >
                <span>📷</span>
                Scan Hub
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-tile border-white/10">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Slot Occupati</p>
                <p className="text-3xl font-black text-primary">{stats.occupied}/30</p>
                <p className="text-xs text-white/60 mt-1">{stats.free} liberi</p>
              </CardContent>
            </Card>
            <Card className="glass-tile border-white/10">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Valore Totale</p>
                <p className="text-3xl font-black text-accent-orange">
                  €{stats.totalValue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-white/60 mt-1">Carte in teca</p>
              </CardContent>
            </Card>
            <Card className="glass-tile border-white/10">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Carte per Game</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.entries(stats.games).map(([game, count]) => (
                    <Badge key={game} className="bg-primary/20 text-primary border-primary/30 text-xs">
                      {game}: {count}
                    </Badge>
                  ))}
                  {Object.keys(stats.games).length === 0 && (
                    <span className="text-xs text-white/40">Nessuna carta</span>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="glass-tile border-white/10">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Occupazione</p>
                <div className="mt-2">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(stats.occupied / 30) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1">{Math.round((stats.occupied / 30) * 100)}% utilizzata</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <Button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 glass-tile rounded-xl text-sm font-bold transition-all ${
                filterStatus === 'all' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
              }`}
            >
              Tutti
            </Button>
            <Button
              onClick={() => setFilterStatus('OCCUPIED')}
              className={`px-4 py-2 glass-tile rounded-xl text-sm font-bold transition-all ${
                filterStatus === 'OCCUPIED' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
              }`}
            >
              Occupati ({stats.occupied})
            </Button>
            <Button
              onClick={() => setFilterStatus('FREE')}
              className={`px-4 py-2 glass-tile rounded-xl text-sm font-bold transition-all ${
                filterStatus === 'FREE' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
              }`}
            >
              Liberi ({stats.free})
            </Button>
            <Button
              onClick={() => setFilterGame(filterGame === 'Pokemon' ? null : 'Pokemon')}
              className={`px-4 py-2 glass-tile rounded-xl text-sm font-bold transition-all ${
                filterGame === 'Pokemon' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
              }`}
            >
              Pokémon {filterGame === 'Pokemon' && '✕'}
            </Button>
            <Button
              onClick={() => setFilterGame(filterGame === 'Magic' ? null : 'Magic')}
              className={`px-4 py-2 glass-tile rounded-xl text-sm font-bold transition-all ${
                filterGame === 'Magic' ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-white/10'
              }`}
            >
              Magic {filterGame === 'Magic' && '✕'}
            </Button>
          </div>

          {/* 6x5 Matrix Grid */}
          <div className="grid grid-cols-6 gap-4 pb-20">
            {allSlots.map((slot, idx) => {
              const slotCode = `S${String(idx + 1).padStart(2, '0')}`
              const isActive = selectedSlot?.id === slot?.id
              
              // Apply filters - hide slot if filtered out
              if (filterStatus === 'FREE' && slot) return null
              if (filterStatus === 'OCCUPIED' && !slot) return null
              if (filterGame && (!slot?.item || slot.item.game !== filterGame)) return null
              return (
                <div
                  key={slotCode}
                  onClick={() => handleSlotClick(slot, slotCode)}
                  className={`aspect-[3/4] glass-tile rounded-xl p-3 flex flex-col relative group overflow-hidden cursor-pointer ${
                    isActive ? 'active' : ''
                  } ${slot ? '' : 'opacity-40'}`}
                >
                  {slot?.item && (
                    <>
                      {slot.item.photos && slot.item.photos.length > 0 && (
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"
                          style={{ backgroundImage: `url(${slot.item.photos[0]})` }}
                        ></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    </>
                  )}
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <span
                      className={`text-[10px] font-bold ${
                        slot ? 'text-primary bg-primary/20' : 'text-white/40 bg-white/5'
                      } self-start px-2 py-1 rounded`}
                    >
                      {slotCode}
                    </span>
                    {slot?.item ? (
                      <div>
                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider leading-none mb-1">
                          {slot.item.status}
                        </p>
                        <p className="text-xs font-bold line-clamp-1">{slot.item.name}</p>
                        <p className="text-[10px] text-primary font-medium">
                          Prop: {slot.item.owner.name || 'N/A'}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className="text-lg font-light text-white/20 tracking-tighter">{slotCode}</span>
                        <span className="text-[10px] uppercase tracking-widest text-white/10 mt-2 font-bold">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side Panel */}
        {selectedSlot?.item && (
          <aside className="w-[450px] glass-panel border-l border-white/5 flex flex-col relative">
            <div className="absolute top-6 right-6">
              <button
                onClick={() => setSelectedSlot(null)}
                className="size-10 rounded-full glass-tile flex items-center justify-center border-white/10 hover:bg-white/10 transition-colors"
              >
                <span>✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide px-8 pt-10 pb-8 flex flex-col gap-8">
              {/* Item Info (70%) */}
              <section className="flex flex-col gap-6">
                <div className="w-full aspect-[3/4] rounded-2xl glass-tile p-4 relative overflow-hidden group">
                  {selectedSlot.item.photos && selectedSlot.item.photos.length > 0 && (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${selectedSlot.item.photos[0]})` }}
                    ></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">
                        ITEM ID: #{selectedSlot.item.id.slice(-6).toUpperCase()}
                      </span>
                      <h3 className="text-2xl font-bold mt-1">{selectedSlot.item.name}</h3>
                      <p className="text-sm text-white/60">{selectedSlot.item.set || selectedSlot.item.game}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40 font-medium">MARKET VAL</p>
                      <p className="text-xl font-bold text-primary">
                        € {selectedSlot.item.priceFinal?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || 'N/D'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-tile rounded-xl p-4">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary"></span>
                      <span className="text-sm font-bold">Verified Vaulted</span>
                    </div>
                  </div>
                  <div className="glass-tile rounded-xl p-4">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Grade</p>
                    <div className="flex items-center gap-2">
                      <span className="text-primary text-[18px]">⭐</span>
                      <span className="text-sm font-bold">PSA 10 Gem Mint</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Split Data (20%) */}
              <section className="flex flex-col gap-4">
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Ownership Split Data</h4>
                <div className="glass-tile rounded-xl p-5 space-y-4">
                  <div className="flex justify-between items-end text-sm">
                    <span className="text-white/60 font-medium">Merchant Fee</span>
                    <span className="font-bold">20%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary" style={{ width: '70%' }}></div>
                    <div className="h-full bg-accent-orange/40" style={{ width: '20%' }}></div>
                    <div className="h-full bg-white/20" style={{ width: '10%' }}></div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-primary"></span>
                      <span className="text-white/40">Holder: 70%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-accent-orange/40"></span>
                      <span className="text-white/40">Vault: 20%</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <span className="size-2 rounded-full bg-white/20"></span>
                      <span className="text-white/40">Pool: 10%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Row (10%) */}
              <section className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
                <Button className="w-full h-14 bg-primary text-white rounded-xl flex items-center justify-center gap-3 font-bold text-lg hover:brightness-110 transition-all shadow-xl shadow-primary/20">
                  <span>🛒</span>
                  Vendi Fisico
                </Button>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-12 glass-tile rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-accent-orange border-accent-orange/20 hover:bg-accent-orange/10">
                    <span>🚪</span>
                    Rimuovi
                  </Button>
                  <Button className="h-12 glass-tile rounded-xl flex items-center justify-center gap-2 font-bold text-xs hover:bg-white/5">
                    <span>📜</span>
                    History
                  </Button>
                </div>
              </section>
            </div>
          </aside>
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 h-8 glass-panel border-t border-white/5 flex items-center px-8 justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary"></span>
            <span className="text-[10px] font-medium text-white/40">VAULT NODE #001: ONLINE</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10"></div>
          <span className="text-[10px] font-medium text-white/40 italic">Last physical audit: 12h ago</span>
        </div>
        <div className="text-[10px] font-bold tracking-widest text-white/40">
          SYSTEM LOG: SLAB_VERIFICATION_COMPLETE [OK]
        </div>
      </footer>
    </div>
  )
}

