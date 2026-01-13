'use client'

import Link from 'next/link'
import Image from 'next/image'
import { formatPriceNumber } from '@/lib/utils'

// Featured card - Charizard in vetrina
const featuredCards = [
  {
    id: 'cmjt05ldd0001weeb3y40znq1',
    title: 'Charizard Shadowless',
    price: 4200,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuA3PdU7cx6XnZMsiV942Vum5vj3iNZ9noVzkZs5HHcFx5JvLlPfHFIMHPN5HlgYlS6MnLgmwu-B-_87NJvIgXr8cFFuuwaj19TwtlUEvo0lSUWwOZmG62hCOFDLefunQxzhvDWusnz_4znGvdYrWCGxU5XVvlydI2zU8l72ynj61xDuBslYap5TWkswR8p3ftD-7Mudfu6U_1JCeIWkgZweDzIM-FNMZULPNacLnAk3bZGAX5VtYLKGnS6sGHOcGaNPGnkdP5IjW-NI'],
    condition: 'PSA 10',
    game: 'POKEMON',
    set: 'HERITAGE',
    type: 'SALE',
    verified: true,
  },
  {
    id: '2',
    title: 'Luffy Alt Art Parallel',
    price: 1850,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuB3swlRftSVm_TS-s6jVm6iM8GA6IL22iG1H2AOsaFycpsfogYVa5oc0shHa9jZpRjOzop2MYsOAuCxrmZi7shaGvnittuUBlJPLE_A5AyCO4Tr3i2XwXGhSjZhL2_2K_y1UljdwzfeBdux4sS-hZqZZfj3il4CXksRNgF2TRC25i4KrO0Q_ytyvVaIAAla1yNZLSLLK6NugrNj4g6rSAA1XerGUc4jbfBq5cHdHMFkHJUqWavKKnemjWKjemuIc-jMcW5lbQwi5_mO'],
    condition: 'MINT 10',
    game: 'ONE PIECE',
    set: 'ROMANCE DAWN',
    type: 'SALE',
    verified: true,
  },
  {
    id: '3',
    title: 'Unlimited Black Lotus',
    price: 12500,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuC0uet5EKpdQwwk1xg24NFMEdpB_7VgD6_wjL99iP3b6Thl8KkFSmxqUZ_GI119LIB3wzOK18e2O9y6cPat15rs03ruIjaBKcw_Ziebgh0FECbYhDQ4olQq9GS5Yo9M6qKtXyQuejDR__pr1uMFo5lmdJYkGoIzSOgusj0AujMhWbXc57M3O-277UubzX6RN1Ba0jE2-X8zUjshL5VfOkAsLjoWgV_-0si8QMjYGJql0kzR83jIoYUUwgzDYBMJjzyxgGvUJRi1nlzX'],
    condition: 'BGS 9.5',
    game: 'MAGIC',
    set: 'VINTAGE',
    type: 'SALE',
    verified: false,
  },
  {
    id: '4',
    title: 'Blue-Eyes White Dragon',
    price: 850,
    images: ['https://lh3.googleusercontent.com/aida-public/AB6AXuD8nJ0SDOqEnkZCxA_r65EMTQQRw_LHtYMZRRH-E-egkZRv6ear_PBDexuh1ZuIUtkcgVcNDPButwLJ93CExbsrd7toczTeHFQ6G24Io-6E1XroI6GEN-LPHmGKW4QED1_dCHy5iqa8R13DaVlfgoVWH5S1SIEnx9fx6Xzrqg2bWpnkTB7EReSq0B6MDmK0RrZZXgS-KhPqlgWrq8mdyMIbreGvu7CdXxkPW6XkrodFOmjD7i-5yJ13xtBjrefuFqs4hwjlRes_dKLC'],
    condition: 'GEM MINT',
    game: 'YU-GI-OH',
    set: 'LEGEND',
    type: 'SALE',
    verified: false,
  },
]

export function FeaturedSection() {
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
        {featuredCards.map((listing) => (
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
                  {listing.game} • {listing.set}
                </p>
                <h3 className="font-display font-bold text-xl mb-6 text-slate-800 line-clamp-1">{listing.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-slate-900">€{formatPriceNumber(listing.price)}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SafeVault</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
