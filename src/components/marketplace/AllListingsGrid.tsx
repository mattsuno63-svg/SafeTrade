'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPriceNumber } from '@/lib/utils'

interface Listing {
  id: string
  title: string
  description: string | null
  price: number | null
  type: 'SALE' | 'TRADE' | 'BOTH'
  condition: string
  game: string
  set: string | null
  images: string[]
  createdAt: string
  user: {
    id: string
    name: string | null
    avatar: string | null
    role: 'USER' | 'MERCHANT' | 'ADMIN'
    city: string | null
  }
}

export function AllListingsGrid() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      // Fetch only 4 cards for the homepage preview
      const res = await fetch('/api/listings?limit=4&sort=newest')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const getConditionColor = (cond: string) => {
    const colors: Record<string, string> = {
      MINT: 'bg-green-500',
      NEAR_MINT: 'bg-green-400',
      EXCELLENT: 'bg-blue-500',
      GOOD: 'bg-yellow-500',
      PLAYED: 'bg-orange-500',
      POOR: 'bg-red-500',
    }
    return colors[cond] || 'bg-gray-500'
  }

  const formatCondition = (cond: string) => {
    return cond.replace(/_/g, ' ')
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-xl mb-3"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-3/4 mb-2"></div>
            <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <Card className="glass-panel p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-6xl text-gray-400">inventory_2</span>
          <div>
            <h3 className="font-bold text-xl mb-2">Nessuna Carta Disponibile</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Non ci sono carte in vendita al momento.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {listings.map((listing) => (
          <Link 
            key={listing.id} 
            href={`/listings/${listing.id}`}
            className="group"
          >
            <Card className="glass-panel overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
              {/* Image */}
              <div className="relative h-64 bg-gray-100 dark:bg-gray-800">
                {listing.images?.[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300">
                      playing_card
                    </span>
                  </div>
                )}
                {/* Condition Badge */}
                <div className="absolute top-3 left-3">
                  <Badge className={`${getConditionColor(listing.condition)} text-white text-xs`}>
                    {formatCondition(listing.condition)}
                  </Badge>
                </div>
                {/* Type Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-black/50 text-white backdrop-blur-sm text-xs">
                    {listing.type === 'SALE' ? 'Vendita' : listing.type === 'TRADE' ? 'Scambio' : 'Vendita/Scambio'}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {listing.title}
                </h3>
                
                {/* Game */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {listing.game}
                </p>

                {/* Price */}
                {listing.price && (
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      €{formatPriceNumber(listing.price)}
                    </span>
                  </div>
                )}

                {/* Seller */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {listing.user.avatar ? (
                      <img
                        src={listing.user.avatar}
                        alt={listing.user.name || 'User'}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {listing.user.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {listing.user.name || 'Anonymous'}
                    </span>
                  </div>
                  {listing.user.role === 'MERCHANT' && (
                    <Badge className="bg-primary/10 text-primary text-xs">
                      <span className="material-symbols-outlined text-xs mr-1">store</span>
                      Shop
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* View All Button */}
      <div className="flex justify-center">
        <Link href="/listings" target="_blank" rel="noopener noreferrer">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary-dark text-white font-bold px-8"
          >
            Vedi Tutte le Carte
            <span className="material-symbols-outlined ml-2">arrow_forward</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}

