'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Promotion {
  id: string
  title: string
  description: string | null
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  startDate: string
  endDate: string
  isActive: boolean
  appliesTo: string[]
  targetIds: string[]
}

export default function MerchantPromosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()

  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discountValue: '',
    startDate: '',
    endDate: '',
    appliesTo: ['ALL'] as string[],
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    if (user) {
      fetchPromos()
    }
  }, [user, userLoading, router])

  const fetchPromos = async () => {
    try {
      const res = await fetch('/api/merchant/promos')
      if (res.ok) {
        const data = await res.json()
        setPromos(data)
      }
    } catch (error) {
      console.error('Error fetching promos:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare le promozioni',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/merchant/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          discountValue: parseFloat(formData.discountValue),
        }),
      })

      if (!res.ok) throw new Error('Failed to create promotion')

      toast({
        title: 'Successo',
        description: 'Promozione creata con successo!',
      })
      setShowCreateModal(false)
      fetchPromos()
      // Reset form
      setFormData({
        title: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        startDate: '',
        endDate: '',
        appliesTo: ['ALL'],
      })
    } catch (error) {
      console.error('Error creating promo:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile creare la promozione',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa promozione?')) return

    try {
      const res = await fetch(`/api/merchant/promos/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete')

      toast({
        title: 'Successo',
        description: 'Promozione eliminata',
      })
      fetchPromos()
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la promozione',
        variant: 'destructive',
      })
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Promozioni e Offerte</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Crea e gestisci promozioni per i tuoi prodotti
                </p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary-dark"
              >
                <span className="material-symbols-outlined mr-2">add</span>
                Nuova Promozione
              </Button>
            </div>

            {/* Promos List */}
            {promos.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  local_offer
                </span>
                <h3 className="text-xl font-bold mb-2">Nessuna promozione</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Crea la tua prima promozione per attirare più clienti
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-primary hover:bg-primary-dark"
                >
                  Crea Promozione
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {promos.map((promo) => (
                  <Card key={promo.id} className="glass-panel p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-lg">{promo.title}</h3>
                      {promo.isActive ? (
                        <Badge className="bg-green-500">Attiva</Badge>
                      ) : (
                        <Badge variant="outline">Inattiva</Badge>
                      )}
                    </div>
                    {promo.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {promo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold text-primary">
                        {promo.discountType === 'PERCENTAGE'
                          ? `${promo.discountValue}%`
                          : `€${promo.discountValue}`}
                      </span>
                      <span className="text-sm text-gray-500">sconto</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-4">
                      <p>Dal: {new Date(promo.startDate).toLocaleDateString('it-IT')}</p>
                      <p>Al: {new Date(promo.endDate).toLocaleDateString('it-IT')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Modifica
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleDelete(promo.id)}
                      >
                        Elimina
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="glass-panel p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Nuova Promozione</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Titolo *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Es: Sconto 20% su tutte le carte"
                    required
                  />
                </div>
                <div>
                  <Label>Descrizione</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrizione della promozione..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo Sconto *</Label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    >
                      <option value="PERCENTAGE">Percentuale</option>
                      <option value="FIXED_AMOUNT">Importo Fisso</option>
                    </select>
                  </div>
                  <div>
                    <Label>Valore Sconto *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '10.00'}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Inizio *</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Data Fine *</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-dark"
                    disabled={creating}
                  >
                    {creating ? 'Creazione...' : 'Crea Promozione'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

