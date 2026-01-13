'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Tournament {
  id: string
  title: string
  description?: string
  game: string
  date: string
  time: string
  maxParticipants: number
  entryFee?: number
  prizePool?: string
  status: string
  shop: {
    id: string
    name: string
    city?: string
  }
  _count: {
    registrations: number
  }
  isRegistered?: boolean
}

const GAMES = [
  { value: 'ALL', label: 'All Games' },
  { value: 'POKEMON', label: 'Pokémon' },
  { value: 'MAGIC', label: 'Magic' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'ONEPIECE', label: 'One Piece' },
  { value: 'DIGIMON', label: 'Digimon' },
]

export default function TournamentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [gameFilter, setGameFilter] = useState('ALL')
  const [registering, setRegistering] = useState<string | null>(null)

  const fetchTournaments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (gameFilter !== 'ALL') params.append('game', gameFilter)
      if (user) params.append('userId', user.id)
      
      const res = await fetch(`/api/tournaments?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tournaments')
      const data = await res.json()
      setTournaments(data)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (tournamentId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    setRegistering(tournamentId)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to register')
      }

      toast({
        title: 'Registered!',
        description: 'You have successfully registered for this tournament.',
      })

      fetchTournaments()
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setRegistering(null)
    }
  }

  const handleUnregister = async (tournamentId: string) => {
    setRegistering(tournamentId)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to unregister')
      }

      toast({
        title: 'Unregistered',
        description: 'You have been removed from this tournament.',
      })

      fetchTournaments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setRegistering(null)
    }
  }

  const getGameLabel = (game: string) => {
    const labels: Record<string, string> = {
      POKEMON: 'Pokémon',
      MAGIC: 'Magic: The Gathering',
      YUGIOH: 'Yu-Gi-Oh!',
      ONEPIECE: 'One Piece',
      DIGIMON: 'Digimon',
      OTHER: 'Other',
    }
    return labels[game] || game
  }

  const getGameColor = (game: string) => {
    const colors: Record<string, string> = {
      POKEMON: 'bg-yellow-500',
      MAGIC: 'bg-purple-600',
      YUGIOH: 'bg-red-500',
      ONEPIECE: 'bg-blue-500',
      DIGIMON: 'bg-orange-500',
      OTHER: 'bg-gray-500',
    }
    return colors[game] || 'bg-gray-500'
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute -bottom-[30%] -left-[10%] h-[600px] w-[600px] rounded-full bg-purple-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">
                <span className="material-symbols-outlined text-5xl align-middle text-primary mr-2">
                  emoji_events
                </span>
                Tournaments
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Find and join TCG tournaments at partner stores near you
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {GAMES.map((game) => (
                <Button
                  key={game.value}
                  variant={gameFilter === game.value ? 'default' : 'outline'}
                  onClick={() => setGameFilter(game.value)}
                  className="rounded-full"
                >
                  {game.label}
                </Button>
              ))}
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse">Loading tournaments...</div>
              </div>
            ) : tournaments.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  event_busy
                </span>
                <h3 className="text-xl font-bold mb-2">No tournaments found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {gameFilter !== 'ALL' 
                    ? 'Try selecting a different game or check back later.'
                    : 'Check back later for upcoming tournaments.'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map((tournament) => {
                  const spotsLeft = tournament.maxParticipants - tournament._count.registrations
                  const isFull = spotsLeft <= 0
                  const isPast = new Date(tournament.date) < new Date()
                  
                  return (
                    <Card key={tournament.id} className="glass-panel overflow-hidden">
                      {/* Game Banner */}
                      <div className={`h-2 ${getGameColor(tournament.game)}`}></div>
                      
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className={getGameColor(tournament.game)}>
                            {getGameLabel(tournament.game)}
                          </Badge>
                          {tournament.isRegistered && (
                            <Badge className="bg-green-500">Registered</Badge>
                          )}
                        </div>

                        <h3 className="font-bold text-lg mb-2">{tournament.title}</h3>
                        
                        {tournament.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {tournament.description}
                          </p>
                        )}

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-gray-400 text-lg">store</span>
                            <span>{tournament.shop.name}</span>
                            {tournament.shop.city && (
                              <span className="text-gray-500">• {tournament.shop.city}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-gray-400 text-lg">calendar_month</span>
                            {new Date(tournament.date).toLocaleDateString('it-IT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })} at {tournament.time}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="material-symbols-outlined text-gray-400 text-lg">group</span>
                            <span className={isFull ? 'text-red-500' : ''}>
                              {tournament._count.registrations} / {tournament.maxParticipants}
                              {isFull ? ' (Full)' : ` (${spotsLeft} spots left)`}
                            </span>
                          </div>
                          {tournament.entryFee && tournament.entryFee > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="material-symbols-outlined text-gray-400 text-lg">payments</span>
                              €{tournament.entryFee.toFixed(2)} entry
                            </div>
                          )}
                        </div>

                        {tournament.prizePool && (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              <span className="material-symbols-outlined text-lg">trophy</span>
                              Prizes
                            </div>
                            <p className="text-sm mt-1">{tournament.prizePool}</p>
                          </div>
                        )}

                        {/* Action Button */}
                        {isPast ? (
                          <Button variant="outline" className="w-full" disabled>
                            Tournament Ended
                          </Button>
                        ) : tournament.isRegistered ? (
                          <Button
                            variant="outline"
                            className="w-full text-red-500 border-red-500 hover:bg-red-500/10"
                            onClick={() => handleUnregister(tournament.id)}
                            disabled={registering === tournament.id}
                          >
                            {registering === tournament.id ? 'Processing...' : 'Unregister'}
                          </Button>
                        ) : isFull ? (
                          <Button variant="outline" className="w-full" disabled>
                            Tournament Full
                          </Button>
                        ) : (
                          <Button
                            className="w-full bg-primary hover:bg-primary-dark"
                            onClick={() => handleRegister(tournament.id)}
                            disabled={registering === tournament.id}
                          >
                            {registering === tournament.id ? 'Registering...' : 'Register Now'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
