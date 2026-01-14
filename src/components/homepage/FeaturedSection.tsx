'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPriceNumber } from '@/lib/utils'

interface FeaturedListing {
  id: string
  title: string
  price: number
  images: string[]
  condition: string
  game: string
  set: string | null
  type: string
  verified: boolean
}

export function FeaturedSection() {
  const [featuredCards, setFeaturedCards] = useState<FeaturedListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch('/api/listings/featured?limit=4')
        if (res.ok) {
          const data = await res.json()
          setFeaturedCards(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching featured listings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeatured()
  }, [])

  // Fallback to empty array if loading or no data
  const displayCards = loading ? [] : featuredCards

  return (
    <section data-section="featured" className="max-w-7xl mx-auto px-6 py-32 relative">
      <div className="flex items-end justify-between mb-16 relative z-10">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary font-bold">verified</span>
            <h2 className="text-4xl font-display font-black tracking-tighter">Vetrina SafeTrade</h2>
          </div>
          <p className="text-slate-500 font-medium ml-9">La selezione premium autenticata dai nostri esperti.</p>
        </div>
        <Link href="/marketplace" className="text-primary font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
          Indice Mercato
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
        {displayCards.length > 0 ? (
          displayCards.map((listing) => (
          <Link key={listing.id} href={`/listings/${listing.id}`}>
            <div data-featured-card className="premium-archive-container group cursor-pointer hover:scale-[1.02] transition-transform">
              {/* Image Container */}
              <div className="relative rounded-3xl overflow-hidden mb-6 aspect-[3/4] bg-slate-100 border border-black/5">
                <Image
                  alt={listing.title}
                  src={listing.images[0]}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-1000"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                
                {/* Verified Badge */}
                {listing.verified && (
                  <div className="absolute top-4 left-4 bg-green-500/90 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-tighter">
                    VERIFICATO
                  </div>
                )}
                
                {/* Condition Badge */}
                <div className={`absolute top-4 right-4 text-white text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-tighter shadow-lg ${
                  listing.condition.includes('PSA') || listing.condition.includes('GEM') ? 'bg-primary' :
                  listing.condition.includes('MINT') ? 'bg-slate-900' :
                  'bg-indigo-600'
                }`}>
                  {listing.condition}
                </div>
              </div>

              {/* Content */}
              <div className="px-1">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2">
                  {listing.game} • {listing.set || 'N/A'}
                </p>
                <h3 className="font-display font-bold text-xl mb-6 text-slate-800 line-clamp-1">{listing.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">€{formatPriceNumber(listing.price)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SafeVault</span>
                </div>
              </div>
            </div>
          </Link>
        ))
        ) : (
          !loading && (
            <div className="col-span-full text-center py-12 text-slate-500">
              <p>Nessuna carta in vetrina al momento.</p>
            </div>
          )
        )}
      </div>
    </section>
  )
}
