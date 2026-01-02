'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPriceNumber } from '@/lib/utils'

// Featured card - Charizard in vetrina
const featuredCard = {
  id: 'cmjt05ldd0001weeb3y40znq1',
  title: 'Charizard Holo - Base Set 1st Edition',
  price: 2500,
  images: ['https://images.pokemontcg.io/base1/4.png'],
  condition: 'EXCELLENT',
  game: 'POKEMON',
  set: 'Base Set',
  type: 'SALE',
  user: { name: 'portelli.mattiaa' },
  tier: 'PREMIUM',
}

export function FeaturedSection() {
  const featured = [featuredCard]

  return (
    <section className="py-16 bg-gradient-to-b from-primary/5 to-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
            <span className="text-4xl">🔥</span>
            Featured Cards
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Premium listings from verified collectors
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`}>
              <Card className="relative overflow-hidden group cursor-pointer border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-orange-500/5 hover:border-primary hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:-translate-y-1">
                {/* Featured Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold px-3 py-1 shadow-lg">
                    ⭐ {listing.tier || 'FEATURED'}
                  </Badge>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                {/* Image */}
                <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {listing.images[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-gray-300">
                        style
                      </span>
                    </div>
                  )}

                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow ${
                      listing.type === 'SALE' ? 'bg-green-500' :
                      listing.type === 'TRADE' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}>
                      {listing.type === 'BOTH' ? 'SALE/TRADE' : listing.type}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="text-xs font-medium text-primary mb-1">
                    {listing.game} {listing.set && `• ${listing.set}`}
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {listing.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    {listing.price ? (
                      <span className="text-2xl font-bold bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent" suppressHydrationWarning>
                        €{formatPriceNumber(listing.price)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 font-medium">Trade Only</span>
                    )}
                    <span className="text-xs text-gray-500">
                      by {listing.user?.name || 'Collector'}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

