'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { it } from 'date-fns/locale'

interface Event {
  id: string
  title: string
  description: string
  type: string
  game: string | null
  date: string
  time: string | null
  location: string | null
  isOnline: boolean
  maxParticipants: number | null
  entryFee: number | null
  isPremiumOnly: boolean
  registeredCount: number
  isRegistered: boolean
  registrationStatus: string | null
  isFull: boolean
  isLocked: boolean
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  TOURNAMENT: 'bg-blue-500',
  MEETUP: 'bg-green-500',
  RELEASE_PARTY: 'bg-purple-500',
  TRADE_NIGHT: 'bg-orange-500',
  PREMIUM_EVENT: 'bg-gradient-to-r from-yellow-500 to-orange-500',
  OTHER: 'bg-gray-500',
}

const EVENT_TYPE_ICONS: Record<string, string> = {
  TOURNAMENT: 'emoji_events',
  MEETUP: 'groups',
  RELEASE_PARTY: 'celebration',
  TRADE_NIGHT: 'swap_horiz',
  PREMIUM_EVENT: 'workspace_premium',
  OTHER: 'event',
}

export default function EventsPage() {
  const { user } = useUser()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  // Fetch events
  const { data, isLoading } = useQuery({
    queryKey: ['events', format(currentMonth, 'yyyy-MM'), selectedType, selectedGame],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: format(currentMonth, 'yyyy-MM'),
      })
      if (selectedType) params.append('type', selectedType)
      if (selectedGame) params.append('game', selectedGame)
      
      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json()
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to register')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: 'Successo!', description: 'Registrazione completata!' })
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' })
    },
  })

  // Cancel registration mutation
  const cancelMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to cancel')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      toast({ title: 'Info', description: 'Registrazione cancellata' })
    },
  })

  // Calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return (data?.events || []).filter((event: Event) => 
      isSameDay(new Date(event.date), day)
    )
  }

  const eventTypes = ['TOURNAMENT', 'MEETUP', 'RELEASE_PARTY', 'TRADE_NIGHT', 'PREMIUM_EVENT']
  const games = ['POKEMON', 'MAGIC', 'YUGIOH', 'ONEPIECE', 'DIGIMON']

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">
            <span className="material-symbols-outlined text-4xl mr-2 align-middle text-primary">calendar_month</span>
            Eventi & Tornei
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Scopri eventi, tornei e meetup nella tua zona
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-4">
            {/* Event Types */}
            <Card className="p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">filter_list</span>
                Tipo Evento
              </h3>
              <div className="space-y-2">
                <Button
                  variant={selectedType === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedType(null)}
                >
                  Tutti gli eventi
                </Button>
                {eventTypes.map(type => (
                  <Button
                    key={type}
                    variant={selectedType === type ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedType(type)}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${EVENT_TYPE_COLORS[type]}`} />
                    {type.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Games */}
            <Card className="p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">sports_esports</span>
                Gioco
              </h3>
              <div className="space-y-2">
                <Button
                  variant={selectedGame === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setSelectedGame(null)}
                >
                  Tutti i giochi
                </Button>
                {games.map(game => (
                  <Button
                    key={game}
                    variant={selectedGame === game ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedGame(game)}
                  >
                    {game}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Legend */}
            <Card className="p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold mb-3">Legenda</h3>
              <div className="space-y-2 text-sm">
                {eventTypes.map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${EVENT_TYPE_COLORS[type]}`} />
                    <span>{type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Calendar Header */}
            <Card className="p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <h2 className="text-xl font-bold">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </h2>
                <Button
                  variant="ghost"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month start */}
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24" />
                ))}

                {/* Calendar days */}
                {calendarDays.map(day => {
                  const dayEvents = getEventsForDay(day)
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-24 p-1 border rounded-lg ${
                        isToday(day) ? 'bg-primary/10 border-primary' : 'border-gray-200 dark:border-gray-700'
                      } ${!isSameMonth(day, currentMonth) ? 'opacity-50' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday(day) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-16">
                        {dayEvents.slice(0, 2).map((event: Event) => (
                          <div
                            key={event.id}
                            className={`text-xs px-1 py-0.5 rounded truncate text-white ${EVENT_TYPE_COLORS[event.type]}`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-gray-500">
                            +{dayEvents.length - 2} altri
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Events List */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">Prossimi Eventi</h3>
              
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))
              ) : (data?.events || []).length === 0 ? (
                <Card className="p-8 text-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
                  <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">event_busy</span>
                  <p className="text-gray-500">Nessun evento trovato per questo mese</p>
                </Card>
              ) : (
                (data?.events || []).map((event: Event) => (
                  <Card
                    key={event.id}
                    className={`p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-l-4 ${
                      EVENT_TYPE_COLORS[event.type].includes('gradient') 
                        ? 'border-l-orange-500' 
                        : EVENT_TYPE_COLORS[event.type].replace('bg-', 'border-l-')
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${EVENT_TYPE_COLORS[event.type]} text-white border-0`}>
                            <span className="material-symbols-outlined text-sm mr-1">
                              {EVENT_TYPE_ICONS[event.type]}
                            </span>
                            {event.type.replace('_', ' ')}
                          </Badge>
                          {event.game && (
                            <Badge variant="outline">{event.game}</Badge>
                          )}
                          {event.isPremiumOnly && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                              <span className="material-symbols-outlined text-sm mr-1">workspace_premium</span>
                              Premium
                            </Badge>
                          )}
                          {event.isLocked && (
                            <Badge variant="secondary">
                              <span className="material-symbols-outlined text-sm mr-1">lock</span>
                              Richiede Premium
                            </Badge>
                          )}
                        </div>

                        <h4 className="text-lg font-bold mb-1">{event.title}</h4>
                        {event.description && (
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-lg">calendar_today</span>
                            {format(new Date(event.date), 'dd MMMM yyyy', { locale: it })}
                          </div>
                          {event.time && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-lg">schedule</span>
                              {event.time}
                            </div>
                          )}
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-lg">
                                {event.isOnline ? 'videocam' : 'location_on'}
                              </span>
                              {event.isOnline ? 'Online' : event.location}
                            </div>
                          )}
                          {event.maxParticipants && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-lg">group</span>
                              {event.registeredCount}/{event.maxParticipants}
                            </div>
                          )}
                          {event.entryFee && (
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-lg">payments</span>
                              €{event.entryFee.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-4">
                        {event.isRegistered ? (
                          <Button
                            variant="outline"
                            onClick={() => cancelMutation.mutate(event.id)}
                            disabled={cancelMutation.isPending}
                          >
                            <span className="material-symbols-outlined mr-1">check_circle</span>
                            Iscritto
                          </Button>
                        ) : event.isLocked ? (
                          <Button variant="outline" disabled>
                            <span className="material-symbols-outlined mr-1">lock</span>
                            Premium
                          </Button>
                        ) : event.isFull ? (
                          <Button variant="outline" disabled>
                            Completo
                          </Button>
                        ) : (
                          <Button
                            onClick={() => {
                              if (!user) {
                                toast({ title: 'Errore', description: 'Devi essere loggato per iscriverti', variant: 'destructive' })
                                return
                              }
                              registerMutation.mutate(event.id)
                            }}
                            disabled={registerMutation.isPending}
                            className="bg-primary hover:bg-primary-dark"
                          >
                            Iscriviti
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

