'use client'

import { Button } from '@/components/ui/button'

interface TournamentCardProps {
  title: string
  game: string
  date: string
  location: string
  players: string
  status: 'open' | 'full' | 'closed'
  image: string
}

export function TournamentCard({ title, game, date, location, players, status, image }: TournamentCardProps) {
  const statusConfig = {
    open: { label: 'Open', color: 'bg-green-500/90' },
    full: { label: 'Full', color: 'bg-yellow-500/90' },
    closed: { label: 'Closed', color: 'bg-gray-500/90' },
  }[status]

  return (
    <div className="group relative flex min-w-[320px] max-w-[320px] snap-center flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/40 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:bg-white/60 hover:shadow-2xl hover:shadow-primary/10 dark:border-white/10 dark:bg-black/40 dark:hover:bg-white/5">
      <div className="relative h-48 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 z-20">
          <span className={`inline-flex items-center rounded-full ${statusConfig.color} px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-sm`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 z-20">
          <span className="text-xs font-bold uppercase tracking-wider text-white/90 drop-shadow-md">{game}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h4 className="mb-3 text-xl font-bold leading-tight text-text-primary dark:text-white">{title}</h4>
        <div className="mb-6 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>calendar_month</span>
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>location_on</span>
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }}>groups</span>
            <span>{players}</span>
          </div>
        </div>
        <div className="mt-auto">
          <Button className="w-full rounded-full bg-primary py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark hover:shadow-primary/40">
            Register Now
          </Button>
        </div>
      </div>
    </div>
  )
}

