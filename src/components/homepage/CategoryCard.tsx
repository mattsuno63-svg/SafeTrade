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
  const shadowColor = {
    primary: 'hover:shadow-primary/20',
    blue: 'hover:shadow-blue-500/20',
    red: 'hover:shadow-red-500/20',
  }[color]

  return (
    <Link
      href={href}
      className={`group relative h-80 overflow-hidden rounded-3xl border border-white/40 bg-white/20 shadow-xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl ${shadowColor} dark:border-white/10 dark:bg-black/20`}
    >
      <div className="absolute inset-0 z-0">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
      </div>
      <div className="relative z-10 flex h-full flex-col justify-end p-8">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <h3 className="text-3xl font-bold text-white mb-1">{title}</h3>
        <p className="text-sm font-medium text-gray-300 mb-4">{subtitle}</p>
        <div className="flex items-center text-sm font-bold text-white opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          Browse {count} <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
        </div>
      </div>
    </Link>
  )
}

