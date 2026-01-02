'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { formatPriceNumber } from '@/lib/utils'

interface Listing {
  id: string
  title: string
  description: string | null
  price: number | null
  type: 'SALE' | 'TRADE' | 'BOTH'
  condition: string
  game: string
  set: string | null
  cardNumber: string | null
  rarity: string | null
  language: string
  images: string[]
  wants: string | null
  isActive: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
    avatar: string | null
    role: string
  }
}

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useUser()
  
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  
  // 3D tilt effect state with smooth interpolation
  const cardRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const currentRotation = useRef({ x: 0, y: 0 })
  const targetRotation = useRef({ x: 0, y: 0 })
  
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
  })
  const [glareStyle, setGlareStyle] = useState({
    background: 'transparent',
    opacity: 0,
    transform: 'translateZ(1px)',
  })
  const [isHovering, setIsHovering] = useState(false)

  // Smooth animation loop
  useEffect(() => {
    const animate = () => {
      const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor
      const smoothFactor = isHovering ? 0.08 : 0.05
      
      currentRotation.current.x = lerp(currentRotation.current.x, targetRotation.current.x, smoothFactor)
      currentRotation.current.y = lerp(currentRotation.current.y, targetRotation.current.y, smoothFactor)
      
      const scale = isHovering ? 1.02 : 1
      
      setTiltStyle({
        transform: `perspective(1200px) rotateX(${currentRotation.current.x}deg) rotateY(${currentRotation.current.y}deg) scale3d(${scale}, ${scale}, ${scale})`,
      })
      
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isHovering])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Calculate rotation (max 10 degrees for elegant feel)
    targetRotation.current.x = ((y - centerY) / centerY) * -10
    targetRotation.current.y = ((x - centerX) / centerX) * 10
    
    // Calculate glare position with enhanced effect
    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    
    // Calculate angle for rainbow effect
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) + 90
    
    setGlareStyle({
      background: `
        radial-gradient(
          ellipse at ${glareX}% ${glareY}%, 
          rgba(255,255,255,0.8) 0%, 
          rgba(255,255,255,0.4) 20%,
          rgba(255,200,150,0.2) 40%,
          transparent 70%
        ),
        linear-gradient(
          ${angle}deg,
          transparent 0%,
          rgba(255,255,255,0.1) 45%,
          rgba(255,255,255,0.3) 50%,
          rgba(255,255,255,0.1) 55%,
          transparent 100%
        )
      `,
      opacity: 1,
      transform: 'translateZ(1px)',
    })
  }

  const handleMouseEnter = () => {
    setIsHovering(true)
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
    targetRotation.current = { x: 0, y: 0 }
    setGlareStyle({
      background: 'transparent',
      opacity: 0,
      transform: 'translateZ(1px)',
    })
  }

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`)
        if (res.ok) {
          const data = await res.json()
          setListing(data)
        } else if (res.status === 404) {
          toast({
            title: 'Not Found',
            description: 'This listing does not exist or has been removed.',
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

  const formatCondition = (condition: string) => {
    return condition.replace(/_/g, ' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="text-lg">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
            search_off
          </span>
          <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This listing may have been removed or doesn't exist.
          </p>
          <Link href="/marketplace">
            <Button className="bg-primary hover:bg-primary-dark">
              Browse Marketplace
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  const isOwner = user?.id === listing.user.id

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Back button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Back to marketplace
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Images with 3D Tilt Effect */}
              <div className="space-y-4">
                <div className="relative flex items-center justify-center min-h-[650px] lg:min-h-[750px]">
                  {/* Type Badge - Fixed position outside the animated card */}
                  <div className="absolute top-4 left-4 z-20">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg ${
                      listing.type === 'SALE' ? 'bg-green-500' :
                      listing.type === 'TRADE' ? 'bg-blue-500' :
                      'bg-purple-500'
                    }`}>
                      {listing.type === 'BOTH' ? 'SALE / TRADE' : listing.type}
                    </span>
                  </div>
                  
                  {listing.images[selectedImage] ? (
                    <div
                      ref={cardRef}
                      onMouseMove={handleMouseMove}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                      className="relative cursor-pointer will-change-transform"
                      style={{
                        ...tiltStyle,
                        transformStyle: 'preserve-3d',
                        transition: 'filter 0.3s ease',
                      }}
                    >
                      <img
                        src={listing.images[selectedImage]}
                        alt={listing.title}
                        className="w-auto h-auto min-w-[350px] max-w-[550px] lg:max-w-[650px] min-h-[500px] max-h-[700px] lg:max-h-[750px] object-contain rounded-xl"
                        style={{ 
                          filter: 'drop-shadow(0 35px 70px rgba(0,0,0,0.4)) drop-shadow(0 15px 30px rgba(0,0,0,0.25))',
                        }}
                      />
                      
                      {/* Holographic Glare Overlay - follows card shape */}
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-xl"
                        style={{
                          background: glareStyle.background,
                          opacity: glareStyle.opacity,
                          mixBlendMode: 'soft-light',
                          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                      {/* Secondary shine layer */}
                      <div 
                        className="absolute inset-0 pointer-events-none rounded-xl"
                        style={{
                          background: glareStyle.background,
                          opacity: glareStyle.opacity * 0.6,
                          mixBlendMode: 'overlay',
                          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
                      <span className="material-symbols-outlined text-6xl text-gray-400">
                        image
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Thumbnails */}
                {listing.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {listing.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedImage(i)}
                        className={`aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 transition-all ${
                          selectedImage === i 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img src={img} alt={`${listing.title} ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-6">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-primary mb-2">
                    <span>{listing.game}</span>
                    {listing.rarity && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{listing.rarity}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-2">{listing.title}</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    {listing.set && <span>{listing.set}</span>}
                    {listing.cardNumber && <span> • #{listing.cardNumber}</span>}
                    {listing.language && <span> • {listing.language}</span>}
                  </p>
                </div>

                {/* Price */}
                {listing.price && (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-text-primary dark:text-white" suppressHydrationWarning>
                      €{formatPriceNumber(listing.price)}
                    </span>
                  </div>
                )}

                {/* Quick Info */}
                <Card className="glass-panel p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Condition</span>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${getConditionColor(listing.condition)}`}></span>
                        <span className="font-bold">{formatCondition(listing.condition)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Listing Type</span>
                      <span className="font-bold">
                        {listing.type === 'SALE' ? 'For Sale' : 
                         listing.type === 'TRADE' ? 'For Trade' : 
                         'Sale or Trade'}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Listed</span>
                      <span className="font-bold">
                        {new Date(listing.createdAt).toLocaleDateString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Seller</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{listing.user.name || listing.user.email.split('@')[0]}</span>
                        {listing.user.role === 'MERCHANT' && (
                          <span className="material-symbols-outlined text-primary text-sm">verified</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Description */}
                {listing.description && (
                  <div>
                    <h3 className="font-bold mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {listing.description}
                    </p>
                  </div>
                )}

                {/* Wants (for trade) */}
                {listing.wants && (listing.type === 'TRADE' || listing.type === 'BOTH') && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <h4 className="font-bold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined">swap_horiz</span>
                      Looking to Trade For
                    </h4>
                    <p className="text-blue-600 dark:text-blue-400">{listing.wants}</p>
                  </div>
                )}

                {/* SafeTrade Badge */}
                <div className="p-4 bg-primary/10 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-2xl">verified_user</span>
                    <div>
                      <h4 className="font-bold text-primary">SafeTrade Protected</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Complete the transaction safely at a verified partner store. Both buyer and seller are protected.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {isOwner ? (
                    <>
                      <Link href={`/listings/${listing.id}/edit`} className="flex-1">
                        <Button variant="outline" className="w-full h-14 text-lg font-bold">
                          <span className="material-symbols-outlined mr-2">edit</span>
                          Edit Listing
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        className="flex-1 h-14 text-lg font-bold border-red-500 text-red-500 hover:bg-red-500/10"
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
                            return
                          }
                          try {
                            const res = await fetch(`/api/listings/${listing.id}`, {
                              method: 'DELETE',
                            })
                            if (!res.ok) {
                              throw new Error('Failed to delete listing')
                            }
                            toast({
                              title: 'Success',
                              description: 'Listing deleted successfully',
                            })
                            router.push('/dashboard/listings')
                          } catch (error: any) {
                            toast({
                              title: 'Error',
                              description: error.message || 'Failed to delete listing',
                              variant: 'destructive',
                            })
                          }
                        }}
                      >
                        <span className="material-symbols-outlined mr-2">delete</span>
                        Delete Listing
                      </Button>
                      <Link href="/dashboard/listings" className="flex-1">
                        <Button variant="outline" className="w-full h-14 text-lg font-bold">
                          <span className="material-symbols-outlined mr-2">list</span>
                          My Listings
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link href={`/listings/${listing.id}/propose`} className="flex-1">
                        <Button className="w-full h-14 bg-primary hover:bg-primary-dark text-lg font-bold">
                          <span className="material-symbols-outlined mr-2">handshake</span>
                          {listing.type === 'TRADE' ? 'Propose Trade' : 
                           listing.type === 'SALE' ? 'Make Offer' : 
                           'Make Proposal'}
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        className="flex-1 h-14 text-lg font-bold"
                        onClick={async () => {
                          if (!user) {
                            router.push('/login')
                            return
                          }
                          try {
                            const res = await fetch('/api/conversations', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                recipientId: listing.user.id,
                                listingId: listing.id,
                              }),
                            })
                            if (res.ok) {
                              router.push('/community')
                            }
                          } catch (error) {
                            console.error('Error starting conversation:', error)
                          }
                        }}
                      >
                        <span className="material-symbols-outlined mr-2">chat</span>
                        Contact Seller
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
