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

export function CategoryCard({ title, subtitle, count, image, icon, href, color = 'primary' }: CategoryCardProps) {
  const glowColor = {
    primary: 'group-hover:shadow-[0_0_40px_rgba(250,108,56,0.4)]',
    blue: 'group-hover:shadow-[0_0_40px_rgba(59,130,246,0.4)]',
    red: 'group-hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]',
  }[color]

  const borderGlow = {
    primary: 'group-hover:border-primary/60',
    blue: 'group-hover:border-blue-500/60',
    red: 'group-hover:border-red-500/60',
  }[color]

  return (
    <Link
      href={href}
      className={`group relative h-80 overflow-hidden rounded-3xl border-2 border-white/20 bg-white/10 shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] ${glowColor} ${borderGlow} dark:border-white/10 dark:bg-black/20`}
    >
      {/* Shine effect overlay */}
      <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
      </div>
      
      {/* Light sweep animation */}
      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-[100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg] group-hover:left-[150%] transition-all duration-700 ease-out opacity-0 group-hover:opacity-100"></div>
      </div>

      {/* Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-all duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100 group-hover:brightness-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10 transition-all duration-500 group-hover:from-black/80 group-hover:via-black/20"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col justify-end p-8">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-1 transition-transform duration-300 group-hover:translate-x-1">{title}</h3>
        <p className="text-sm font-medium text-gray-300 mb-4">{subtitle}</p>
        <div className="flex items-center text-sm font-bold text-white opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          Browse {count} <span className="material-symbols-outlined text-sm ml-1 transition-transform group-hover:translate-x-1">arrow_forward</span>
        </div>
      </div>
    </Link>
  )
}

