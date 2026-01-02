'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import Link from 'next/link'

interface Listing {
  id: string
  title: string
  price: number | null
  type: 'SALE' | 'TRADE' | 'BOTH'
  condition: string
  game: string
  set: string | null
  images: string[]
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function ProposePage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state
  const [proposalType, setProposalType] = useState<'SALE' | 'TRADE'>('SALE')
  const [offerPrice, setOfferPrice] = useState('')
  const [tradeItems, setTradeItems] = useState('')
  const [message, setMessage] = useState('')
  const [feePaidBy, setFeePaidBy] = useState<'SELLER' | 'BUYER' | 'SPLIT'>('SELLER')

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`)
        if (res.ok) {
          const data = await res.json()
          setListing(data)
          
          // Set default proposal type based on listing type
          if (data.type === 'TRADE') {
            setProposalType('TRADE')
          } else {
            setProposalType('SALE')
          }
          
          // Set default offer price if listing has a price
          if (data.price) {
            setOfferPrice(data.price.toString())
          }
        } else {
          toast({
            title: 'Error',
            description: 'Listing not found',
            variant: 'destructive',
          })
          router.push('/marketplace')
        }
      } catch (error) {
        console.error('Error fetching listing:', error)
        toast({
          title: 'Error',
          description: 'Failed to load listing',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [id, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to make a proposal',
        variant: 'destructive',
      })
      router.push('/login')
      return
    }

    if (listing?.user.id === user.id) {
      toast({
        title: 'Error',
        description: 'You cannot make a proposal on your own listing',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: id,
          type: proposalType,
          offerPrice: proposalType === 'SALE' ? parseFloat(offerPrice) : null,
          tradeItems: proposalType === 'TRADE' ? tradeItems : null,
          message: message || null,
          feePaidBy,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit proposal')
      }

      toast({
        title: 'Proposal Sent! 🎉',
        description: 'The seller will be notified and can accept or reject your proposal.',
      })

      router.push('/dashboard/proposals/sent')
    } catch (error: any) {
      console.error('Error submitting proposal:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit proposal',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Listing not found</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-lg">You must be logged in to make a proposal</p>
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary-dark">
              Log In
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to listing
            </button>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Make a Proposal</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Listing Preview */}
                <div className="flex gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl mb-6">
                  {listing.images[0] && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-primary mb-1">{listing.game}</div>
                    <h3 className="font-bold text-lg truncate">{listing.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {listing.set} • {listing.condition}
                    </p>
                    {listing.price && (
                      <p className="text-xl font-bold text-primary mt-1">
                        €{listing.price.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Proposal Type */}
                  {listing.type === 'BOTH' && (
                    <div className="space-y-2">
                      <Label>Proposal Type</Label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setProposalType('SALE')}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                            proposalType === 'SALE'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <span className="material-symbols-outlined block mb-1">payments</span>
                          <span className="font-bold">Buy</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProposalType('TRADE')}
                          className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                            proposalType === 'TRADE'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <span className="material-symbols-outlined block mb-1">swap_horiz</span>
                          <span className="font-bold">Trade</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Offer Price (for SALE) */}
                  {(proposalType === 'SALE' || listing.type === 'SALE') && (
                    <div className="space-y-2">
                      <Label htmlFor="offerPrice">Your Offer Price (€)</Label>
                      <Input
                        id="offerPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Enter your offer"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        className="h-12"
                        required={proposalType === 'SALE'}
                      />
                      {listing.price && (
                        <p className="text-sm text-gray-500">
                          Listed price: €{listing.price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Trade Items (for TRADE) */}
                  {(proposalType === 'TRADE' || listing.type === 'TRADE') && (
                    <div className="space-y-2">
                      <Label htmlFor="tradeItems">Cards/Items You're Offering</Label>
                      <Textarea
                        id="tradeItems"
                        placeholder="Describe the cards or items you want to trade (e.g., Pikachu VMAX, Charizard GX, etc.)"
                        value={tradeItems}
                        onChange={(e) => setTradeItems(e.target.value)}
                        className="min-h-[100px]"
                        required={proposalType === 'TRADE'}
                      />
                    </div>
                  )}

                  {/* Fee Payment Selection - SOLO per SALE */}
                  {(proposalType === 'SALE' || listing.type === 'SALE') && offerPrice && (
                    <div className="space-y-3">
                      <Label>💰 Chi paga la commissione SafeTrade (5%)?</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Il venditore vedrà questa scelta nella notifica e potrà accettare o rifiutare
                      </p>
                      <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setFeePaidBy('SELLER')}
                          className={`p-4 rounded-xl text-left transition-all border-2 ${
                            feePaidBy === 'SELLER'
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined">person</span>
                            <span className="font-bold">Pagata dal venditore</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tu paghi: €{parseFloat(offerPrice).toFixed(2)} • 
                            Venditore riceve: €{(parseFloat(offerPrice) * 0.95).toFixed(2)}
                          </p>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => setFeePaidBy('BUYER')}
                          className={`p-4 rounded-xl text-left transition-all border-2 ${
                            feePaidBy === 'BUYER'
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined">shopping_cart</span>
                            <span className="font-bold">Pagata dall'acquirente (tu)</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tu paghi: €{(parseFloat(offerPrice) * 1.05).toFixed(2)} • 
                            Venditore riceve: €{parseFloat(offerPrice).toFixed(2)}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFeePaidBy('SPLIT')}
                          className={`p-4 rounded-xl text-left transition-all border-2 ${
                            feePaidBy === 'SPLIT'
                              ? 'border-primary bg-primary/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined">balance</span>
                            <span className="font-bold">Dividi le spese (50/50)</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tu paghi: €{(parseFloat(offerPrice) + (parseFloat(offerPrice) * 0.05 / 2)).toFixed(2)} • 
                            Venditore riceve: €{(parseFloat(offerPrice) - (parseFloat(offerPrice) * 0.05 / 2)).toFixed(2)}
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Add a personal message to the seller..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* SafeTrade Info */}
                  <div className="p-4 bg-primary/10 rounded-xl">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary">verified_user</span>
                      <div>
                        <h4 className="font-bold text-primary">SafeTrade Protection</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          If accepted, you'll meet at a verified partner store to complete the transaction safely.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-14 bg-primary hover:bg-primary-dark text-lg font-bold"
                    disabled={submitting}
                  >
                    {submitting ? 'Sending...' : 'Send Proposal'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

