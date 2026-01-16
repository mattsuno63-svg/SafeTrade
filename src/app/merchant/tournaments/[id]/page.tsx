'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

const GAMES = [
  { value: 'POKEMON', label: 'Pokémon TCG' },
  { value: 'MAGIC', label: 'Magic: The Gathering' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'ONEPIECE', label: 'One Piece TCG' },
  { value: 'DIGIMON', label: 'Digimon TCG' },
  { value: 'OTHER', label: 'Other' },
]

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
  rules?: string
  status: 'DRAFT' | 'PUBLISHED' | 'REGISTRATION_CLOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  winners?: string
  registrations: Array<{
    id: string
    user: {
      id: string
      name: string
      email: string
    }
    status: string
  }>
  _count: {
    registrations: number
  }
}

export default function TournamentDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [winners, setWinners] = useState('')
  const [prizes, setPrizes] = useState('')
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: 'POKEMON',
    date: '',
    time: '',
    maxParticipants: 16,
    entryFee: 0,
    prizePool: '',
    rules: '',
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user && params.id) {
      fetchTournament()
    }
  }, [user, userLoading, params.id, router])

  const fetchTournament = async () => {
    try {
      const res = await fetch(`/api/merchant/tournaments/${params.id}`)
      if (!res.ok) throw new Error('Failed to fetch tournament')
      const data = await res.json()
      setTournament(data)
      setFormData({
        title: data.title,
        description: data.description || '',
        game: data.game,
        date: new Date(data.date).toISOString().split('T')[0],
        time: data.time,
        maxParticipants: data.maxParticipants,
        entryFee: data.entryFee || 0,
        prizePool: data.prizePool || '',
        rules: data.rules || '',
      })
      setWinners(data.winners || '')
      setPrizes(data.prizePool || '')
    } catch (error) {
      console.error('Error fetching tournament:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tournament details',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string, silent: boolean = false) => {
    try {
      const res = await fetch(`/api/merchant/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Failed to update tournament')

      if (!silent) {
        toast({
          title: 'Tournament Updated',
          description: `Status changed to ${newStatus.toLowerCase().replace('_', ' ')}`,
        })
      }

      fetchTournament()
    } catch (error: any) {
      if (!silent) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    }
  }


  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/merchant/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to update tournament')

      toast({
        title: 'Tournament Updated',
        description: 'Changes saved successfully',
      })

      setIsEditing(false)
      fetchTournament()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/merchant/tournaments/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          winners: winners.trim() || null,
          prizePool: prizes.trim() || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to complete tournament')

      toast({
        title: 'Tournament Completed',
        description: 'Torneo completato con successo!',
      })

      setShowCompleteModal(false)
      fetchTournament()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <Card className="glass-panel p-8 text-center">
            <h2 className="text-xl font-bold mb-2">Tournament not found</h2>
            <Button onClick={() => router.push('/merchant/tournaments')} className="mt-4">
              Back to Tournaments
            </Button>
          </Card>
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
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.push('/merchant/tournaments')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Back to Tournaments
              </button>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{tournament.title}</h1>
                    {getStatusBadge(tournament.status)}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {getGameLabel(tournament.game)}
                  </p>
                </div>
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={tournament.status === 'COMPLETED' || tournament.status === 'CANCELLED'}
                  >
                    <span className="material-symbols-outlined mr-2">edit</span>
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {isEditing ? (
              <Card className="glass-panel p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Edit Tournament</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Tournament Name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-12 mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="game">Game *</Label>
                      <select
                        id="game"
                        value={formData.game}
                        onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                        className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mt-1"
                        required
                      >
                        {GAMES.map((game) => (
                          <option key={game.value} value={game.value}>
                            {game.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="maxParticipants">Max Participants *</Label>
                      <Input
                        id="maxParticipants"
                        type="number"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) || 8 })}
                        className="h-12 mt-1"
                        min={2}
                        max={256}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="h-12 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="time">Start Time *</Label>
                      <Input
                        id="time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="h-12 mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="entryFee">Entry Fee (€)</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      step="0.01"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) || 0 })}
                      className="h-12 mt-1"
                      min={0}
                    />
                  </div>

                  <div>
                    <Label htmlFor="prizePool">Prize Pool Description</Label>
                    <Textarea
                      id="prizePool"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                      className="mt-1"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="rules">Tournament Rules</Label>
                    <Textarea
                      id="rules"
                      value={formData.rules}
                      onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setIsEditing(false)
                      fetchTournament()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary-dark"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                {/* Tournament Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="glass-panel p-6">
                    <h3 className="font-bold text-lg mb-4">Tournament Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">calendar_month</span>
                        <span>
                          {new Date(tournament.date).toLocaleDateString('it-IT', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">schedule</span>
                        <span>{tournament.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">group</span>
                        <span>
                          {tournament._count.registrations} / {tournament.maxParticipants} participants
                        </span>
                      </div>
                      {tournament.entryFee && tournament.entryFee > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400">payments</span>
                          <span>€{tournament.entryFee.toFixed(2)} entry fee</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  <Card className="glass-panel p-6">
                    <h3 className="font-bold text-lg mb-4">Actions</h3>
                    <div className="space-y-2">
                      {tournament.status === 'DRAFT' && (
                        <Button
                          onClick={() => handleStatusChange('PUBLISHED')}
                          className="w-full bg-green-500 hover:bg-green-600"
                        >
                          <span className="material-symbols-outlined mr-2">publish</span>
                          Publish Tournament
                        </Button>
                      )}
                      {tournament.status === 'PUBLISHED' && (
                        <Button
                          onClick={() => handleStatusChange('IN_PROGRESS')}
                          className="w-full bg-blue-500 hover:bg-blue-600"
                        >
                          <span className="material-symbols-outlined mr-2">play_arrow</span>
                          Avvia Torneo
                        </Button>
                      )}
                      {tournament.status === 'IN_PROGRESS' && (
                        <Button
                          onClick={() => {
                            setWinners(tournament.winners || '')
                            setPrizes(tournament.prizePool || '')
                            setShowCompleteModal(true)
                          }}
                          className="w-full bg-purple-500 hover:bg-purple-600"
                        >
                          <span className="material-symbols-outlined mr-2">check_circle</span>
                          Fine Torneo
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Description */}
                {tournament.description && (
                  <Card className="glass-panel p-6 mb-6">
                    <h3 className="font-bold text-lg mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {tournament.description}
                    </p>
                  </Card>
                )}

                {/* Prize Pool */}
                {tournament.prizePool && (
                  <Card className="glass-panel p-6 mb-6">
                    <h3 className="font-bold text-lg mb-2">Prize Pool</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {tournament.prizePool}
                    </p>
                  </Card>
                )}

                {/* Rules */}
                {tournament.rules && (
                  <Card className="glass-panel p-6 mb-6">
                    <h3 className="font-bold text-lg mb-2">Tournament Rules</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {tournament.rules}
                    </p>
                  </Card>
                )}

                {/* Winners */}
                {tournament.winners && (
                  <Card className="glass-panel p-6 mb-6 border-2 border-yellow-500">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
                      Winners
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {tournament.winners}
                    </p>
                  </Card>
                )}

                {/* Participants */}
                <Card className="glass-panel p-6">
                  <h3 className="font-bold text-lg mb-4">Participants ({tournament._count.registrations})</h3>
                  {tournament.registrations.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No participants yet</p>
                  ) : (
                    <div className="space-y-2">
                      {tournament.registrations.map((registration) => (
                        <div
                          key={registration.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{registration.user.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {registration.user.email}
                            </p>
                          </div>
                          <Badge
                            className={
                              registration.status === 'CONFIRMED'
                                ? 'bg-green-500'
                                : registration.status === 'WAITLIST'
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                            }
                          >
                            {registration.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* Complete Tournament Modal */}
            {showCompleteModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <Card className="glass-panel p-6 max-w-lg w-full mx-4">
                  <h3 className="font-bold text-lg mb-4">Fine Torneo</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Tutti i partecipanti hanno concluso il torneo? Inserisci i vincitori e i premi (opzionale).
                  </p>
                  
                  <div className="space-y-4 mb-4">
                    <div>
                      <Label htmlFor="winners">Vincitori (opzionale)</Label>
                      <Textarea
                        id="winners"
                        value={winners}
                        onChange={(e) => setWinners(e.target.value)}
                        placeholder="es. 1°: Mario Rossi (@mario_rossi), 2°: Luigi Bianchi (@luigi_b), 3°: Paolo Verdi (@paolo_v)"
                        className="mt-1"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Inserisci nome o nickname dei vincitori. Puoi lasciare vuoto se preferisci.
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="prizes">Premi Assegnati (opzionale)</Label>
                      <Textarea
                        id="prizes"
                        value={prizes}
                        onChange={(e) => setPrizes(e.target.value)}
                        placeholder="es. 1°: Booster Box, 2°: 3 Booster Packs, 3°: 1 Booster Pack"
                        className="mt-1"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Descrivi i premi effettivamente assegnati. Puoi lasciare vuoto se preferisci.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowCompleteModal(false)
                        setWinners(tournament.winners || '')
                        setPrizes(tournament.prizePool || '')
                      }}
                    >
                      Annulla
                    </Button>
                    <Button
                      className="flex-1 bg-purple-500 hover:bg-purple-600"
                      onClick={handleComplete}
                      disabled={saving}
                    >
                      {saving ? 'Completando...' : 'Completa Torneo'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

