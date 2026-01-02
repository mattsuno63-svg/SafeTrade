'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export default function MerchantInventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Mock products - da sostituire con API call
  const products = [
    {
      id: '1',
      title: 'Charizard VMAX',
      set: 'Darkness Ablaze',
      condition: 'Near Mint',
      price: 120.00,
      stock: 5,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoo-ciVjnvYxkxUUIc1A3Jl34_E_mFBpLeO0vQSbnnahTHvR58UeyJxCgE7rV0xLBYz4vjuCcUXhqlpgo5yiB1MVi-MEWqouVapmppAhgtLFE4KX4OUGRp3Y9W_26WKBuk2Cv4i5bpeKTYrsyp3wjNlNCIXcJXbyuCYu_98pG1E_8flNZzUfAsB9-9BmpIGHqwMCO2JX3_e9m-ITIFWJ7K_cUfMRrDh0n4i9aqEtQ6u7vlSDRdzimefs9vyq15dYmLdLRWQAW0fmSl',
    },
    {
      id: '2',
      title: 'Pikachu VMAX',
      set: 'Champions Path',
      condition: 'Excellent',
      price: 45.99,
      stock: 2,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoo-ciVjnvYxkxUUIc1A3Jl34_E_mFBpLeO0vQSbnnahTHvR58UeyJxCgE7rV0xLBYz4vjuCcUXhqlpgo5yiB1MVi-MEWqouVapmppAhgtLFE4KX4OUGRp3Y9W_26WKBuk2Cv4i5bpeKTYrsyp3wjNlNCIXcJXbyuCYu_98pG1E_8flNZzUfAsB9-9BmpIGHqwMCO2JX3_e9m-ITIFWJ7K_cUfMRrDh0n4i9aqEtQ6u7vlSDRdzimefs9vyq15dYmLdLRWQAW0fmSl',
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
              <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
              <p className="text-white/70">Manage your product catalog</p>
            </div>
            <Button className="bg-primary hover:bg-primary-dark" asChild>
              <a href="/dashboard/merchant/create-offer">Add New Product</a>
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/50">
                search
              </span>
              <Input
                className="bg-white/5 border-white/10 pl-12 text-white"
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="border-white/10">
              <span className="material-symbols-outlined mr-2">filter_list</span>
              Filters
            </Button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="glass-panel overflow-hidden">
                <div className="relative h-48 w-full">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <span className="bg-green-500/90 px-2 py-1 rounded-full text-xs font-bold text-white">
                      Stock: {product.stock}
                    </span>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="text-xs font-bold text-primary mb-1">{product.set}</div>
                  <h3 className="font-bold text-lg mb-2">{product.title}</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{product.condition}</span>
                    <span className="text-xl font-bold">€{product.price.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-white/10">
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-white/10">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

