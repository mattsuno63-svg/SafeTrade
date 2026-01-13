'use client'

import Link from 'next/link'
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
  // Parse date for display
  const [day, month] = date.split(' ')
  const monthMap: Record<string, string> = {
    'Giu': 'Giu',
    'Lug': 'Lug',
    'Gen': 'Gen',
    'Feb': 'Feb',
    'Mar': 'Mar',
    'Apr': 'Apr',
    'Mag': 'Mag',
    'Ago': 'Ago',
    'Set': 'Set',
    'Ott': 'Ott',
    'Nov': 'Nov',
    'Dic': 'Dic',
  }

  return (
    <div data-tournament-card className="tournament-card-glass group h-[500px]">
      {/* Background Image */}
      <img
        alt={title}
        src={image}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      
      {/* Overlay */}
      <div className="tournament-overlay"></div>

      {/* Content Card */}
      <div className="tournament-content">
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">{game}</p>
            <h3 className="text-3xl font-display font-black text-slate-900 tracking-tight">{title}</h3>
          </div>
          <div className="bg-white/90 px-4 py-2 rounded-2xl border border-white/60 text-center shadow-sm">
            <span className="block text-xl font-black text-slate-900">{day}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{month}</span>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-8 relative z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-400 text-lg">location_on</span>
            <span className="text-sm font-bold text-slate-600">{location}</span>
          </div>
          <div className="flex items-center gap-2">
            {players.includes('€') ? (
              <>
                <span className="material-symbols-outlined text-slate-400 text-lg">payments</span>
                <span className="text-sm font-bold text-slate-600">{players}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-slate-400 text-lg">groups</span>
                <span className="text-sm font-bold text-slate-600">{players}</span>
              </>
            )}
          </div>
        </div>

        <Link href="/tournaments" className="block relative z-10">
          <Button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1 transition-all text-sm uppercase tracking-widest">
            Iscriviti Ora
          </Button>
        </Link>
      </div>
    </div>
  )
}
