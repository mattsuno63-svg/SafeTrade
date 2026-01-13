'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPriceNumber } from '@/lib/utils'
import { useListings } from '@/hooks/use-listings'

interface FeaturedListing {
  id: string
  title: string
  price: number | null
  condition: string
  game: string
  images: string[]
  user: {
    name: string | null
  }
}

export function FeaturedListingsGrid() {
  const { data, isLoading: loading } = useListings({ limit: 3, sort: 'price_desc' })
  const listings = (data?.listings || []) as FeaturedListing[]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 dark:bg-gray-700 h-80 rounded-2xl"></div>
          </div>
        ))}
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <Card className="glass-panel p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">stars</span>
        <p className="text-gray-600 dark:text-gray-400">
          Nessuna carta in vetrina al momento
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Position Badge */}
            {index === 0 && (
              <div className="absolute top-4 right-4 z-10">
                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  1
                </div>
              </div>
            )}

            {/* Image */}
            <div className="relative h-80 bg-gradient-to-br from-primary/20 to-orange-500/20">
              {listing.images?.[0] ? (
                <Image
                  src={listing.images[0]}
                  alt={listing.title}
                  width={800}
                  height={320}
                  className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                  unoptimized
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
  )
}

