'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Shop {
  id: string
  name: string
  address: string | null
  city: string | null
  postalCode: string | null
  phone: string | null
  rating: number
  ratingCount: number
  logo: string | null
}

export default function SelectStorePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const proposalId = searchParams.get('proposalId')
  
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  
  // Check authorization if proposalId is present
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!proposalId) {
        // No proposalId, allow access (for other use cases)
        setAuthorized(true)
        return
      }
      
      if (userLoading) return
      
      if (!user) {
        setAuthorized(false)
        return
      }
      
      try {
        const res = await fetch(`/api/proposals/${proposalId}/check-seller`)
        if (res.ok) {
          const data = await res.json()
          setAuthorized(data.authorized)
          if (!data.authorized) {
            toast({
              title: 'Accesso Negato',
              description: 'Solo il venditore può selezionare il negozio per questa proposta.',
              variant: 'destructive',
            })
            router.push('/dashboard/proposals/received')
          }
        } else {
          setAuthorized(false)
        }
      } catch (error) {
        console.error('Error checking authorization:', error)
        setAuthorized(false)
      }
    }
    
    checkAuthorization()
  }, [proposalId, user, userLoading, router, toast])

  useEffect(() => {
    // Only fetch shops if authorized (or no proposalId)
    if (authorized === false || (proposalId && authorized === null)) {
      return
    }
    
    const fetchShops = async () => {
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.set('q', searchQuery)
        
        const res = await fetch(`/api/shops?${params.toString()}`)
        if (res.ok) {
          const data = await res.json()
          setShops(data.shops || [])
        }
      } catch (error) {
        console.error('Error fetching shops:', error)
        toast({
          title: 'Error',
          description: 'Failed to load stores',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchShops()
  }, [searchQuery, toast, authorized, proposalId])

  const handleSelectStore = (shopId: string) => {
    setSelectedStore(shopId)
    if (proposalId) {
      router.push(`/select-appointment?storeId=${shopId}&proposalId=${proposalId}`)
    } else {
      router.push(`/select-appointment?storeId=${shopId}`)
    }
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
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Authorization Check */}
            {proposalId && (authorized === null || userLoading) && (
              <Card className="glass-panel p-6 text-center">
                <div className="animate-pulse">Verifica autorizzazione...</div>
              </Card>
            )}
            
            {proposalId && authorized === false && (
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-red-500 mb-4 inline-block">block</span>
                <h2 className="text-2xl font-bold mb-2">Accesso Negato</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Solo il venditore può selezionare il negozio per questa proposta.
                </p>
              </Card>
            )}
            
            {(!proposalId || authorized === true) && (
              <>
                {/* Header */}
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary">store</span>
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Seleziona un Negozio SafeTrade</h1>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Scegli un negozio partner verificato nella tua zona per completare la transazione in sicurezza
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (proposalId) {
                        router.push(`/select-escrow-method?proposalId=${proposalId}`)
                      } else {
                        router.push('/select-escrow-method')
                      }
                    }}
                    className="mt-2"
                  >
                    <span className="material-symbols-outlined mr-2">inventory_2</span>
                    Oppure usa Verified Escrow
                  </Button>
                </div>

            {/* Search */}
            <div className="relative mb-8">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <Input
                className="w-full h-12 pl-12 rounded-xl"
                placeholder="Search stores by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Stores List */}
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="glass-panel p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : shops.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-primary mb-4 inline-block">
                  inventory_2
                </span>
                <h2 className="text-2xl font-bold mb-2">Nessun Negozio Fisico Disponibile</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  {searchQuery 
                    ? 'Nessun negozio corrisponde alla tua ricerca nella tua zona. Prova con una ricerca diversa o utilizza il nostro servizio Verified Escrow.'
                    : 'Al momento non ci sono negozi fisici disponibili nella tua zona. Utilizza il nostro sistema centralizzato di escrow per rendere la tua vendita sicura.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {searchQuery && (
                    <Button onClick={() => setSearchQuery('')} variant="outline">
                      Cancella Ricerca
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      if (proposalId) {
                        router.push(`/select-escrow-method?proposalId=${proposalId}`)
                      } else {
                        router.push('/select-escrow-method')
                      }
                    }}
                    className="bg-primary hover:bg-primary-dark"
                  >
                    <span className="material-symbols-outlined mr-2">verified</span>
                    Usa Verified Escrow
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {shops.map((shop) => (
                  <Card
                    key={shop.id}
                    className={`glass-panel p-6 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 ${
                      selectedStore === shop.id ? 'border-2 border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectStore(shop.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Store Logo */}
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {shop.logo ? (
                            <img src={shop.logo} alt={shop.name} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-2xl text-primary">store</span>
                          )}
                        </div>
                        
                        {/* Store Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{shop.name}</h3>
                            <span className="material-symbols-outlined text-primary text-sm">verified</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {[shop.address, shop.city, shop.postalCode].filter(Boolean).join(', ')}
                          </p>
                          {shop.phone && (
                            <p className="text-gray-500 text-sm mt-1">
                              <span className="material-symbols-outlined text-sm align-middle mr-1">phone</span>
                              {shop.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="material-symbols-outlined text-yellow-500 text-lg">star</span>
                          <span className="font-bold">{shop.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{shop.ratingCount} reviews</p>
                      </div>
                    </div>
                    
                    {/* SafeTrade Badge */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        <span>SafeTrade Verified Partner</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Info Box */}
            <Card className="glass-panel p-6 mt-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                </div>
                <div>
                  <h4 className="font-bold mb-2">How SafeTrade Works</h4>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Select a verified partner store near you</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Choose a convenient date and time for the exchange</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span>Meet at the store and show your QR code</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">4.</span>
                      <span>The store verifies both parties and the items</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">5.</span>
                      <span>Complete the exchange safely!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </Card>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
