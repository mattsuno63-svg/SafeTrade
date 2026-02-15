'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { CardGame, CardCondition, ListingType } from '@prisma/client'
import { useUser } from '@/hooks/use-user'

function CreateListingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  // Get escrowType from URL params
  const escrowType = searchParams.get('escrowType') // 'LOCAL' or 'VERIFIED'
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'SALE' as ListingType,
    price: '',
    condition: '' as CardCondition | '',
    game: '' as CardGame | '',
    set: '',
    cardNumber: '',
    wants: '',
  })
  
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [isVaultListing, setIsVaultListing] = useState(false)
  const [vaultTermsAccepted, setVaultTermsAccepted] = useState(false)
  
  // Show info message if escrowType is set
  useEffect(() => {
    if (escrowType === 'LOCAL') {
      toast({
        title: 'Escrow Locale Selezionato',
        description: 'Questo listing utilizzerà l\'escrow locale. Selezionerai il negozio dopo la creazione.',
      })
    } else if (escrowType === 'VERIFIED') {
      toast({
        title: 'Escrow Centralizzato Selezionato',
        description: 'Questo listing utilizzerà l\'escrow centralizzato SafeTrade.',
      })
    }
  }, [escrowType, toast])

  // Redirect if not authenticated
  if (!userLoading && !user) {
    router.push('/login')
    return null
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (images.length + files.length > 5) {
      toast({
        title: 'Error',
        description: 'Maximum 5 images allowed',
        variant: 'destructive',
      })
      return
    }

    // Create preview URLs first
    const newPreviews: string[] = []
    const validFiles: File[] = []

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: `${file.name} is not an image file`,
          variant: 'destructive',
        })
        continue
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: `${file.name} is too large (max 5MB)`,
          variant: 'destructive',
        })
        continue
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file)
      newPreviews.push(previewUrl)
      validFiles.push(file)
    }

    // Show previews immediately
    setPreviewImages([...previewImages, ...newPreviews])

    setUploading(true)
    const newImages: string[] = []

    try {
      for (const file of validFiles) {
        // Upload to Supabase Storage
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await res.json()
        newImages.push(data.url)
      }

      // Remove preview URLs and add uploaded URLs
      newPreviews.forEach(url => URL.revokeObjectURL(url))
      setPreviewImages([])
      setImages([...images, ...newImages])
      toast({
        title: 'Success',
        description: `${newImages.length} image(s) uploaded successfully`,
      })
    } catch (error: any) {
      // Clean up preview URLs on error
      newPreviews.forEach(url => URL.revokeObjectURL(url))
      setPreviewImages(previewImages.filter((_, i) => i < previewImages.length - newPreviews.length))
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload images',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a listing',
        variant: 'destructive',
      })
      return
    }

    // Validation
    if (!formData.title || !formData.type || !formData.condition || !formData.game) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    if ((formData.type === 'SALE' || formData.type === 'BOTH') && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast({
        title: 'Error',
        description: 'Price is required and must be greater than 0',
        variant: 'destructive',
      })
      return
    }

    if (images.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one image is required',
        variant: 'destructive',
      })
      return
    }

    // Validation for SafeVault
    if (isVaultListing && !vaultTermsAccepted) {
      toast({
        title: 'Error',
        description: 'Devi accettare i termini del servizio SafeVault per continuare',
        variant: 'destructive',
      })
      return
    }

    // SafeVault requires at least one image (already validated above)
    if (isVaultListing && images.length === 0) {
      toast({
        title: 'Error',
        description: 'Almeno una foto è obbligatoria per le vendite SafeVault',
        variant: 'destructive',
      })
      return
    }

    // SafeVault requires minimum price of 40€
    if (isVaultListing && formData.price) {
      const priceValue = parseFloat(formData.price)
      if (priceValue < 40) {
        toast({
          title: 'Error',
          description: 'SafeVault è disponibile solo per carte con valore minimo di 40€. Il prezzo attuale è troppo basso.',
          variant: 'destructive',
        })
        return
      }
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.type === 'SALE' || formData.type === 'BOTH' ? parseFloat(formData.price) : null,
          images,
          isVaultListing,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create listing')
      }

      toast({
        title: 'Success',
        description: 'Listing created successfully!',
      })

      // Redirect to the new listing
      router.push(`/listings/${data.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create listing',
        variant: 'destructive',
      })
      setSubmitting(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Card className="glass-panel rounded-3xl p-8 sm:p-10">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Create New Listing</CardTitle>
                <CardDescription className="text-base">
                  List your card for sale or trade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Images Upload */}
                  <div className="space-y-2">
                    <Label>Images * (1-5 images)</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Uploaded Images */}
                      {images.map((url, index) => (
                        <div key={`uploaded-${index}`} className="relative group">
                          <img
                            src={url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-primary/20"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                          <div className="absolute bottom-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded">
                            Uploaded
                          </div>
                        </div>
                      ))}
                      {/* Preview Images (before upload) */}
                      {previewImages.map((url, index) => (
                        <div key={`preview-${index}`} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-yellow-500/50 opacity-75"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-yellow-500/90 text-white text-xs px-2 py-1 rounded">
                            Uploading...
                          </div>
                        </div>
                      ))}
                      {/* Add Image Button */}
                      {images.length + previewImages.length < 5 && (
                        <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50 dark:bg-gray-800/50">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            disabled={uploading}
                            className="hidden"
                          />
                          <div className="text-center">
                            <span className="material-symbols-outlined text-3xl text-gray-400">add_photo_alternate</span>
                            <p className="text-sm text-gray-500 mt-1">Add Image</p>
                            <p className="text-xs text-gray-400 mt-1">{images.length + previewImages.length}/5</p>
                          </div>
                        </label>
                      )}
                    </div>
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        <p>Uploading images...</p>
                      </div>
                    )}
                  </div>

                  {/* Sale Mode Selection */}
                  {(formData.type === 'SALE' || formData.type === 'BOTH') && (
                    <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <Label className="text-base font-semibold">Modalità di Vendita *</Label>
                      <div className="space-y-3">
                        <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-white dark:bg-gray-900">
                          <input
                            type="radio"
                            name="saleMode"
                            checked={!isVaultListing}
                            onChange={() => {
                              setIsVaultListing(false)
                              setVaultTermsAccepted(false)
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-semibold">Vendita Diretta P2P</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Vendi direttamente all'acquirente. Gestisci tu la spedizione e il pagamento.
                            </div>
                          </div>
                        </label>
                        
                        <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer hover:border-primary/50 transition-colors bg-white dark:bg-gray-900">
                          <input
                            type="radio"
                            name="saleMode"
                            checked={isVaultListing}
                            onChange={() => setIsVaultListing(true)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="font-semibold flex items-center gap-2">
                              Vendita in Contovendita SafeVault
                              <span className="px-2 py-0.5 text-xs bg-purple-500 text-white rounded">NUOVO</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Le tue carte verranno inviate all'hub SafeTrade per verifica professionale e vendita multicanale (online e nei negozi fisici).
                            </div>
                          </div>
                        </label>
                      </div>

                      {isVaultListing && (
                        <div className="mt-4 space-y-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
                              <span className="material-symbols-outlined text-lg">info</span>
                              Come Funziona SafeVault
                            </div>
                            <div className="mb-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
                              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">warning</span>
                                <strong>Requisito minimo:</strong> Solo per carte con valore ≥ 40€
                              </p>
                            </div>
                            <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300 ml-6 list-disc">
                              <li>Invia la carta all'hub SafeTrade (indirizzo fornito dopo la creazione)</li>
                              <li>Verifica professionale della condizione e autenticità</li>
                              <li>Pricing ottimizzato basato sul mercato</li>
                              <li>Vendita multicanale: online e nei negozi fisici</li>
                              <li>Ricevi il <strong>70% del prezzo di vendita finale</strong></li>
                              <li>Split automatico: 70% a te, 20% al negoziante, 10% a SafeTrade</li>
                            </ul>
                          </div>
                          
                          <div className="pt-2 border-t border-purple-200 dark:border-purple-800">
                            <label className="flex items-start gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={vaultTermsAccepted}
                                onChange={(e) => setVaultTermsAccepted(e.target.checked)}
                                className="mt-1"
                                required
                              />
                              <span className="text-sm text-purple-800 dark:text-purple-200">
                                Ho letto e accetto i <a href="/terms/vault" target="_blank" className="underline hover:text-purple-600">termini del servizio SafeVault</a> *
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Card Name *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Charizard VMAX"
                      required
                      className="h-12"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Listing Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as ListingType })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALE">Sale</SelectItem>
                        <SelectItem value="TRADE">Trade</SelectItem>
                        <SelectItem value="BOTH">Sale or Trade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price (if sale or both) */}
                  {(formData.type === 'SALE' || formData.type === 'BOTH') && (
                    <div className="space-y-2">
                      <Label htmlFor="price">
                        Price (€) *
                        {isVaultListing && (
                          <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                            (Minimo 40€ per SafeVault)
                          </span>
                        )}
                      </Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min={isVaultListing ? "40" : "0"}
                        value={formData.price}
                        onChange={(e) => {
                          const value = e.target.value
                          // If SafeVault, validate minimum
                          if (isVaultListing && value && parseFloat(value) < 40) {
                            toast({
                              title: 'Prezzo troppo basso',
                              description: 'SafeVault richiede un prezzo minimo di 40€',
                              variant: 'destructive',
                            })
                          }
                          setFormData({ ...formData, price: value })
                        }}
                        placeholder={isVaultListing ? "40.00 (minimo)" : "0.00"}
                        required
                        className="h-12"
                      />
                      {isVaultListing && formData.price && parseFloat(formData.price) < 40 && (
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          ⚠️ Il prezzo deve essere almeno 40€ per utilizzare SafeVault
                        </p>
                      )}
                    </div>
                  )}

                  {/* Game */}
                  <div className="space-y-2">
                    <Label htmlFor="game">Card Game *</Label>
                    <Select
                      value={formData.game}
                      onValueChange={(value) => setFormData({ ...formData, game: value as CardGame })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select game" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POKEMON">Pokemon</SelectItem>
                        <SelectItem value="MAGIC">Magic: The Gathering</SelectItem>
                        <SelectItem value="YUGIOH">Yu-Gi-Oh!</SelectItem>
                        <SelectItem value="ONEPIECE">One Piece</SelectItem>
                        <SelectItem value="DIGIMON">Digimon</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Condition */}
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value as CardCondition })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MINT">Mint</SelectItem>
                        <SelectItem value="NEAR_MINT">Near Mint</SelectItem>
                        <SelectItem value="EXCELLENT">Excellent</SelectItem>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="PLAYED">Played</SelectItem>
                        <SelectItem value="POOR">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Set */}
                  <div className="space-y-2">
                    <Label htmlFor="set">Set/Expansion</Label>
                    <Input
                      id="set"
                      value={formData.set}
                      onChange={(e) => setFormData({ ...formData, set: e.target.value })}
                      placeholder="e.g., Base Set, Champions Path"
                      className="h-12"
                    />
                  </div>

                  {/* Card Number */}
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={formData.cardNumber}
                      onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                      placeholder="e.g., 25/102"
                      className="h-12"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add any additional details about the card..."
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Wants (for trade) */}
                  {(formData.type === 'TRADE' || formData.type === 'BOTH') && (
                    <div className="space-y-2">
                      <Label htmlFor="wants">What are you looking for?</Label>
                      <Textarea
                        id="wants"
                        value={formData.wants}
                        onChange={(e) => setFormData({ ...formData, wants: e.target.value })}
                        placeholder="Describe what cards you're looking for in trade..."
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
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
                      disabled={submitting || uploading}
                      className="flex-1 bg-primary hover:bg-primary-dark"
                    >
                      {submitting ? 'Creating...' : 'Create Listing'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

const fallback = <div className="flex min-h-[40vh] items-center justify-center"><span className="text-muted-foreground">Caricamento...</span></div>
export default function CreateListingPage() {
  return <Suspense fallback={fallback}><CreateListingContent /></Suspense>
}
