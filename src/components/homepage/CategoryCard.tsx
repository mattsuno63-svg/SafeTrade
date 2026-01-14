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
                <div className="absolute inset-0 bg-white/60 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <span className="material-symbols-outlined text-[100px] text-amber-500/60 font-extralight">skull</span>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            ) : title === 'Magic' ? (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-emerald-500/30 overflow-hidden flex items-center justify-center shadow-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
                  {/* Mana Symbol - Stylized */}
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-3 border-emerald-600/40 bg-emerald-100/50"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-600/30 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-600/40"></div>
                      </div>
                    </div>
                    {/* Decorative lines */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-emerald-600/30"></div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-emerald-600/30"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-emerald-600/30"></div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-0.5 bg-emerald-600/30"></div>
                  </div>
                </div>
                <div className="absolute inset-0 etched-texture opacity-40"></div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-white/40 rounded-full border border-white/80 backdrop-blur-3xl shadow-inner"></div>
                <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                  {/* Millennium Puzzle Triangle */}
                  <div className="relative w-28 h-28">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Outer triangle */}
                      <path
                        d="M50 10 L90 80 L10 80 Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-amber-600/50"
                      />
                      {/* Inner triangle */}
                      <path
                        d="M50 25 L75 70 L25 70 Z"
                        fill="currentColor"
                        className="text-amber-500/30"
                      />
                      {/* Eye symbol */}
                      <circle
                        cx="50"
                        cy="50"
                        r="8"
                        fill="currentColor"
                        className="text-amber-600/60"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="4"
                        fill="currentColor"
                        className="text-amber-700/80"
                      />
                    </svg>
                  </div>
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
