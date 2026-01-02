'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Product {
  id: string
  title: string
  description: string | null
  price: number
  condition: string
  game: string
  set: string | null
  cardNumber: string | null
  rarity: string | null
  language: string
  images: string[]
  isActive: boolean
  stock: number
  createdAt: string
}

export default function InventoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    if (user) {
      fetchProducts()
    }
  }, [user, userLoading, page, search])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })

      const res = await fetch(`/api/merchant/products?${params}`)
      
      if (!res.ok) {
        const error = await res.json()
        if (res.status === 404) {
          // No shop - redirect to shop setup
          router.push('/merchant/setup')
          return
        }
        throw new Error(error.error)
      }

      const data = await res.json()
      setProducts(data.products)
      setTotalPages(data.pagination.totalPages)
      setTotal(data.pagination.total)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch products',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/merchant/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!res.ok) throw new Error('Failed to update product')

      setProducts(products.map(p => 
        p.id === productId ? { ...p, isActive: !currentStatus } : p
      ))

      toast({
        title: 'Success',
        description: `Product ${!currentStatus ? 'activated' : 'deactivated'}`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const res = await fetch(`/api/merchant/products/${productId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete product')

      setProducts(products.filter(p => p.id !== productId))
      setTotal(total - 1)

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      })
    }
  }

  const getConditionBadge = (condition: string) => {
    const colors: Record<string, string> = {
      MINT: 'bg-green-100 text-green-800',
      NEAR_MINT: 'bg-green-50 text-green-700',
      EXCELLENT: 'bg-blue-100 text-blue-800',
      GOOD: 'bg-yellow-100 text-yellow-800',
      PLAYED: 'bg-orange-100 text-orange-800',
      POOR: 'bg-red-100 text-red-800',
    }
    return colors[condition] || 'bg-gray-100 text-gray-800'
  }

  const getGameBadge = (game: string) => {
    const colors: Record<string, string> = {
      POKEMON: 'bg-yellow-100 text-yellow-800',
      MAGIC: 'bg-purple-100 text-purple-800',
      YUGIOH: 'bg-blue-100 text-blue-800',
      ONEPIECE: 'bg-red-100 text-red-800',
      DIGIMON: 'bg-orange-100 text-orange-800',
      OTHER: 'bg-gray-100 text-gray-800',
    }
    return colors[game] || 'bg-gray-100 text-gray-800'
  }

  if (userLoading) {
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
                <h1 className="text-3xl font-bold mb-2">Inventory</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your shop's products ({total} items)
                </p>
              </div>
              <Link href="/merchant/inventory/new">
                <Button className="bg-primary hover:bg-primary-dark">
                  <span className="material-symbols-outlined mr-2">add</span>
                  Add Product
                </Button>
              </Link>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-pulse">Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <Card className="glass-panel p-8 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  inventory_2
                </span>
                <h3 className="text-xl font-bold mb-2">No products yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start adding products to your inventory
                </p>
                <Link href="/merchant/inventory/new">
                  <Button className="bg-primary hover:bg-primary-dark">
                    Add Your First Product
                  </Button>
                </Link>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <Card key={product.id} className="glass-panel overflow-hidden">
                      {/* Product Image */}
                      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 relative">
                        {product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-gray-400">
                              image
                            </span>
                          </div>
                        )}
                        {/* Status Badge */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                          product.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGameBadge(product.game)}`}>
                            {product.game}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConditionBadge(product.condition)}`}>
                            {product.condition.replace('_', ' ')}
                          </span>
                        </div>

                        <h3 className="font-bold text-lg mb-1 line-clamp-1">
                          {product.title}
                        </h3>
                        
                        {product.set && (
                          <p className="text-sm text-gray-500 mb-2">
                            {product.set} {product.cardNumber && `#${product.cardNumber}`}
                          </p>
                        )}

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-2xl font-bold text-primary">
                            €{product.price.toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Stock: {product.stock}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link href={`/merchant/inventory/${product.id}/edit`} className="flex-1">
                            <Button variant="outline" className="w-full">
                              <span className="material-symbols-outlined text-sm mr-1">edit</span>
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            onClick={() => handleToggleActive(product.id, product.isActive)}
                            className={product.isActive ? 'text-yellow-600' : 'text-green-600'}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {product.isActive ? 'pause' : 'play_arrow'}
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-4">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

