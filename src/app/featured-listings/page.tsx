'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPriceNumber } from '@/lib/utils'

interface FeaturedListing {
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
  }
}

export default function FeaturedListingsPage() {
  const [listings, setListings] = useState<FeaturedListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedListings()
  }, [])

  const fetchFeaturedListings = async () => {
    try {
      // Fetch featured listings (sort by price descending)
      const res = await fetch('/api/listings?sort=price_desc&limit=50')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching featured listings:', error)
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

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-yellow-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Link 
                  href="/marketplace"
                  className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  Marketplace
                </Link>
                <span className="text-gray-400">/</span>
                <span className="text-primary font-bold">Carte in Vetrina</span>
              </div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-yellow-500">star</span>
                Carte Premium in Vetrina
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Le migliori carte selezionate per i collezionisti
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-2xl mb-3"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-3/4 mb-2"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && listings.length === 0 && (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">stars</span>
                <h3 className="font-bold text-xl mb-2">Nessuna Carta in Vetrina</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Al momento non ci sono carte premium disponibili
                </p>
                <Link href="/marketplace">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Torna al Marketplace
                  </Button>
                </Link>
              </Card>
            )}

            {/* Listings Grid */}
            {!loading && listings.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listings.map((listing, index) => (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group"
                  >
                    <Card className="glass-panel overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 relative">
                      {/* Premium Badge */}
                      <div className="absolute top-4 left-4 z-10">
                        <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-3 py-1 shadow-lg">
                          <span className="material-symbols-outlined text-sm mr-1">star</span>
                          PREMIUM
                        </Badge>
                      </div>

                      {/* Ranking Badge */}
                      {index < 3 && (
                        <div className="absolute top-4 right-4 z-10">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                      )}

                      {/* Condition Badge */}
                      <div className="absolute top-16 left-4 z-10">
                        <Badge className={`${getConditionColor(listing.condition)} text-white text-xs`}>
                          {formatCondition(listing.condition)}
                        </Badge>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-16 right-4 z-10">
                        <Badge className="bg-black/50 text-white backdrop-blur-sm text-xs">
                          {listing.type === 'SALE' ? 'Vendita' : listing.type === 'TRADE' ? 'Scambio' : 'Vendita/Scambio'}
                        </Badge>
                      </div>

                      {/* Image */}
                      <div className="relative h-80 bg-gradient-to-br from-primary/20 to-orange-500/20">
                        {listing.images?.[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-8xl text-primary/30">
                              playing_card
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-800/70 backdrop-blur-sm">
                        <div className="mb-2">
                          <Badge className="bg-primary/20 text-primary text-xs mb-2">
                            {listing.game}
                          </Badge>
                        </div>
                        
                        <h3 className="font-bold text-xl mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                          {listing.title}
                        </h3>

                        {/* Price */}
                        {listing.price && (
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-extrabold text-primary">
                              €{formatPriceNumber(listing.price)}
                            </span>
                          </div>
                        )}

                        {/* Seller */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            by {listing.user.name || 'Anonymous'}
                          </span>
                          <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

