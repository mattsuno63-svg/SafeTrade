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
  status: 'DRAFT' | 'PUBLISHED' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  _count: {
    registrations: number
  }
}

export default function MerchantTournamentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchTournaments()
    }
  }, [user, userLoading, router])

  const fetchTournaments = async () => {
    try {
      const res = await fetch('/api/merchant/tournaments')
      if (!res.ok) throw new Error('Failed to fetch tournaments')
      const data = await res.json()
      setTournaments(data)
    } catch (error) {
      console.error('Error fetching tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (tournamentId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/merchant/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update tournament')

      toast({
        title: 'Tournament Updated',
        description: `Status changed to ${newStatus.toLowerCase().replace('_', ' ')}`,
      })

      fetchTournaments()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-500',
      PUBLISHED: 'bg-green-500',
      REGISTRATION_CLOSED: 'bg-yellow-500',
      IN_PROGRESS: 'bg-blue-500',
      COMPLETED: 'bg-purple-500',
      CANCELLED: 'bg-red-500',
    }
    return (
      <Badge className={styles[status] || 'bg-gray-500'}>
        {status.toLowerCase().replace('_', ' ')}
      </Badge>
    )
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Tournaments</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Organize and manage tournaments at your store
                </p>
              </div>
              <Link href="/merchant/tournaments/new">
                <Button className="bg-primary hover:bg-primary-dark">
                  <span className="material-symbols-outlined mr-2">add</span>
                  Create Tournament
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {tournaments.filter(t => t.status === 'PUBLISHED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {tournaments.filter(t => t.status === 'IN_PROGRESS').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">In Progress</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold text-purple-500">
                  {tournaments.filter(t => t.status === 'COMPLETED').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
              </Card>
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold">
                  {tournaments.reduce((acc, t) => acc + t._count.registrations, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Participants</div>
              </Card>
            </div>

            {/* Tournaments List */}
            {tournaments.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  emoji_events
                </span>
                <h3 className="text-xl font-bold mb-2">No tournaments yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create your first tournament to engage with your community.
                </p>
                <Link href="/merchant/tournaments/new">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Create Tournament
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tournaments.map((tournament) => (
                  <Card key={tournament.id} className="glass-panel p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{tournament.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getGameLabel(tournament.game)}
                        </p>
                      </div>
                      {getStatusBadge(tournament.status)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-gray-400">calendar_month</span>
                        {new Date(tournament.date).toLocaleDateString('it-IT', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-gray-400">schedule</span>
                        {tournament.time}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-gray-400">group</span>
                        {tournament._count.registrations} / {tournament.maxParticipants} participants
                      </div>
                      {tournament.entryFee && tournament.entryFee > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="material-symbols-outlined text-gray-400">payments</span>
                          €{tournament.entryFee.toFixed(2)} entry fee
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (tournament._count.registrations / tournament.maxParticipants) * 100)}%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/merchant/tournaments/${tournament.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          View Details
                        </Button>
                      </Link>
                      {tournament.status === 'DRAFT' && (
                        <Button
                          onClick={() => handleStatusChange(tournament.id, 'PUBLISHED')}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          Publish
                        </Button>
                      )}
                      {tournament.status === 'PUBLISHED' && (
                        <Button
                          onClick={() => handleStatusChange(tournament.id, 'IN_PROGRESS')}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          Start
                        </Button>
                      )}
                      {tournament.status === 'IN_PROGRESS' && (
                        <Button
                          onClick={() => handleStatusChange(tournament.id, 'COMPLETED')}
                          className="bg-purple-500 hover:bg-purple-600"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

