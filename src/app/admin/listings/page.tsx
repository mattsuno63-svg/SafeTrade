'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  description: string | null
  price: number | null
  condition: string
  game: string
  images: string[]
  isApproved: boolean
  approvalNotes: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminListingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedListing, setSelectedListing] = useState<string | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchListings()
    }
  }, [user, userLoading, router, filter])

  const fetchListings = async () => {
    try {
      const res = await fetch(`/api/admin/listings?filter=${filter}`)
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setListings(data)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (listingId: string, approved: boolean) => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isApproved: approved,
          approvalNotes: approvalNotes || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update listing')
      }

      toast({
        title: 'Success',
        description: approved ? 'Listing approved' : 'Listing rejected',
      })

      setApprovalNotes('')
      setSelectedListing(null)
      fetchListings()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredListings = listings.filter((listing) => {
    if (filter === 'PENDING') return !listing.isApproved
    if (filter === 'APPROVED') return listing.isApproved
    return true
  })

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
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Listing Moderation</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and approve listings before they go live
              </p>
            </div>
            <Link href="/admin">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {(['ALL', 'PENDING', 'APPROVED'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className={filter === f ? 'bg-primary' : ''}
              >
                {f} ({f === 'ALL' ? listings.length : filteredListings.length})
              </Button>
            ))}
          </div>

          {/* Listings */}
          {filteredListings.length === 0 ? (
            <Card className="glass-panel p-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">
                inventory_2
              </span>
              <p className="text-gray-600 dark:text-gray-400">
                No listings found
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredListings.map((listing) => (
                <Card key={listing.id} className="glass-panel p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Listing Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold mb-2">{listing.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={listing.isApproved ? 'default' : 'secondary'}>
                              {listing.isApproved ? 'Approved' : 'Pending'}
                            </Badge>
                            <Badge>{listing.game}</Badge>
                            <Badge>{listing.condition}</Badge>
                            {listing.price && (
                              <Badge className="bg-green-500">€{listing.price.toFixed(2)}</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {listing.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          {listing.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                        <span>Seller: {listing.user.name || listing.user.email}</span>
                        <span>•</span>
                        <span>Created: {new Date(listing.createdAt).toLocaleDateString()}</span>
                      </div>

                      {listing.images.length > 0 && (
                        <div className="flex gap-2 mb-4">
                          {listing.images.slice(0, 3).map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`${listing.title} ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}

                      <Link href={`/listings/${listing.id}`} target="_blank">
                        <Button variant="outline" size="sm">
                          View Listing
                        </Button>
                      </Link>
                    </div>

                    {/* Approval Panel */}
                    {!listing.isApproved && (
                      <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                        <h4 className="font-bold mb-3">Review Listing</h4>
                        <Textarea
                          placeholder="Add approval notes (optional)..."
                          value={selectedListing === listing.id ? approvalNotes : ''}
                          onChange={(e) => {
                            setSelectedListing(listing.id)
                            setApprovalNotes(e.target.value)
                          }}
                          className="mb-3"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                            onClick={() => handleApproval(listing.id, false)}
                            disabled={processing}
                          >
                            Reject
                          </Button>
                          <Button
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            onClick={() => handleApproval(listing.id, true)}
                            disabled={processing}
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    )}

                    {listing.isApproved && listing.approvalNotes && (
                      <div className="w-full lg:w-80 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                        <h4 className="font-bold mb-2 text-green-600 dark:text-green-400">Approved</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {listing.approvalNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

