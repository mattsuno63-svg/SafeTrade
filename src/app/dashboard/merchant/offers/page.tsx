'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function MerchantOffersPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'completed'>('all')

  // Mock offers - da sostituire con API call
  const offers = [
    {
      id: '1',
      title: 'Charizard VMAX Flash Sale',
      product: 'Charizard VMAX',
      originalPrice: 120.00,
      offerPrice: 95.00,
      discount: 21,
      views: 142,
      clicks: 23,
      status: 'active',
    },
    {
      id: '2',
      title: 'Pikachu VMAX Special',
      product: 'Pikachu VMAX',
      originalPrice: 45.99,
      offerPrice: 39.99,
      discount: 13,
      views: 89,
      clicks: 12,
      status: 'active',
    },
  ]

  return (
    <div className="min-h-screen bg-background-dark text-white font-display">
      <Header />

      <main className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Offers Overview</h1>
              <p className="text-white/70">Manage your exclusive offers</p>
            </div>
            <Button className="bg-primary hover:bg-primary-dark" asChild>
              <a href="/dashboard/merchant/create-offer">Create New Offer</a>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-6">
            {(['all', 'active', 'pending', 'completed'] as const).map((f) => (
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="glass-panel p-6">
              <div className="text-white/70 text-sm mb-1">Total Offers</div>
              <div className="text-3xl font-bold">{offers.length}</div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="text-white/70 text-sm mb-1">Active</div>
              <div className="text-3xl font-bold text-green-400">
                {offers.filter(o => o.status === 'active').length}
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="text-white/70 text-sm mb-1">Total Views</div>
              <div className="text-3xl font-bold">
                {offers.reduce((sum, o) => sum + o.views, 0)}
              </div>
            </Card>
            <Card className="glass-panel p-6">
              <div className="text-white/70 text-sm mb-1">Conversion</div>
              <div className="text-3xl font-bold text-primary">
                {Math.round((offers.reduce((sum, o) => sum + o.clicks, 0) / offers.reduce((sum, o) => sum + o.views, 0)) * 100) || 0}%
              </div>
            </Card>
          </div>

          {/* Offers List */}
          <div className="space-y-4">
            {offers.map((offer) => (
              <Card key={offer.id} className="glass-panel p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold">{offer.title}</h3>
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs font-bold">
                        {offer.status}
                      </span>
                    </div>
                    <p className="text-white/70 mb-4">{offer.product}</p>
                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-white/70">Price: </span>
                        <span className="text-xl font-bold text-primary">€{offer.offerPrice}</span>
                        <span className="text-white/50 line-through ml-2">€{offer.originalPrice}</span>
                      </div>
                      <div>
                        <span className="text-white/70">Discount: </span>
                        <span className="font-bold text-red-400">-{offer.discount}%</span>
                      </div>
                      <div>
                        <span className="text-white/70">Views: </span>
                        <span className="font-bold">{offer.views}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-white/10">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="border-white/10">
                      View
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

