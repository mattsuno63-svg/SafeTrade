'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatPriceNumber } from '@/lib/utils'
import { FeaturedListingsGrid } from '@/components/marketplace/FeaturedListingsGrid'
import { AnimatedOrbs } from '@/components/marketplace/AnimatedOrbs'

interface Listing {
  id: string
  title: string
  description: string | null
  price: number | null
  type: 'SALE' | 'TRADE' | 'BOTH'
  condition: string
  game: string
  set: string | null
  images: string[]
  createdAt: string
  isVaultListing?: boolean
  user: {
    id: string
    name: string | null
    avatar: string | null
    role: 'USER' | 'MERCHANT' | 'ADMIN'
    city: string | null
  }
}

const GAMES = [
  { value: 'all', label: 'All Games' },
  { value: 'POKEMON', label: 'Pokemon' },
  { value: 'MAGIC', label: 'Magic: The Gathering' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'ONEPIECE', label: 'One Piece' },
  { value: 'DIGIMON', label: 'Digimon' },
  { value: 'OTHER', label: 'Other' },
]

const CONDITIONS = [
  { value: 'all', label: 'All Conditions' },
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'PLAYED', label: 'Played' },
  { value: 'POOR', label: 'Poor' },
]

const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'SALE', label: 'For Sale' },
  { value: 'TRADE', label: 'For Trade' },
  { value: 'BOTH', label: 'Sale or Trade' },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

const SELLER_TYPES = [
  { value: 'all', label: 'All Sellers' },
  { value: 'USER', label: 'Collectors Only' },
  { value: 'MERCHANT', label: 'Shops Only' },
]

export default function ListingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [game, setGame] = useState(searchParams.get('game') || 'all')
  const [condition, setCondition] = useState(searchParams.get('condition') || 'all')
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [sellerType, setSellerType] = useState(searchParams.get('sellerType') || 'all')
  const [isVault, setIsVault] = useState(searchParams.get('isVault') || 'all')
  const [showFilters, setShowFilters] = useState(false)

  // Fetch listings
  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (searchQuery) params.set('q', searchQuery)
      if (game !== 'all') params.set('game', game)
      if (condition !== 'all') params.set('condition', condition)
      if (type !== 'all') params.set('type', type)
      if (priceRange[0] > 0) params.set('minPrice', priceRange[0].toString())
      if (priceRange[1] < 1000) params.set('maxPrice', priceRange[1].toString())
      if (city) params.set('city', city)
      if (sellerType !== 'all') params.set('sellerType', sellerType)
      if (isVault !== 'all') params.set('isVault', isVault)
      params.set('page', page.toString())
      params.set('sort', sortBy)
      
      const res = await fetch(`/api/listings?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setListings(data.listings || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, game, condition, type, priceRange, page, sortBy, city, sellerType, isVault])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Update URL with filters
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (game !== 'all') params.set('game', game)
    if (condition !== 'all') params.set('condition', condition)
    if (type !== 'all') params.set('type', type)
    if (sortBy !== 'newest') params.set('sort', sortBy)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/listings?${queryString}` : '/listings'
    window.history.replaceState(null, '', newUrl)
  }, [searchQuery, game, condition, type, sortBy])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchListings()
  }

  const clearFilters = () => {
    setSearchQuery('')
    setGame('all')
    setCondition('all')
    setType('all')
    setPriceRange([0, 1000])
    setCity('')
    setSellerType('all')
    setIsVault('all')
    setSortBy('newest')
    setPage(1)
  }

  const getConditionColor = (cond: string) => {
    const colors: Record<string, string> = {
      MINT: 'bg-green-500',
      NEAR_MINT: 'bg-green-400',
      EXCELLENT: 'bg-blue-500',
      GOOD: 'bg-yellow-500',
      PLAYED: 'bg-orange-500',
      POOR: 'bg-red-500',
    }
    return colors[cond] || 'bg-gray-500'
  }

  const formatCondition = (cond: string) => {
    return cond.replace(/_/g, ' ')
  }

  const getGameLabel = (gameValue: string) => {
    return GAMES.find(g => g.value === gameValue)?.label || gameValue
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display relative">
      {/* Ambient Background with Animated Orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[100px]"></div>
        <AnimatedOrbs count={6} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Categories Section */}
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold">Esplora Categorie</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Pokemon - Escludi se game === 'POKEMON' */}
                {game !== 'POKEMON' && (
                  <button
                    onClick={() => setGame('POKEMON')}
                    className={`group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-105 hover:shadow-2xl border-2 ${
                      game === 'POKEMON' ? 'ring-4 ring-primary border-primary shadow-lg shadow-primary/30' : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_Wym8QnkannN3miSmw0TY8vPwanNYswBL0IF-OrWjLu8b-CVso0bddwe7adcS9aWjR6UekdqqsWKAZ83DAkTles8yO0UZU6HQFuJ0QHh2vvovIWkFDE33UM0-6kMX7zoO96mZbYjcYGCqzr30GWVeX8Yv0RmaNgYPF3wXpV5i-3UMVP002rzu6VOzuGjrp6dCJjIdlciJR_yZ1YNURVVp9dJu4uD5AbDSXPVIH2ofz6lLP3zKaM6897urEtG8GikanKu6q6RUc7LC"
                      alt="Pokemon"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 text-white">
                      {/* Pokéball Icon */}
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
                        <div className="relative w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden flex flex-col">
                          <div className="h-1/2 bg-red-500/80 backdrop-blur-sm border-b-2 border-white/30"></div>
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-white/60"></div>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold">Pokemon</h3>
                      <p className="text-sm opacity-90">TCG & Collectibles</p>
                    </div>
                  </button>
                )}

                {/* One Piece - Escludi se game === 'ONEPIECE' */}
                {game !== 'ONEPIECE' && (
                  <button
                    onClick={() => setGame('ONEPIECE')}
                    className={`group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-105 hover:shadow-2xl border-2 ${
                      game === 'ONEPIECE' ? 'ring-4 ring-primary border-primary shadow-lg shadow-primary/30' : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3swlRftSVm_TS-s6jVm6iM8GA6IL22iG1H2AOsaFycpsfogYVa5oc0shHa9jZpRjOzop2MYsOAuCxrmZi7shaGvnittuUBlJPLE_A5AyCO4Tr3i2XwXGhSjZhL2_2K_y1UljdwzfeBdux4sS-hZqZZfj3il4CXksRNgF2TRC25i4KrO0Q_ytyvVaIAAla1yNZLSLLK6NugrNj4g6rSAA1XerGUc4jbfBq5cHdHMFkHJUqWavKKnemjWKjemuIc-jMcW5lbQwi5_mO"
                      alt="One Piece"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 text-white">
                      {/* Jolly Roger Icon */}
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-10 h-10">
                          {/* Skull shape */}
                          <path
                            d="M50 20 Q35 20 30 35 Q30 45 35 50 Q30 60 30 70 Q30 80 40 85 Q45 90 50 90 Q55 90 60 85 Q70 80 70 70 Q70 60 65 50 Q70 45 70 35 Q65 20 50 20 Z"
                            fill="white"
                            opacity="0.9"
                          />
                          {/* Eye sockets */}
                          <circle cx="40" cy="45" r="6" fill="black" />
                          <circle cx="60" cy="45" r="6" fill="black" />
                          {/* Crossbones */}
                          <line x1="25" y1="25" x2="40" y2="40" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                          <line x1="60" y1="40" x2="75" y2="25" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                          <line x1="25" y1="75" x2="40" y2="60" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                          <line x1="60" y1="60" x2="75" y2="75" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold">One Piece</h3>
                      <p className="text-sm opacity-90">New World</p>
                    </div>
                  </button>
                )}

                {/* Magic - Escludi se game === 'MAGIC' */}
                {game !== 'MAGIC' && (
                  <button
                    onClick={() => setGame('MAGIC')}
                    className={`group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-105 hover:shadow-2xl border-2 ${
                      game === 'MAGIC' ? 'ring-4 ring-blue-500 border-blue-500 shadow-lg shadow-blue-500/30' : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBAqCIWggDLuQm6KhfZmibzVeDrX0gxc2GbX2j6LS6MlhRgP5MLh-A_sTD7oum1UJ_4MBL7lVNEoOMlGFZkb7F-Zj8DjBNCZidtMZRCWbp9jA170PJIMeuF5tBLgP8KW9utuu95YHLhf4pPnlW4-omUHrR7tkrHWnOoOoNUYkxYrs7YVYiU0OxwI__JQoXwZdli8AmPOaySnQ8PLIfLYSU-HC9aWjljeFI3EBuh-FqTW4dM6LnbMrahJ4qmgYxy-VlOwMz0beln59x"
                      alt="Magic"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 text-white">
                      {/* Magic Logo Symbol - Red Flame/Crown */}
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-10 h-10" fill="white">
                          {/* Base curve (fiamma inferiore) */}
                          <path
                            d="M 15 75 Q 25 80 35 75 Q 45 80 55 75 Q 65 80 75 75 Q 85 80 85 75"
                            stroke="white"
                            strokeWidth="2.5"
                            fill="none"
                            opacity="0.5"
                          />
                          {/* Fiamma centrale alta (spike principale) */}
                          <path
                            d="M 50 75 L 50 20 L 48 28 L 50 20 L 52 28 Z"
                            fill="white"
                            opacity="0.95"
                          />
                          {/* Fiamme laterali sinistre */}
                          <path
                            d="M 35 75 L 35 40 L 33 48 L 35 40 L 37 48 Z"
                            fill="white"
                            opacity="0.95"
                          />
                          <path
                            d="M 25 75 L 25 55 L 23 62 L 25 55 L 27 62 Z"
                            fill="white"
                            opacity="0.95"
                          />
                          {/* Fiamme laterali destre */}
                          <path
                            d="M 65 75 L 65 40 L 63 48 L 65 40 L 67 48 Z"
                            fill="white"
                            opacity="0.95"
                          />
                          <path
                            d="M 75 75 L 75 55 L 73 62 L 75 55 L 77 62 Z"
                            fill="white"
                            opacity="0.95"
                          />
                          {/* Fiamme intermedie più piccole */}
                          <path
                            d="M 42 75 L 42 58 L 41 63 L 42 58 L 43 63 Z"
                            fill="white"
                            opacity="0.85"
                          />
                          <path
                            d="M 58 75 L 58 58 L 57 63 L 58 58 L 59 63 Z"
                            fill="white"
                            opacity="0.85"
                          />
                          {/* Dettagli decorativi superiori (corona) */}
                          <path
                            d="M 48 22 L 50 18 L 52 22 L 50 25 Z"
                            fill="white"
                            opacity="0.9"
                          />
                          <path
                            d="M 45 25 L 47 22 L 49 25 Z"
                            fill="white"
                            opacity="0.7"
                          />
                          <path
                            d="M 51 25 L 53 22 L 55 25 Z"
                            fill="white"
                            opacity="0.7"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold">Magic</h3>
                      <p className="text-sm opacity-90">The Gathering</p>
                    </div>
                  </button>
                )}

                {/* Yu-Gi-Oh - Escludi se game === 'YUGIOH' */}
                {game !== 'YUGIOH' && (
                  <button
                    onClick={() => setGame('YUGIOH')}
                    className={`group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-105 hover:shadow-2xl border-2 ${
                      game === 'YUGIOH' ? 'ring-4 ring-red-500 border-red-500 shadow-lg shadow-red-500/30' : 'border-transparent hover:border-primary/30'
                    }`}
                  >
                    <img
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfDIEQWBUG9QnhZpgMy7Z54oQalo6D0PionMFCWYa37nso-Xe5bCJk4YM2-CcgqIq_VrPl9ihSeRzWyxDFr3NOY6UkD4TqM8Wyb8Pc6ASpvzgBUiVnuuuTRyMyStYD4LxlzUjgQRlJUNzE0czt5O9_Wqvtr-RdAfoqOV_1FAYlLJ4l08wMb3DlZr7lGsgWShgl1_xLOhIKkw2GfwKdMh4cSDskMyhCuZ4b_D124g3wDHRZDjwV3iwe199w0wV4VuYbklhP723eixE-"
                      alt="Yu-Gi-Oh"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-6 text-white">
                      {/* Millennium Puzzle Icon */}
                      <div className="w-12 h-12 mb-2 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-10 h-10" fill="white">
                          {/* Millennium Puzzle - Triangolo stilizzato con occhio */}
                          {/* Triangolo principale */}
                          <path
                            d="M 50 15 L 20 75 L 80 75 Z"
                            fill="white"
                            opacity="0.95"
                            stroke="white"
                            strokeWidth="1"
                          />
                          {/* Linee interne del puzzle */}
                          <path
                            d="M 50 15 L 50 60"
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.6"
                          />
                          <path
                            d="M 35 45 L 65 45"
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.6"
                          />
                          {/* Occhio di Horus stilizzato al centro */}
                          <circle
                            cx="50"
                            cy="50"
                            r="8"
                            fill="black"
                            opacity="0.8"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="4"
                            fill="white"
                            opacity="0.9"
                          />
                          {/* Dettagli decorativi ai lati */}
                          <path
                            d="M 30 70 L 35 65 L 40 70 Z"
                            fill="white"
                            opacity="0.7"
                          />
                          <path
                            d="M 70 70 L 65 65 L 60 70 Z"
                            fill="white"
                            opacity="0.7"
                          />
                          {/* Linee decorative superiori */}
                          <path
                            d="M 45 25 L 50 20 L 55 25"
                            stroke="white"
                            strokeWidth="1.5"
                            fill="none"
                            opacity="0.8"
                          />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold">Yu-Gi-Oh!</h3>
                      <p className="text-sm opacity-90">Duel Monsters</p>
                    </div>
                  </button>
                )}
              </div>
            </section>

            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Tutte le Carte</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Cerca e filtra tra tutte le carte disponibili
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    search
                  </span>
                  <Input
                    type="text"
                    placeholder="Search cards by name, set, or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-12 pr-4 w-full rounded-xl"
                  />
                </div>
                <Button type="submit" className="h-12 px-6 bg-primary hover:bg-primary-dark">
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-4 md:hidden"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <span className="material-symbols-outlined">tune</span>
                </Button>
              </div>
            </form>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Filters Sidebar */}
              <aside className={`lg:w-64 flex-shrink-0 space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                <Card className="glass-panel p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">Filters</h3>
                    <button
                      onClick={clearFilters}
                      className="text-sm text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  {/* Game Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Game</Label>
                    <Select value={game} onValueChange={setGame}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent>
                        {GAMES.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Listing Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Location (City)</Label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        location_on
                      </span>
                      <Input
                        type="text"
                        placeholder="e.g., Milano, Roma..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Filter by seller's city
                    </p>
                  </div>

                  {/* Seller Type Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Seller Type</Label>
                    <Select value={sellerType} onValueChange={setSellerType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select seller type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SELLER_TYPES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* SafeVault Filter */}
                  <div className="space-y-2 mb-6">
                    <Label>Sale Mode</Label>
                    <Select value={isVault} onValueChange={setIsVault}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sale mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="false">Direct P2P</SelectItem>
                        <SelectItem value="true">SafeVault</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div className="space-y-3 mb-6">
                    <Label>Price Range (€)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        min={0}
                        value={priceRange[0] || ''}
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                        className="w-full"
                      />
                      <span className="text-gray-400">-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        min={0}
                        value={priceRange[1] || ''}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Apply Filters Button (Mobile) */}
                  <Button
                    onClick={() => {
                      setShowFilters(false)
                      fetchListings()
                    }}
                    className="w-full lg:hidden bg-primary hover:bg-primary-dark"
                  >
                    Apply Filters
                  </Button>
                </Card>
              </aside>

              {/* Listings Grid */}
              <div className="flex-1">
                {/* Sort and Results Count */}
                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-600 dark:text-gray-400">
                    {loading ? 'Loading...' : `${total} listings found`}
                  </p>
                  <div className="flex items-center gap-3">
                    <Label className="hidden sm:inline">Sort by:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Loading State */}
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i} className="glass-panel overflow-hidden animate-pulse">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-700" />
                        <div className="p-4 space-y-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : listings.length === 0 ? (
                  /* Empty State */
                  <Card className="glass-panel p-12 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                      search_off
                    </span>
                    <h2 className="text-2xl font-bold mb-2">No Listings Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Try adjusting your search or filters to find what you're looking for.
                    </p>
                    <Button onClick={clearFilters} className="bg-primary hover:bg-primary-dark">
                      Clear Filters
                    </Button>
                  </Card>
                ) : (
                  /* Listings Grid */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listings.map((listing, index) => (
                        <Link key={listing.id} href={`/listings/${listing.id}`}>
                          <Card 
                            className="glass-panel overflow-hidden group cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 opacity-0 animate-fade-in"
                            style={{ 
                              animationDelay: `${index * 0.1}s`,
                              animationFillMode: 'forwards'
                            }}
                          >
                            {/* Image */}
                            <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                              {listing.images[0] ? (
                                <img
                                  src={listing.images[0]}
                                  alt={listing.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-4xl text-gray-400">
                                    image
                                  </span>
                                </div>
                              )}
                              
                              {/* Badges */}
                              <div className="absolute top-3 left-3 flex flex-col gap-2">
                                {listing.isVaultListing && (
                                  <Badge className="bg-purple-600 text-white backdrop-blur-sm text-xs font-bold">
                                    <span className="material-symbols-outlined text-xs mr-1">inventory_2</span>
                                    SafeVault
                                  </Badge>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${
                                  listing.type === 'SALE' ? 'bg-green-500' :
                                  listing.type === 'TRADE' ? 'bg-blue-500' :
                                  'bg-purple-500'
                                }`}>
                                  {listing.type === 'BOTH' ? 'SALE/TRADE' : listing.type}
                                </span>
                              </div>
                              
                              <div className="absolute top-3 right-3">
                                <span className={`w-3 h-3 rounded-full inline-block ${getConditionColor(listing.condition)}`}
                                  title={formatCondition(listing.condition)}
                                />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                              <div className="text-xs font-medium text-primary mb-1">
                                {getGameLabel(listing.game)}
                                {listing.set && ` • ${listing.set}`}
                              </div>
                              <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {listing.title}
                              </h3>
                              <div className="flex items-center justify-between">
                                {listing.price ? (
                                  <span className="text-xl font-bold text-primary" suppressHydrationWarning>
                                    €{formatPriceNumber(listing.price)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-500">Trade Only</span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(listing.createdAt).toLocaleDateString('it-IT', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                              {/* Seller Info */}
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                                  {listing.user.avatar ? (
                                    <img src={listing.user.avatar} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold text-primary">
                                      {(listing.user.name || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                  {listing.user.name || 'Collector'}
                                </span>
                                {listing.user.role === 'MERCHANT' ? (
                                  <span className="flex items-center gap-1 text-xs font-medium text-orange-500">
                                    <span className="material-symbols-outlined text-sm">store</span>
                                    Shop
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs font-medium text-blue-500">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    Collector
                                  </span>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                            let pageNum = i + 1
                            if (totalPages > 5) {
                              if (page <= 3) {
                                pageNum = i + 1
                              } else if (page >= totalPages - 2) {
                                pageNum = totalPages - 4 + i
                              } else {
                                pageNum = page - 2 + i
                              }
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? 'default' : 'outline'}
                                className={page === pageNum ? 'bg-primary' : ''}
                                onClick={() => setPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          disabled={page === totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Featured Listings Section - In Vetrina (dopo Tutte le Carte) */}
            <section className="mb-12 mt-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2">⭐ In Vetrina</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Carte premium selezionate per te
                  </p>
                </div>
              </div>
              <FeaturedListingsGrid />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
