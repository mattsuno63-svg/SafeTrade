'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
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

export default function NewTournamentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: 'POKEMON',
    date: '',
    time: '14:00',
    maxParticipants: 16,
    entryFee: 0,
    prizePool: '',
    rules: '',
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent, publish: boolean = false) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/merchant/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: publish ? 'PUBLISHED' : 'DRAFT',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create tournament')
      }

      toast({
        title: 'Tournament Created',
        description: publish 
          ? 'Your tournament is now live!' 
          : 'Your tournament has been saved as a draft.',
      })

      router.push('/merchant/tournaments')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create tournament',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (userLoading) {
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
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Back to Tournaments
              </button>
              <h1 className="text-3xl font-bold mb-2">Create Tournament</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Organize a new tournament at your store
              </p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)}>
              {/* Basic Info */}
              <Card className="glass-panel p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Tournament Name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Weekly Pokémon Tournament"
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
                      placeholder="Describe your tournament..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

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
                </div>
              </Card>

              {/* Date & Time */}
              <Card className="glass-panel p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Date & Time</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="h-12 mt-1"
                      min={new Date().toISOString().split('T')[0]}
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
              </Card>

              {/* Participants */}
              <Card className="glass-panel p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Participants</h3>
                
                <div className="grid grid-cols-2 gap-4">
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
                    <p className="text-xs text-gray-500 mt-1">
                      Common values: 8, 16, 32, 64
                    </p>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Leave 0 for free tournaments
                    </p>
                  </div>
                </div>
              </Card>

              {/* Prizes & Rules */}
              <Card className="glass-panel p-6 mb-6">
                <h3 className="font-bold text-lg mb-4">Prizes & Rules</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prizePool">Prize Pool Description</Label>
                    <Textarea
                      id="prizePool"
                      value={formData.prizePool}
                      onChange={(e) => setFormData({ ...formData, prizePool: e.target.value })}
                      placeholder="e.g., 1st: Booster Box, 2nd: 3 Booster Packs, 3rd-4th: 1 Booster Pack each"
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
                      placeholder="e.g., Standard format, Swiss rounds, best of 3..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-primary hover:bg-primary-dark"
                  disabled={saving}
                  onClick={(e) => handleSubmit(e as any, true)}
                >
                  {saving ? 'Creating...' : 'Create & Publish'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

