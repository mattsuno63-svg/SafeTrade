'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Listing {
  id: string
  title: string
  price: number | null
  images: string[]
  game: string
}

const TIERS = [
  {
    id: 'BASIC',
    name: 'Basic',
    price: 2.99,
    duration: '3 days',
    features: [
      'Featured in homepage carousel',
      'Priority in search results',
      'Featured badge on listing',
    ],
  },
  {
    id: 'PREMIUM',
    name: 'Premium',
    price: 7.99,
    duration: '7 days',
    features: [
      'All Basic features',
      'Top position in category',
      'Push notifications to interested buyers',
      'Highlighted border effect',
    ],
    recommended: true,
  },
]

export default function PromoteListingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState('PREMIUM')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchListing()
    }
  }, [user, userLoading, router, id])

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/listings/${id}`)
      if (res.ok) {
        const data = await res.json()
        setListing(data)
      } else {
        toast({
          title: 'Error',
          description: 'Listing not found',
          variant: 'destructive',
        })
        router.push('/dashboard/listings')
      }
    } catch (error) {
      console.error('Error fetching listing:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromote = async () => {
    if (!listing) return
    
    setProcessing(true)
    try {
      const res = await fetch('/api/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          tier: selectedTier,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to promote listing')
      }

      toast({
        title: 'Listing Promoted! 🎉',
        description: 'Your listing is now featured and will reach more buyers.',
      })

      router.push('/dashboard/listings')
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

  if (!listing) return null

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to listings
            </button>

            <div className="text-center mb-8">
              <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
                rocket_launch
              </span>
              <h1 className="text-3xl font-bold mb-2">Boost Your Listing</h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                Get more visibility and sell faster with a featured listing
              </p>
            </div>

            {/* Listing Preview */}
            <Card className="glass-panel p-6 mb-8">
              <div className="flex gap-4 items-center">
                {listing.images[0] && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={listing.images[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-primary mb-1">{listing.game}</div>
                  <h3 className="font-bold text-lg">{listing.title}</h3>
                  {listing.price && (
                    <p className="text-xl font-bold text-primary">€{listing.price.toFixed(2)}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Tier Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {TIERS.map(tier => (
                <Card
                  key={tier.id}
                  className={`glass-panel p-6 cursor-pointer transition-all relative ${
                    selectedTier === tier.id 
                      ? 'ring-2 ring-primary shadow-lg' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTier(tier.id)}
                >
                  {tier.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedTier === tier.id 
                        ? 'border-primary bg-primary' 
                        : 'border-gray-300'
                    }`}>
                      {selectedTier === tier.id && (
                        <span className="material-symbols-outlined text-white text-sm">check</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">€{tier.price.toFixed(2)}</span>
                    <span className="text-gray-500 ml-2">/ {tier.duration}</span>
                  </div>

                  <ul className="space-y-2">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>

            {/* Action */}
            <Card className="glass-panel p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-3xl font-bold">
                    €{TIERS.find(t => t.id === selectedTier)?.price.toFixed(2)}
                  </p>
                </div>
                <Button
                  onClick={handlePromote}
                  disabled={processing}
                  className="h-14 px-8 bg-primary hover:bg-primary-dark text-lg font-bold"
                >
                  {processing ? 'Processing...' : 'Boost Now'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4 text-center">
                * In demo mode, no actual payment is processed. In production, this would connect to Stripe.
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

