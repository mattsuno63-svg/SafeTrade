'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPriceNumber } from '@/lib/utils'

interface DemoCard {
  id: string
  title: string
  price: number
  condition: string
  game: string
  set: string
  image: string
  href: string
}

// Carte demo per ogni categoria
const demoCards: DemoCard[] = [
  {
    id: 'demo-pokemon-1',
    title: 'Charizard VMAX',
    price: 250.00,
    condition: 'NEAR_MINT',
    game: 'POKEMON',
    set: 'Champion\'s Path',
    image: 'https://images.pokemontcg.io/base1/4_hires.png', // Placeholder - sostituire con immagine reale
    href: '/listings?game=pokemon',
  },
  {
    id: 'demo-magic-1',
    title: 'Black Lotus',
    price: 15000.00,
    condition: 'MINT',
    game: 'MAGIC',
    set: 'Alpha',
    image: 'https://cards.scryfall.io/normal/front/0/c/0c082aa8-bf7f-47f2-baf8-7dd1c07d811d.jpg', // Placeholder
    href: '/listings?game=magic',
  },
  {
    id: 'demo-yugioh-1',
    title: 'Blue-Eyes White Dragon',
    price: 500.00,
    condition: 'NEAR_MINT',
    game: 'YUGIOH',
    set: 'Legend of Blue Eyes',
    image: 'https://images.yugioh-card.com/en/products/images/LOB-001.jpg', // Placeholder
    href: '/listings?game=yugioh',
  },
  {
    id: 'demo-onepiece-1',
    title: 'Monkey D. Luffy',
    price: 180.00,
    condition: 'MINT',
    game: 'ONEPIECE',
    set: 'Romance Dawn',
    image: 'https://onepiece-cardgame.com/images/cards/OP01-001.jpg', // Placeholder
    href: '/listings?game=onepiece',
  },
]

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

export function DemoCardsSection() {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">🎴 Carte Demo</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Esempi di carte disponibili per ogni categoria
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {demoCards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group"
          >
            <Card className="glass-panel overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full fade-in">
              {/* Image */}
              <div className="relative h-64 bg-gradient-to-br from-primary/10 to-orange-500/10">
                {card.image ? (
                  <Image
                    src={card.image}
                    alt={card.title}
                    width={400}
                    height={256}
                    className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                    onError={(e) => {
                      // Fallback se immagine non carica
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-6xl text-primary/30">playing_card</span>
                          </div>
                        `
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-primary/30">
                      playing_card
                    </span>
                  </div>
                )}
                
                {/* Condition Badge */}
                <div className="absolute top-3 left-3">
                  <Badge className={`${getConditionColor(card.condition)} text-white text-xs`}>
                    {formatCondition(card.condition)}
                  </Badge>
                </div>
                
                {/* Game Badge */}
                <div className="absolute top-3 right-3">
                  <Badge className="bg-black/50 text-white backdrop-blur-sm text-xs">
                    {card.game}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="mb-2">
                  <Badge className="bg-primary/20 text-primary text-xs mb-2">
                    {card.set}
                  </Badge>
                </div>
                
                <h3 className="font-bold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-primary">
                    €{formatPriceNumber(card.price)}
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

