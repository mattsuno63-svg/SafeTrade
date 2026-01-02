'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function VLSAppointmentsPage() {
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'completed'>('today')

  // Mock appointments - da sostituire con API call
  const appointments = [
    {
      id: '1',
      user: {
        name: 'Mario Rossi',
        email: 'mario@example.com',
      },
      transaction: {
        type: 'Trade',
        items: ['Charizard VMAX', 'Pikachu VMAX'],
      },
      date: '2024-10-24',
      time: '14:00',
      status: 'scheduled',
    },
    {
      id: '2',
      user: {
        name: 'Luigi Verdi',
        email: 'luigi@example.com',
      },
      transaction: {
        type: 'Sale',
        amount: 95.00,
      },
      date: '2024-10-24',
      time: '15:30',
      status: 'in-progress',
    },
  ]

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      <Header />

      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Appointments</h1>
            <p className="text-white/70">Manage SafeTrade appointments at your store</p>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            {(['all', 'today', 'upcoming', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  filter === f
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {appointments.map((apt) => (
              <Card key={apt.id} className="glass-panel p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <h3 className="text-xl font-bold">{apt.user.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        apt.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                        apt.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="material-symbols-outlined text-sm">calendar_month</span>
                        <span>{apt.date} at {apt.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70">
                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                        <span>
                          {apt.transaction.type}
                          {apt.transaction.type === 'Sale' && ` • €${apt.transaction.amount}`}
                          {apt.transaction.type === 'Trade' && ` • ${apt.transaction.items.join(', ')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === 'scheduled' && (
                      <Button size="sm" className="bg-primary hover:bg-primary-dark">
                        Start Verification
                      </Button>
                    )}
                    {apt.status === 'in-progress' && (
                      <Button size="sm" variant="outline" className="border-white/10">
                        Complete
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="border-white/10">
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

