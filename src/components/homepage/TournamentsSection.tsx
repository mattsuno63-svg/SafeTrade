'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TournamentCard } from './TournamentCard'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Tournament {
  id: string
  title: string
  game: string
  date: string
  time: string | null
  location: string | null
  shop: {
    city: string | null
  } | null
  entryFee: number | null
  maxParticipants: number | null
  prizePool: number | null
  status: string
  _count: {
    registrations: number
  }
}

export function TournamentsSection() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTournaments = async () => {
    try {
      // Add cache busting timestamp
      const timestamp = new Date().getTime()
      
      // Try with distance filter first (if user has city)
      const distancePref = localStorage.getItem('preferred_distance') || '50 km'
      const match = distancePref.match(/(\d+)/)
      const maxDistance = match ? match[1] : '50'
      
      // Try authenticated request with distance filter
      let res = await fetch(`/api/tournaments?futureOnly=true&limit=2&filterByDistance=true&maxDistance=${maxDistance} km&_t=${timestamp}`, {
        credentials: 'include', // Include cookies for auth
      })
      
      if (!res.ok || res.status === 401) {
        // User not authenticated or no city - fetch without distance filter
        res = await fetch(`/api/tournaments?futureOnly=true&limit=2&_t=${timestamp}`)
      }
      
      if (res.ok) {
        const data = await res.json()
        setTournaments(data || [])
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error)
      // Fallback senza filtro distanza
      try {
        const timestamp = new Date().getTime()
        const res = await fetch(`/api/tournaments?futureOnly=true&limit=2&_t=${timestamp}`)
        if (res.ok) {
          const data = await res.json()
          setTournaments(data || [])
        }
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTournaments()

    // Refresh when page becomes visible (user switches tabs/windows)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTournaments()
      }
    }

    // Refresh on window focus
    const handleFocus = () => {
      fetchTournaments()
    }

    // Polling every 30 seconds for fresh data
    const intervalId = setInterval(() => {
      fetchTournaments()
    }, 30000) // 30 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'd MMM', { locale: it })
    } catch {
      return dateString
    }
  }

  const formatLocation = (tournament: Tournament) => {
    if (tournament.location) return tournament.location
    if (tournament.shop?.city) return `${tournament.shop.city}, Italia`
    return 'Italia'
  }

  // Helper to get province from city (approssimativo - in produzione usare geocoding)
  const getProvinceFromCity = (city: string | null): string | null => {
    if (!city) return null
    // Mapping approssimativo città -> provincia
    const cityToProvince: Record<string, string> = {
      'Milano': 'Milano',
      'Roma': 'Roma',
      'Napoli': 'Napoli',
      'Torino': 'Torino',
      'Palermo': 'Palermo',
      'Firenze': 'Firenze',
      'Bologna': 'Bologna',
      'Genova': 'Genova',
      'Venezia': 'Venezia',
      'Ragusa': 'Ragusa',
    }
    return cityToProvince[city] || city
  }

  const formatPlayers = (tournament: Tournament) => {
    if (tournament.prizePool) {
      return `€${tournament.prizePool.toLocaleString('it-IT')} Montepremi`
    }
    const registered = tournament._count?.registrations || 0
    const max = tournament.maxParticipants || 0
    if (max > 0) {
      return `${registered}/${max} Partecipanti`
    }
    return `${registered} Partecipanti`
  }

  const getGameLabel = (game: string) => {
    const labels: Record<string, string> = {
      POKEMON: 'CHAMPIONSHIP • POKEMON',
      MAGIC: 'PRO CIRCUIT • MAGIC',
      YUGIOH: 'ELITE • YU-GI-OH',
      ONEPIECE: 'NEW WORLD • ONE PIECE',
    }
    return labels[game] || game
  }

  const getStatus = (tournament: Tournament): 'open' | 'closed' | 'full' => {
    if (tournament.status === 'REGISTRATION_CLOSED') return 'closed'
    if (tournament.status === 'IN_PROGRESS') return 'open' // Map IN_PROGRESS to 'open'
    return 'open'
  }

  // Default image based on game
  const getDefaultImage = (game: string) => {
    const images: Record<string, string> = {
      POKEMON: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PdU7cx6XnZMsiV942Vum5vj3iNZ9noVzkZs5HHcFx5JvLlPfHFIMHPN5HlgYlS6MnLgmwu-B-_87NJvIgXr8cFFuuwaj19TwtlUEvo0lSUWwOZmG62hCOFDLefunQxzhvDWusnz_4znGvdYrWCGxU5XVvlydI2zU8l72ynj61xDuBslYap5TWkswR8p3ftD-7Mudfu6U_1JCeIWkgZweDzIM-FNMZULPNacLnAk3bZGAX5VtYLKGnS6sGHOcGaNPGnkdP5IjW-NI',
      MAGIC: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0uet5EKpdQwwk1xg24NFMEdpB_7VgD6_wjL99iP3b6Thl8KkFSmxqUZ_GI119LIB3wzOK18e2O9y6cPat15rs03ruIjaBKcw_Ziebgh0FECbYhDQ4olQq9GS5Yo9M6qKtXyQuejDR__pr1uMFo5lmdJYkGoIzSOgusj0AujMhWbXc57M3O-277UubzX6RN1Ba0jE2-X8zUjshL5VfOkAsLjoWgV_-0si8QMjYGJql0kzR83jIoYUUwgzDYBMJjzyxgGvUJRi1nlzX',
      YUGIOH: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD8nJ0SDOqEnkZCxA_r65EMTQQRw_LHtYMZRRH-E-egkZRv6ear_PBDexuh1ZuIUtkcgVcNDPButwLJ93CExbsrd7toczTeHFQ6G24Io-6E1XroI6GEN-LPHmGKW4QED1_dCHy5iqa8R13DaVlfgoVWH5S1SIEnx9fx6Xzrqg2bWpnkTB7EReSq0B6MDmK0RrZZXgS-KhPqlgWrq8mdyMIbreGvu7CdXxkPW6XkrodFOmjD7i-5yJ13xtBjrefuFqs4hwjlRes_dKLC',
      ONEPIECE: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB3swlRftSVm_TS-s6jVm6iM8GA6IL22iG1H2AOsaFycpsfogYVa5oc0shHa9jZpRjOzop2MYsOAuCxrmZi7shaGvnittuUBlJPLE_A5AyCO4Tr3i2XwXGhSjZhL2_2K_y1UljdwzfeBdux4sS-hZqZZfj3il4CXksRNgF2TRC25i4KrO0Q_ytyvVaIAAla1yNZLSLLK6NugrNj4g6rSAA1XerGUc4jbfBq5cHdHMFkHJUqWavKKnemjWKjemuIc-jMcW5lbQwi5_mO',
    }
    return images[game] || images.POKEMON
  }

  return (
    <section data-section="tournaments" className="max-w-7xl mx-auto px-6 py-32 relative">
      <div className="flex items-end justify-between mb-16">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary font-bold">trophy</span>
            <h2 className="text-4xl font-display font-black tracking-tighter">Tornei d'Elite</h2>
          </div>
          <p className="text-slate-500 font-medium ml-9">Competi ai massimi livelli nei circuiti ufficiali.</p>
        </div>
        <Link href="/tournaments" className="text-primary font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
          Calendario Completo
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">
            <p>Caricamento tornei...</p>
          </div>
        ) : tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              title={tournament.title}
              game={getGameLabel(tournament.game)}
              date={formatDate(tournament.date)}
              location={formatLocation(tournament)}
              players={formatPlayers(tournament)}
              status={getStatus(tournament)}
              image={getDefaultImage(tournament.game)}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-slate-500">
            <p>Nessun torneo in programma al momento.</p>
          </div>
        )}
      </div>
    </section>
  )
}

