'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Shop {
  id: string
  name: string
  slug: string
  description: string | null
  address: string
  city: string
  phone: string | null
  email: string | null
  logo: string | null
  isApproved: boolean
  vaultEnabled: boolean
  vaultCaseAuthorized: boolean
  createdAt: string
  merchant: {
    id: string
    email: string
    name: string | null
  }
  _count: {
    products: number
    transactions: number
  }
}

interface Pagination {
  total: number
  pages: number
  page: number
  limit: number
}

export default function AdminShopsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()
  
  const [shops, setShops] = useState<Shop[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  
  // Edit shop dialog
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [editApproved, setEditApproved] = useState(false)
  const [processing, setProcessing] = useState(false)
  
  // Delete dialog
  const [deletingShop, setDeletingShop] = useState<Shop | null>(null)
  
  // View shop details
  const [viewingShop, setViewingShop] = useState<Shop | null>(null)
  
  // Vault case authorization
  const [authorizingShop, setAuthorizingShop] = useState<Shop | null>(null)
  const [authorizeVaultCase, setAuthorizeVaultCase] = useState(false)

  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }
    
    if (currentUser) {
      fetchShops()
    }
  }, [currentUser, userLoading, search, statusFilter, page])

  const fetchShops = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)

      const res = await fetch(`/api/admin/shops?${params}`)
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setShops(data.shops)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateShop = async () => {
    if (!editingShop) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/shops/${editingShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isApproved: editApproved,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast({
        title: 'Negozio aggiornato',
        description: `${editingShop.name} è stato aggiornato`,
      })

      setEditingShop(null)
      fetchShops()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingShop) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/shops/${deletingShop.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast({
        title: 'Negozio eliminato',
        description: `${deletingShop.name} è stato rimosso`,
      })

      setDeletingShop(null)
      fetchShops()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleQuickApprove = async (shop: Shop) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved: true }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast({
        title: 'Negozio approvato',
        description: `${shop.name} è ora attivo`,
      })

      fetchShops()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleAuthorizeVaultCase = async () => {
    if (!authorizingShop) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/shops/${authorizingShop.id}/authorize-vault-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorize: authorizeVaultCase,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast({
        title: authorizeVaultCase ? 'Teca autorizzata' : 'Autorizzazione revocata',
        description: `${authorizingShop.name} ${authorizeVaultCase ? 'può ora utilizzare la teca Vault' : 'non può più utilizzare la teca Vault'}`,
      })

      setAuthorizingShop(null)
      fetchShops()
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  if (userLoading || (loading && shops.length === 0)) {
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
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href="/admin" className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <h1 className="text-3xl font-bold">Gestione Negozi</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {pagination?.total || 0} negozi registrati
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Cerca per nome, città o email merchant..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti</SelectItem>
                  <SelectItem value="APPROVED">Approvati</SelectItem>
                  <SelectItem value="PENDING">In attesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shops Grid */}
            {shops.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">store</span>
                <h3 className="text-xl font-bold mb-2">Nessun negozio</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Non ci sono negozi da mostrare
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shops.map((shop) => (
                  <Card key={shop.id} className="glass-panel p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-xl flex-shrink-0">
                        {shop.logo ? (
                          <img src={shop.logo} alt="" className="w-14 h-14 rounded-xl object-cover" />
                        ) : (
                          shop.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">{shop.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{shop.merchant.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className={shop.isApproved ? 'bg-green-500' : 'bg-yellow-500'}>
                        {shop.isApproved ? 'Approvato' : 'In attesa'}
                      </Badge>
                      {shop.vaultEnabled && (
                        <Badge className={shop.vaultCaseAuthorized ? 'bg-blue-500' : 'bg-gray-500'}>
                          {shop.vaultCaseAuthorized ? 'Teca Autorizzata' : 'Vault (no teca)'}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Città:</span>
                        <span className="ml-1 font-medium">{shop.city || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Prodotti:</span>
                        <span className="ml-1 font-medium">{shop._count.products}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Transazioni:</span>
                        <span className="ml-1 font-medium">{shop._count.transactions}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {!shop.isApproved && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          onClick={() => handleQuickApprove(shop)}
                          disabled={processing}
                        >
                          Approva
                        </Button>
                      )}
                      {shop.vaultEnabled && (
                        <Button
                          size="sm"
                          variant={shop.vaultCaseAuthorized ? "outline" : "default"}
                          className={shop.vaultCaseAuthorized ? "border-blue-500 text-blue-500" : "bg-blue-500 hover:bg-blue-600"}
                          onClick={() => {
                            setAuthorizingShop(shop)
                            setAuthorizeVaultCase(!shop.vaultCaseAuthorized)
                          }}
                          disabled={processing}
                        >
                          {shop.vaultCaseAuthorized ? 'Revoca Teca' : 'Autorizza Teca'}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingShop(shop)
                          setEditApproved(shop.isApproved)
                        }}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </Button>
                      <Link href={`/shops/${shop.slug}`} target="_blank">
                        <Button variant="outline" size="sm">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => setDeletingShop(shop)}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Pagina {pagination.page} di {pagination.pages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Successiva
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Edit Shop Dialog */}
      <Dialog open={!!editingShop} onOpenChange={() => setEditingShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Negozio</DialogTitle>
            <DialogDescription>
              {editingShop?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Approvato</label>
              <Switch
                checked={editApproved}
                onCheckedChange={setEditApproved}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingShop(null)}>
              Annulla
            </Button>
            <Button onClick={handleUpdateShop} disabled={processing}>
              {processing ? 'Salvando...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Shop Dialog */}
      <Dialog open={!!deletingShop} onOpenChange={() => setDeletingShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Elimina Negozio</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare {deletingShop?.name}? 
              Questa azione è irreversibile. Il merchant tornerà ad essere un utente normale.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingShop(null)}>
              Annulla
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              {processing ? 'Eliminando...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Authorize Vault Case Dialog */}
      <Dialog open={!!authorizingShop} onOpenChange={() => setAuthorizingShop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {authorizeVaultCase ? 'Autorizza Teca Vault' : 'Revoca Autorizzazione Teca'}
            </DialogTitle>
            <DialogDescription>
              {authorizeVaultCase ? (
                <>
                  Autorizzando la teca per <strong>{authorizingShop?.name}</strong>, il negozio potrà:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Scansionare QR code degli slot</li>
                    <li>Assegnare carte agli slot della teca</li>
                    <li>Vendere carte fisicamente dalla teca</li>
                    <li>Listare carte online dalla teca</li>
                  </ul>
                  <p className="mt-2 text-sm text-orange-600">
                    Verrà creata automaticamente una nuova teca con 30 slot.
                  </p>
                </>
              ) : (
                <>
                  Revocando l'autorizzazione per <strong>{authorizingShop?.name}</strong>, il negozio non potrà più:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Scansionare QR code degli slot</li>
                    <li>Assegnare nuove carte agli slot</li>
                    <li>Vendere carte dalla teca</li>
                  </ul>
                  <p className="mt-2 text-sm text-gray-600">
                    Le carte già nella teca rimarranno, ma non potranno essere modificate.
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuthorizingShop(null)}>
              Annulla
            </Button>
            <Button 
              onClick={handleAuthorizeVaultCase} 
              disabled={processing}
              className={authorizeVaultCase ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'}
            >
              {processing ? 'Elaborazione...' : authorizeVaultCase ? 'Autorizza' : 'Revoca'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

