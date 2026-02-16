'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUser } from '@/hooks/use-user'
import { 
  QrCode, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  Box,
  Grid3x3
} from 'lucide-react'

interface VaultStats {
  totalItems: number
  itemsInCase: number
  itemsListedOnline: number
  itemsReserved: number
  itemsSold: number
  totalRevenue: number
  pendingPayout: number
}

export default function MerchantVaultPage() {
  const router = useRouter()
  const { user } = useUser()
  const [stats, setStats] = useState<VaultStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) return

    ;(async () => {
      try {
        const res = await fetch('/api/auth/me')
        let isAdminFlag = false

        if (res.ok) {
          const data = await res.json()
          const role = data.user?.role
          isAdminFlag = role === 'ADMIN' || role === 'HUB_STAFF'
        }

        setIsAdmin(isAdminFlag)
        await fetchVaultData(isAdminFlag)
      } catch (err) {
        console.error('Error checking admin role for merchant vault:', err)
        setIsAdmin(false)
        await fetchVaultData(false)
      }
    })()
  }, [user])

  const fetchVaultData = async (isAdminFlag: boolean) => {
    setLoading(true)
    try {
      if (!user) {
        setAuthorized(false)
        setStats({
          totalItems: 0,
          itemsInCase: 0,
          itemsListedOnline: 0,
          itemsReserved: 0,
          itemsSold: 0,
          totalRevenue: 0,
          pendingPayout: 0,
        })
        setLoading(false)
        return
      }

      let isAuthorized = false
      
      // Se l'utente è ADMIN, permette sempre l'accesso
      if (isAdminFlag) {
        isAuthorized = true
      } else {
        // Check authorization per merchant
        const shopRes = await fetch('/api/merchant/shop')
        if (shopRes.ok) {
          const shopData = await shopRes.json()
          // L'API restituisce direttamente lo shop, non { data: shop }
          isAuthorized = shopData?.vaultCaseAuthorized === true
          
          // Se non autorizzato, verifica se c'è una richiesta PAID o COMPLETED
          if (!isAuthorized) {
            try {
              const requestsRes = await fetch('/api/vault/requests')
              if (requestsRes.ok) {
                const requestsData = await requestsRes.json()
                const requests = requestsData.data || []
                // Se c'è una richiesta PAID o COMPLETED, autorizza comunque
                const hasPaidOrCompleted = requests.some((r: any) => 
                  r.status === 'PAID' || r.status === 'COMPLETED'
                )
                if (hasPaidOrCompleted) {
                  isAuthorized = true
                }
              }
            } catch (err) {
              console.error('Error checking vault requests:', err)
            }
          }
          
          // Verifica anche se esiste una teca autorizzata per questo shop
          if (!isAuthorized && shopData?.id) {
            try {
              const casesRes = await fetch(`/api/vault/cases?shopId=${shopData.id}`)
              if (casesRes.ok) {
                const casesData = await casesRes.json()
                const cases = casesData.data || []
                const hasAuthorizedCase = cases.some((c: any) => 
                  c.authorizedShopId === shopData.id && c.status === 'IN_SHOP_ACTIVE'
                )
                if (hasAuthorizedCase) {
                  isAuthorized = true
                }
              }
            } catch (err) {
              console.error('Error checking vault cases:', err)
            }
          }
        }
      }
      
      setAuthorized(isAuthorized)

      // Fetch inventory for stats (solo se autorizzato o admin)
      if (isAuthorized || isAdminFlag) {
        const invRes = await fetch('/api/vault/merchant/inventory')
        if (invRes.ok) {
          const invData = await invRes.json()
          const items = invData.data || []

          const stats: VaultStats = {
            totalItems: items.length,
            itemsInCase: items.filter((i: any) => i.status === 'IN_CASE').length,
            itemsListedOnline: items.filter((i: any) => i.status === 'LISTED_ONLINE').length,
            itemsReserved: items.filter((i: any) => i.status === 'RESERVED').length,
            itemsSold: items.filter((i: any) => i.status === 'SOLD').length,
            totalRevenue: items
              .filter((i: any) => i.sale || i.order)
              .reduce((sum: number, i: any) => {
                if (i.sale) return sum + i.sale.soldPrice
                if (i.order) {
                  const totals = i.order.totals as any
                  return sum + (totals?.total || 0)
                }
                return sum
              }, 0),
            pendingPayout: items
              .filter((i: any) => i.splits && i.splits.length > 0)
              .reduce((sum: number, i: any) => {
                const pendingSplits = (i.splits || []).filter(
                  (s: any) => s.status === 'PENDING' || s.status === 'ELIGIBLE'
                )
                return sum + pendingSplits.reduce((s: number, sp: any) => s + (sp.merchantAmount || 0), 0)
              }, 0),
          }

          setStats(stats)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dati')
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-orange-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Link href="/merchant" className="text-gray-500 hover:text-primary">
                  <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-3xl font-bold">SafeTrade Vault</h1>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Gestisci le carte in conto vendita multicanale
              </p>
            </div>

            {!authorized && !isAdmin && (
              <Alert className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Il tuo negozio non è autorizzato ad utilizzare le teche Vault. 
                  Contatta l'amministratore per abilitare questa funzionalità.
                </AlertDescription>
              </Alert>
            )}

            {isAdmin && (
              <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <strong>Modalità Admin:</strong> Stai visualizzando la dashboard Vault come amministratore. 
                  Puoi vedere tutte le funzionalità ma alcune azioni potrebbero richiedere un account merchant.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Quick Actions */}
            {(authorized || isAdmin) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Scansione QR</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href="/merchant/vault/scan">
                      <Button className="w-full" variant="glass">
                        <QrCode className="h-4 w-4 mr-2" />
                        Scansiona Slot
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Inventario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href="/merchant/vault/scan">
                      <Button className="w-full" variant="outline">
                        <Package className="h-4 w-4 mr-2" />
                        Vedi Inventario
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Ordini Online</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href="/merchant/vault/scan?tab=fulfillment">
                      <Button className="w-full" variant="outline">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Ordini da Evadere
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Teca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href="/merchant/vault/requests">
                      <Button className="w-full" variant="outline">
                        <Grid3x3 className="h-4 w-4 mr-2" />
                        Gestisci Teca
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Totale Carte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalItems}</div>
                    <p className="text-sm text-gray-500 mt-1">Carte assegnate</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">In Teca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{stats.itemsInCase}</div>
                    <p className="text-sm text-gray-500 mt-1">Fisicamente in teca</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Listate Online</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">{stats.itemsListedOnline}</div>
                    <p className="text-sm text-gray-500 mt-1">Disponibili online</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Vendute</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">{stats.itemsSold}</div>
                    <p className="text-sm text-gray-500 mt-1">Totale vendite</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Ricavi Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      €{stats.totalRevenue.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Da tutte le vendite</p>
                  </CardContent>
                </Card>

                <Card className="glass-panel md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600">Payout in Attesa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-600">
                      €{stats.pendingPayout.toFixed(2)}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Commissioni da ricevere</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Info */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Come Funziona</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Scansiona Slot</h4>
                      <p className="text-sm text-gray-600">
                        Usa la funzione di scansione QR per selezionare uno slot della teca
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Seleziona Carta</h4>
                      <p className="text-sm text-gray-600">
                        Scegli una carta disponibile dal menu a tendina (carte assegnate al negozio)
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Assegna</h4>
                      <p className="text-sm text-gray-600">
                        Conferma l'assegnazione. La carta sarà disponibile per vendita fisica e online
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

