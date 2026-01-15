'use client'

import Link from 'next/link'
import Image from 'next/image'

interface CategoryCardProps {
  title: string
  subtitle: string
  count: string
  image: string
  icon: string
  href: string
  color?: 'primary' | 'blue' | 'red'
}

export function CategoryCard({ title, subtitle, image, icon, href }: CategoryCardProps) {
  // Define background colors for each category
  const bgColors: Record<string, string> = {
    'Pokemon': 'bg-[#f8fbff]',
    'One Piece': 'bg-sky-50',
    'Magic': 'bg-[#f4f7f6]',
    'Yu-Gi-Oh!': 'bg-slate-950',
  }

  const bgColor = bgColors[title] || 'bg-[#f8fbff]'
  const isDark = title === 'Yu-Gi-Oh!'

  return (
    <Link href={href}>
      <div data-category-card className={`group relative h-[450px] rounded-4xl overflow-hidden cursor-pointer shadow-xl border border-white/50 ${bgColor}`}>
        {/* Center Icon/Decoration */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="relative w-44 h-44 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
            {title === 'Pokemon' ? (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-red-500/30 overflow-hidden flex flex-col shadow-2xl">
                  <div className="h-1/2 bg-red-500/30 backdrop-blur-sm border-b-4 border-slate-400/30"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-4 border-slate-400/40 shadow-glow"></div>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            ) : title === 'One Piece' ? (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-amber-500/30 overflow-hidden flex items-center justify-center shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50">
                  {/* Jolly Roger - One Piece Skull */}
                  <svg viewBox="0 0 100 100" className="w-24 h-24">
                    {/* Skull shape */}
                    <path
                      d="M50 20 Q35 20 30 35 Q30 45 35 50 Q30 60 30 70 Q30 80 40 85 Q45 90 50 90 Q55 90 60 85 Q70 80 70 70 Q70 60 65 50 Q70 45 70 35 Q65 20 50 20 Z"
                      fill="currentColor"
                      className="text-amber-600/70"
                    />
                    {/* Eye sockets */}
                    <circle cx="40" cy="45" r="6" fill="currentColor" className="text-slate-800/80" />
                    <circle cx="60" cy="45" r="6" fill="currentColor" className="text-slate-800/80" />
                    {/* Crossbones */}
                    <line x1="25" y1="25" x2="40" y2="40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-amber-600/70" />
                    <line x1="60" y1="40" x2="75" y2="25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-amber-600/70" />
                    <line x1="25" y1="75" x2="40" y2="60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-amber-600/70" />
                    <line x1="60" y1="60" x2="75" y2="75" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="text-amber-600/70" />
                  </svg>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            ) : title === 'Magic' ? (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-red-500/30 overflow-hidden flex items-center justify-center shadow-2xl bg-gradient-to-br from-red-50 to-orange-50">
                  {/* Magic: The Gathering Official Logo Symbol - Red Flame/Crown */}
                  <svg viewBox="0 0 100 100" className="w-24 h-24" fill="currentColor">
                    {/* Base curve (fiamma inferiore) */}
                    <path
                      d="M 15 75 Q 25 80 35 75 Q 45 80 55 75 Q 65 80 75 75 Q 85 80 85 75"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      fill="none"
                      className="text-red-600/50"
                    />
                    {/* Fiamma centrale alta (spike principale) */}
                    <path
                      d="M 50 75 L 50 20 L 48 28 L 50 20 L 52 28 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    {/* Fiamme laterali sinistre */}
                    <path
                      d="M 35 75 L 35 40 L 33 48 L 35 40 L 37 48 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    <path
                      d="M 25 75 L 25 55 L 23 62 L 25 55 L 27 62 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    {/* Fiamme laterali destre */}
                    <path
                      d="M 65 75 L 65 40 L 63 48 L 65 40 L 67 48 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    <path
                      d="M 75 75 L 75 55 L 73 62 L 75 55 L 77 62 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    {/* Fiamme intermedie più piccole */}
                    <path
                      d="M 42 75 L 42 58 L 41 63 L 42 58 L 43 63 Z"
                      fill="currentColor"
                      className="text-red-500"
                    />
                    <path
                      d="M 58 75 L 58 58 L 57 63 L 58 58 L 59 63 Z"
                      fill="currentColor"
                      className="text-red-500"
                    />
                    {/* Dettagli decorativi superiori (corona) */}
                    <path
                      d="M 48 22 L 50 18 L 52 22 L 50 25 Z"
                      fill="currentColor"
                      className="text-red-600"
                    />
                    <path
                      d="M 45 25 L 47 22 L 49 25 Z"
                      fill="currentColor"
                      className="text-red-500"
                    />
                    <path
                      d="M 51 25 L 53 22 L 55 25 Z"
                      fill="currentColor"
                      className="text-red-500"
                    />
                  </svg>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-amber-500/30 overflow-hidden flex items-center justify-center shadow-2xl bg-gradient-to-br from-amber-50 to-yellow-50">
                  {/* Millennium Puzzle Triangle - Same size as Pokéball */}
                  <svg viewBox="0 0 100 100" className="w-24 h-24" fill="currentColor">
                    {/* Millennium Puzzle - Triangolo stilizzato con occhio */}
                    {/* Triangolo principale */}
                    <path
                      d="M 50 15 L 20 75 L 80 75 Z"
                      fill="currentColor"
                      className="text-amber-600/95"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    {/* Linee interne del puzzle */}
                    <path
                      d="M 50 15 L 50 60"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-amber-600/60"
                    />
                    <path
                      d="M 35 45 L 65 45"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-amber-600/60"
                    />
                    {/* Occhio di Horus stilizzato al centro */}
                    <circle
                      cx="50"
                      cy="50"
                      r="8"
                      fill="black"
                      opacity="0.8"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="4"
                      fill="currentColor"
                      className="text-amber-700/90"
                    />
                    {/* Dettagli decorativi ai lati */}
                    <path
                      d="M 30 70 L 35 65 L 40 70 Z"
                      fill="currentColor"
                      className="text-amber-600/70"
                    />
                    <path
                      d="M 70 70 L 65 65 L 60 70 Z"
                      fill="currentColor"
                      className="text-amber-600/70"
                    />
                    {/* Linee decorative superiori */}
                    <path
                      d="M 45 25 L 50 20 L 55 25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      fill="none"
                      className="text-amber-600/80"
                    />
                  </svg>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute bottom-10 left-10 right-10 z-10">
          <h3 className={`text-3xl font-display font-black mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-slate-500'}`}>{subtitle}</p>
        </div>
      </div>
    </Link>
  )
}
