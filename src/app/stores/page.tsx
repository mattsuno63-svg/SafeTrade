'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ITALIAN_PROVINCES } from '@/lib/data/italian-provinces'
import { Loader2 } from 'lucide-react'

interface Shop {
  id: string
  name: string
  slug: string
  description: string | null
  logo: string | null
  city: string | null
  province: string | null
  rating: number
  ratingCount: number
  isApproved: boolean
  vaultEnabled: boolean
  vaultCaseAuthorized: boolean
  merchant: {
    id: string
    name: string | null
    avatar: string | null
  }
  _count: {
    tournaments: number
  }
}

export default function StoresPage() {
  const router = useRouter()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    city: '',
    province: '',
    name: '',
    minRating: '',
  })

  const fetchShops = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.city) params.append('city', filters.city)
      if (filters.province) params.append('province', filters.province)
      if (filters.name) params.append('name', filters.name)
      if (filters.minRating) params.append('minRating', filters.minRating)

      const res = await fetch(`/api/shops?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to fetch shops')
      }

      const data = await res.json()
      setShops(data.shops || [])
    } catch (err: any) {
      console.error('Error fetching shops:', err)
      setError(err.message || 'Errore nel caricamento dei negozi')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchShops()
  }, [fetchShops])

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      city: '',
      province: '',
      name: '',
      minRating: '',
    })
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Trova Store Partner</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Scopri tutti i negozi partner SafeTrade nella tua zona
            </p>
          </div>

          {/* Filters */}
          <Card className="glass-panel p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Cerca per nome</label>
                <Input
                  placeholder="Nome negozio..."
                  value={filters.name}
                  onChange={(e) => handleFilterChange('name', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Città</label>
                <Input
                  placeholder="Città..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Provincia</label>
                <Select
                  value={filters.province}
                  onValueChange={(value) => handleFilterChange('province', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tutte le province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tutte le province</SelectItem>
                    {ITALIAN_PROVINCES.map((p) => (
                      <SelectItem key={p.code} value={p.name}>
                        {p.name} ({p.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rating minimo</label>
                <Select
                  value={filters.minRating}
                  onValueChange={(value) => handleFilterChange('minRating', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tutti</SelectItem>
                    <SelectItem value="4">4+ stelle</SelectItem>
                    <SelectItem value="4.5">4.5+ stelle</SelectItem>
                    <SelectItem value="5">5 stelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(filters.city || filters.province || filters.name || filters.minRating) && (
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Rimuovi filtri
                </Button>
              </div>
            )}
          </Card>

          {/* Shops Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Card className="glass-panel p-12 text-center">
              <p className="text-red-500">{error}</p>
            </Card>
          ) : shops.length === 0 ? (
            <Card className="glass-panel p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">
                store
              </span>
              <h3 className="font-bold text-xl mb-2">Nessun Negozio Trovato</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Non ci sono negozi partner che corrispondono ai tuoi filtri.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop) => (
                <Link key={shop.id} href={`/shops/${shop.slug}`}>
                  <Card className="glass-panel overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                    {/* Shop Logo/Image */}
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 to-orange-500/20">
                      {shop.logo ? (
                        <Image
                          src={shop.logo}
                          alt={shop.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-6xl text-primary/30">
                            store
                          </span>
                        </div>
                      )}
                      {/* Partner Badge */}
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-green-500 text-white font-bold">
                          <span className="material-symbols-outlined text-sm mr-1">verified</span>
                          Partner
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="font-bold text-xl mb-2 line-clamp-1">{shop.name}</h3>
                      
                      {/* Location */}
                      {(shop.city || shop.province) && (
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          <span>
                            {shop.city}
                            {shop.province && `, ${shop.province}`}
                          </span>
                        </div>
                      )}

                      {/* Rating */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`material-symbols-outlined text-base ${
                                i < Math.floor(shop.rating)
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                          {shop.rating.toFixed(1)} ({shop.ratingCount} recensioni)
                        </span>
                      </div>

                      {/* Description */}
                      {shop.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                          {shop.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {shop._count.tournaments > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base">trophy</span>
                            <span>{shop._count.tournaments} tornei</span>
                          </div>
                        )}
                      </div>

                      {/* CTA */}
                      <Button className="w-full bg-primary hover:bg-primary-dark">
                        Visita Negozio
                        <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                      </Button>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

