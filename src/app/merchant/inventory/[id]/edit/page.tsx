'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

const GAMES = [
  { value: 'POKEMON', label: 'Pokemon' },
  { value: 'MAGIC', label: 'Magic: The Gathering' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'ONEPIECE', label: 'One Piece' },
  { value: 'DIGIMON', label: 'Digimon' },
  { value: 'OTHER', label: 'Other' },
]

const CONDITIONS = [
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'PLAYED', label: 'Played' },
  { value: 'POOR', label: 'Poor' },
]

const LANGUAGES = [
  { value: 'IT', label: 'Italian' },
  { value: 'EN', label: 'English' },
  { value: 'JP', label: 'Japanese' },
  { value: 'DE', label: 'German' },
  { value: 'FR', label: 'French' },
  { value: 'ES', label: 'Spanish' },
]

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    condition: 'NEAR_MINT',
    game: 'POKEMON',
    set: '',
    cardNumber: '',
    rarity: '',
    language: 'IT',
    stock: '1',
    isActive: true,
    images: [] as string[],
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    if (user && productId) {
      fetchProduct()
    }
  }, [user, userLoading, productId])

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/merchant/products/${productId}`)
      
      if (!res.ok) {
        throw new Error('Product not found')
      }

      const product = await res.json()
      setFormData({
        title: product.title,
        description: product.description || '',
        price: product.price.toString(),
        condition: product.condition,
        game: product.game,
        set: product.set || '',
        cardNumber: product.cardNumber || '',
        rarity: product.rarity || '',
        language: product.language,
        stock: product.stock.toString(),
        isActive: product.isActive,
        images: product.images || [],
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load product',
        variant: 'destructive',
      })
      router.push('/merchant/inventory')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.price || !formData.condition || !formData.game) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const res = await fetch(`/api/merchant/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update product')
      }

      toast({
        title: 'Success',
        description: 'Product updated successfully',
      })

      router.push('/merchant/inventory')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (userLoading || loading) {
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
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-primary mb-4"
              >
                <span className="material-symbols-outlined mr-1">arrow_back</span>
                Back to Inventory
              </button>
              <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Update product information
              </p>
            </div>

            <Card className="glass-panel p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">Product Status</p>
                    <p className="text-sm text-gray-500">
                      {formData.isActive ? 'Product is visible to customers' : 'Product is hidden'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isActive ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Basic Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Charizard VMAX"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional details about the card..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Price (€) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="h-12"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock *</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        placeholder="1"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="h-12"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Card Details */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg">Card Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="game">Game *</Label>
                      <select
                        id="game"
                        value={formData.game}
                        onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                        className="w-full h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        required
                      >
                        {GAMES.map(g => (
                          <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition *</Label>
                      <select
                        id="condition"
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        required
                      >
                        {CONDITIONS.map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="set">Set</Label>
                      <Input
                        id="set"
                        placeholder="e.g., Shining Fates"
                        value={formData.set}
                        onChange={(e) => setFormData({ ...formData, set: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="e.g., 25/102"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rarity">Rarity</Label>
                      <Input
                        id="rarity"
                        placeholder="e.g., Ultra Rare"
                        value={formData.rarity}
                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <select
                        id="language"
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full h-12 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      >
                        {LANGUAGES.map(l => (
                          <option key={l.value} value={l.value}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary-dark"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

