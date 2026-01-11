'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface Hub {
  id: string
  name: string
  description: string | null
  address: string
  city: string
  country: string
  isActive: boolean
  isAvailable: boolean
  rating: number
  _count: {
    transactions: number
    reviews: number
  }
}

interface Package {
  id: string
  status: string
  packageStatus: string
  trackingNumber: string | null
  returnTrackingNumber: string | null
  packageReceivedAt: string | null
  packageVerifiedAt: string | null
  packageShippedAt: string | null
  packageDeliveredAt: string | null
  verificationPhotos: string[]
  createdAt: string
  userA: { id: string; name: string; email: string; avatar: string | null }
  userB: { id: string; name: string; email: string; avatar: string | null }
  proposal?: {
    listing?: {
      id: string
      title: string
      price: number
      images: string[]
    }
  }
  escrowPayment?: {
    amount: number
    status: string
  }
}

interface Stats {
  PENDING: number
  IN_TRANSIT: number
  RECEIVED: number
  VERIFIED: number
  SHIPPED: number
  DELIVERED: number
  RETURNED: number
}

type StatusFilter = 'ALL' | 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'VERIFIED' | 'SHIPPED' | 'DELIVERED' | 'RETURNED'

const STATUS_CONFIG = {
  PENDING: { label: 'In attesa', color: 'bg-gray-500', icon: 'hourglass_empty' },
  IN_TRANSIT: { label: 'In transito', color: 'bg-blue-500', icon: 'local_shipping' },
  RECEIVED: { label: 'Ricevuto', color: 'bg-yellow-500', icon: 'inventory' },
  VERIFIED: { label: 'Verificato', color: 'bg-green-500', icon: 'verified' },
  SHIPPED: { label: 'Spedito', color: 'bg-purple-500', icon: 'rocket_launch' },
  DELIVERED: { label: 'Consegnato', color: 'bg-emerald-500', icon: 'check_circle' },
  RETURNED: { label: 'Reso', color: 'bg-red-500', icon: 'undo' },
}

export default function AdminHubPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [hub, setHub] = useState<Hub | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch hub e packages in parallelo
      const [hubRes, packagesRes] = await Promise.all([
        fetch('/api/admin/hub'),
        fetch(`/api/admin/hub/packages?status=${statusFilter}`),
      ])

      if (hubRes.status === 403) {
        toast({
          title: 'Accesso negato',
          description: 'Solo admin può accedere a questa pagina',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }

      if (hubRes.ok) {
        const hubData = await hubRes.json()
        setHub(hubData.hub)
      }

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        setPackages(packagesData.packages || [])
        setStats(packagesData.stats || null)
      }
    } catch (error) {
      console.error('Error fetching hub data:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati dell\'hub',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchData()
    }
  }, [user, userLoading, router, fetchData])

  const handleAction = async (packageId: string, action: string, extraData?: Record<string, unknown>) => {
    try {
      setActionLoading(true)
      
      const res = await fetch(`/api/admin/hub/packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Successo!',
          description: data.message,
        })
        setSelectedPackage(null)
        fetchData()
      } else {
        toast({
          title: 'Errore',
          description: data.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error performing action:', error)
      toast({
        title: 'Errore',
        description: 'Operazione fallita',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-3">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Caricamento Hub...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-cyan-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
              <Link href="/admin" className="hover:text-cyan-500 transition-colors">Admin</Link>
              <span>/</span>
              <span className="text-cyan-500">Hub Escrow</span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-cyan-500">warehouse</span>
                <div>
                  <h1 className="text-3xl font-bold">{hub?.name || 'Hub Escrow'}</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Gestisci pacchi: ricevi, verifica contenuti, spedisci
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${hub?.isAvailable ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {hub?.isAvailable ? 'Disponibile' : 'Non disponibile'}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mb-8">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as StatusFilter)}
                    className={`glass-panel p-4 text-center rounded-xl transition-all ${statusFilter === key ? 'ring-2 ring-cyan-500 shadow-lg' : 'hover:shadow-md'}`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${config.color.replace('bg-', 'text-')} mb-1`}>
                      {config.icon}
                    </span>
                    <div className="text-2xl font-bold">{stats[key as keyof Stats] || 0}</div>
                    <div className="text-xs text-gray-500">{config.label}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Filter Reset */}
            {statusFilter !== 'ALL' && (
              <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => setStatusFilter('ALL')}>
                  <span className="material-symbols-outlined text-sm mr-1">clear</span>
                  Rimuovi filtro ({STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label})
                </Button>
              </div>
            )}

            {/* Packages List */}
            <div className="space-y-4">
              {packages.length === 0 ? (
                <Card className="glass-panel p-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">inventory_2</span>
                  <h3 className="text-xl font-bold mb-2">Nessun pacco</h3>
                  <p className="text-gray-500">
                    {statusFilter === 'ALL' 
                      ? 'Non ci sono pacchi da gestire al momento.' 
                      : `Nessun pacco con stato "${STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label}".`}
                  </p>
                </Card>
              ) : (
                packages.map((pkg) => (
                  <Card 
                    key={pkg.id} 
                    className={`glass-panel p-6 transition-all ${selectedPackage?.id === pkg.id ? 'ring-2 ring-cyan-500' : 'hover:shadow-lg'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Listing Image */}
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        {pkg.proposal?.listing?.images?.[0] ? (
                          <Image
                            src={pkg.proposal.listing.images[0]}
                            alt={pkg.proposal.listing.title || 'Package'}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400">package_2</span>
                          </div>
                        )}
                      </div>

                      {/* Package Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-bold text-lg truncate">
                              {pkg.proposal?.listing?.title || `Transazione #${pkg.id.slice(0, 8)}`}
                            </h3>
                            <p className="text-sm text-gray-500">
                              ID: {pkg.id.slice(0, 8)}... • 
                              Creato {formatDistanceToNow(new Date(pkg.createdAt), { addSuffix: true, locale: it })}
                            </p>
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${STATUS_CONFIG[pkg.packageStatus as keyof typeof STATUS_CONFIG]?.color}/20`}>
                            <span className={`material-symbols-outlined text-sm ${STATUS_CONFIG[pkg.packageStatus as keyof typeof STATUS_CONFIG]?.color.replace('bg-', 'text-')}`}>
                              {STATUS_CONFIG[pkg.packageStatus as keyof typeof STATUS_CONFIG]?.icon}
                            </span>
                            <span className={STATUS_CONFIG[pkg.packageStatus as keyof typeof STATUS_CONFIG]?.color.replace('bg-', 'text-')}>
                              {STATUS_CONFIG[pkg.packageStatus as keyof typeof STATUS_CONFIG]?.label}
                            </span>
                          </div>
                        </div>

                        {/* Users */}
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Venditore:</span>
                            <span className="font-medium">{pkg.userB?.name || pkg.userB?.email || 'N/A'}</span>
                          </div>
                          <span className="text-gray-300">→</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Acquirente:</span>
                            <span className="font-medium">{pkg.userA?.name || pkg.userA?.email || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Amount & Tracking */}
                        <div className="flex items-center gap-4 text-sm">
                          {pkg.escrowPayment && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-green-500">euro</span>
                              <span className="font-bold text-green-500">
                                {pkg.escrowPayment.amount.toFixed(2)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded ${pkg.escrowPayment.status === 'HELD' ? 'bg-yellow-500/20 text-yellow-600' : pkg.escrowPayment.status === 'RELEASED' ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-600'}`}>
                                {pkg.escrowPayment.status}
                              </span>
                            </div>
                          )}
                          {pkg.trackingNumber && (
                            <div className="flex items-center gap-1 text-gray-500">
                              <span className="material-symbols-outlined text-sm">qr_code</span>
                              <span>{pkg.trackingNumber}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {pkg.packageStatus === 'IN_TRANSIT' && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(pkg.id, 'receive')}
                              disabled={actionLoading}
                              className="bg-yellow-500 hover:bg-yellow-600"
                            >
                              <span className="material-symbols-outlined text-sm mr-1">inventory</span>
                              Segna come Ricevuto
                            </Button>
                          )}
                          
                          {pkg.packageStatus === 'RECEIVED' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedPackage(pkg)}
                              disabled={actionLoading}
                              className="bg-green-500 hover:bg-green-600"
                            >
                              <span className="material-symbols-outlined text-sm mr-1">verified</span>
                              Verifica Contenuto
                            </Button>
                          )}
                          
                          {pkg.packageStatus === 'VERIFIED' && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedPackage(pkg)}
                              disabled={actionLoading}
                              className="bg-purple-500 hover:bg-purple-600"
                            >
                              <span className="material-symbols-outlined text-sm mr-1">rocket_launch</span>
                              Spedisci al Destinatario
                            </Button>
                          )}
                          
                          {pkg.packageStatus === 'SHIPPED' && (
                            <Button
                              size="sm"
                              onClick={() => handleAction(pkg.id, 'deliver')}
                              disabled={actionLoading}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
                              Conferma Consegna
                            </Button>
                          )}

                          <Link href={`/transactions/${pkg.id}`}>
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined text-sm mr-1">visibility</span>
                              Dettagli
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal Verifica/Spedizione */}
      {selectedPackage && (
        <PackageActionModal
          pkg={selectedPackage}
          onClose={() => setSelectedPackage(null)}
          onAction={handleAction}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// Modal per azioni specifiche (verifica con foto, spedizione con tracking)
function PackageActionModal({
  pkg,
  onClose,
  onAction,
  loading,
}: {
  pkg: Package
  onClose: () => void
  onAction: (id: string, action: string, data?: Record<string, unknown>) => void
  loading: boolean
}) {
  const [photos, setPhotos] = useState<string[]>([])
  const [trackingNumber, setTrackingNumber] = useState('')
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const isVerifyAction = pkg.packageStatus === 'RECEIVED'
  const isShipAction = pkg.packageStatus === 'VERIFIED'

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const uploadedUrls: string[] = []
      
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'verification')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          uploadedUrls.push(data.url)
        }
      }

      setPhotos((prev) => [...prev, ...uploadedUrls])
      toast({
        title: 'Foto caricate',
        description: `${uploadedUrls.length} foto caricate con successo`,
      })
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le foto',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = () => {
    if (isVerifyAction) {
      if (photos.length === 0) {
        toast({
          title: 'Foto richieste',
          description: 'Carica almeno una foto di verifica',
          variant: 'destructive',
        })
        return
      }
      onAction(pkg.id, 'verify', { verificationPhotos: photos })
    } else if (isShipAction) {
      if (!trackingNumber.trim()) {
        toast({
          title: 'Tracking richiesto',
          description: 'Inserisci il numero di tracking della spedizione',
          variant: 'destructive',
        })
        return
      }
      onAction(pkg.id, 'ship', { returnTrackingNumber: trackingNumber })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-3xl ${isVerifyAction ? 'text-green-500' : 'text-purple-500'}`}>
                {isVerifyAction ? 'verified' : 'rocket_launch'}
              </span>
              <div>
                <h2 className="text-xl font-bold">
                  {isVerifyAction ? 'Verifica Contenuto' : 'Spedisci Pacco'}
                </h2>
                <p className="text-sm text-gray-500">
                  {pkg.proposal?.listing?.title || `#${pkg.id.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Content */}
          {isVerifyAction && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scatta foto del contenuto del pacco per verificare che corrisponda alla descrizione dell&apos;annuncio.
                Le foto saranno allegate alla transazione.
              </p>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <label htmlFor="photo-upload" className="cursor-pointer block">
                  <span className="material-symbols-outlined text-4xl text-gray-400 mb-2 block">
                    {uploading ? 'sync' : 'add_photo_alternate'}
                  </span>
                  <span className="text-sm text-gray-500">
                    {uploading ? 'Caricamento...' : 'Clicca per caricare foto'}
                  </span>
                </label>
              </div>

              {/* Preview */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={url}
                        alt={`Verifica ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isShipAction && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Inserisci il numero di tracking della spedizione verso il destinatario finale (acquirente).
              </p>

              <div>
                <label className="block text-sm font-medium mb-2">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="es. 1234567890"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 bg-purple-500/10 p-3 rounded-lg">
                <span className="material-symbols-outlined text-purple-500">info</span>
                Il tracking verrà inviato automaticamente all&apos;acquirente.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
              Annulla
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || uploading}
              className={`flex-1 ${isVerifyAction ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600'}`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm mr-1">sync</span>
                  Elaborazione...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm mr-1">
                    {isVerifyAction ? 'verified' : 'send'}
                  </span>
                  {isVerifyAction ? 'Conferma Verifica' : 'Conferma Spedizione'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

