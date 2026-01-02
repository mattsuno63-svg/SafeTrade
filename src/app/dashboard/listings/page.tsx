'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Listing {
  id: string
  title: string
  description: string | null
  price: number | null
  type: 'SALE' | 'TRADE' | 'BOTH'
  condition: string
  game: string
  images: string[]
  isActive: boolean
  createdAt: string
  _count?: {
    proposals: number
  }
}

export default function MyListingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    if (user) {
      fetchListings()
    }
  }, [user, userLoading, router])

  const fetchListings = async () => {
    try {
      const res = await fetch('/api/listings/my')
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your listings',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (listingId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (!res.ok) {
        throw new Error('Failed to update listing')
      }

      toast({
        title: 'Success',
        description: isActive ? 'Listing deactivated' : 'Listing activated',
      })

      fetchListings()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update listing',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return

    try {
      const res = await fetch(`/api/listings/${listingId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete listing')
      }

      toast({
        title: 'Success',
        description: 'Listing deleted',
      })

      fetchListings()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      })
    }
  }

  const filteredListings = listings.filter((listing) => {
    if (filter === 'active') return listing.isActive
    if (filter === 'inactive') return !listing.isActive
    return true
  })

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      MINT: 'bg-green-500',
      NEAR_MINT: 'bg-green-400',
      EXCELLENT: 'bg-blue-500',
      GOOD: 'bg-yellow-500',
      PLAYED: 'bg-orange-500',
      POOR: 'bg-red-500',
    }
    return colors[condition] || 'bg-gray-500'
  }

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">My Listings</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your card listings
                </p>
              </div>
              <Link href="/sell">
                <Button className="bg-primary hover:bg-primary-dark">
                  <span className="material-symbols-outlined mr-2">add</span>
                  Create Listing
                </Button>
              </Link>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    filter === f
                      ? 'bg-primary text-white'
                      : 'bg-white/50 dark:bg-white/5 hover:bg-primary/10'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f === 'all' && ` (${listings.length})`}
                  {f === 'active' && ` (${listings.filter(l => l.isActive).length})`}
                  {f === 'inactive' && ` (${listings.filter(l => !l.isActive).length})`}
                </button>
              ))}
            </div>

            {/* Listings */}
            {filteredListings.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                  inventory_2
                </span>
                <h2 className="text-2xl font-bold mb-2">No Listings</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {filter === 'all' 
                    ? "You haven't created any listings yet."
                    : `No ${filter} listings found.`}
                </p>
                <Link href="/sell">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Create Your First Listing
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredListings.map((listing) => (
                  <Card key={listing.id} className="glass-panel overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
                        {listing.images[0] ? (
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                              image
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-xl font-bold">{listing.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                listing.isActive 
                                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                  : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                              }`}>
                                {listing.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {listing.game} • {listing.condition.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            {listing.price ? (
                              <p className="text-2xl font-bold text-primary">
                                €{listing.price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <span className="text-sm text-gray-500">Trade Only</span>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(listing.createdAt).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-6 mb-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-gray-400">handshake</span>
                            <span>{listing._count?.proposals || 0} proposals</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${getConditionColor(listing.condition)}`}></span>
                            <span>{listing.condition.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              listing.type === 'SALE' ? 'bg-green-500/20 text-green-600' :
                              listing.type === 'TRADE' ? 'bg-blue-500/20 text-blue-600' :
                              'bg-purple-500/20 text-purple-600'
                            }`}>
                              {listing.type}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/listings/${listing.id}`}>
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined mr-1 text-sm">visibility</span>
                              View
                            </Button>
                          </Link>
                          <Link href={`/dashboard/listings/${listing.id}/promote`}>
                            <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/10">
                              <span className="material-symbols-outlined mr-1 text-sm">rocket_launch</span>
                              Boost
                            </Button>
                          </Link>
                          <Link href={`/listings/${listing.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <span className="material-symbols-outlined mr-1 text-sm">edit</span>
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(listing.id, listing.isActive)}
                          >
                            <span className="material-symbols-outlined mr-1 text-sm">
                              {listing.isActive ? 'visibility_off' : 'visibility'}
                            </span>
                            {listing.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(listing.id)}
                            className="border-red-500 text-red-500 hover:bg-red-500/10"
                          >
                            <span className="material-symbols-outlined mr-1 text-sm">delete</span>
                            Delete
                          </Button>
                        </div>
                      </div>
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

