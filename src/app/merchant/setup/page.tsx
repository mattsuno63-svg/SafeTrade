'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function ShopSetupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [existingShop, setExistingShop] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    openingHours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '', close: '', closed: true },
    },
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
    logo: '',
    coverImage: '',
    galleryImages: [] as string[],
  })
  const [uploadingImages, setUploadingImages] = useState(false)
  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const checkExistingShop = useCallback(async () => {
    // Preveni fetch multipli simultanei
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      setLoading(true)
      const res = await fetch('/api/merchant/shop')
      if (res.ok) {
        const shop = await res.json()
        setExistingShop(shop)
        let openingHours
        try {
          openingHours = shop.openingHours ? JSON.parse(shop.openingHours) : {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '', close: '', closed: true },
          }
        } catch (parseError) {
          console.error('Error parsing opening hours:', parseError)
          openingHours = {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false },
            wednesday: { open: '09:00', close: '18:00', closed: false },
            thursday: { open: '09:00', close: '18:00', closed: false },
            friday: { open: '09:00', close: '18:00', closed: false },
            saturday: { open: '09:00', close: '18:00', closed: false },
            sunday: { open: '', close: '', closed: true },
          }
        }
        
        setFormData({
          name: shop.name || '',
          description: shop.description || '',
          address: shop.address || '',
          city: shop.city || '',
          postalCode: shop.postalCode || '',
          phone: shop.phone || '',
          email: shop.email || '',
          website: shop.website || '',
          openingHours,
          facebookUrl: shop.facebookUrl || '',
          instagramUrl: shop.instagramUrl || '',
          twitterUrl: shop.twitterUrl || '',
          youtubeUrl: shop.youtubeUrl || '',
          tiktokUrl: shop.tiktokUrl || '',
          logo: shop.logo || '',
          coverImage: shop.coverImage || '',
          galleryImages: shop.images || [],
        })
      } else if (res.status === 404) {
        // No existing shop - this is ok, user can create one
        setExistingShop(null)
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch shop')
      }
    } catch (error: any) {
      console.error('Error fetching shop:', error)
      // No existing shop or error - user can still create/update
      setExistingShop(null)
      if (error.message && !error.message.includes('404')) {
        toast({
          title: 'Errore',
          description: error.message || 'Impossibile caricare i dati del negozio',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
      hasFetchedRef.current = true
    }
  }, [router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    // Fetch solo una volta quando l'utente è disponibile
    if (user && !userLoading && !hasFetchedRef.current) {
      checkExistingShop()
    }
  }, [user, userLoading, checkExistingShop, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Shop name is required',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)

    try {
      const method = existingShop ? 'PATCH' : 'POST'
      // Combine logo, coverImage, and galleryImages into images array for API
      // API expects: images[0] = logo, images[1] = coverImage, images[2+] = gallery
      const imagesArray = [
        formData.logo || '',
        formData.coverImage || '',
        ...formData.galleryImages,
      ].filter(img => img !== '') // Remove empty strings
      
      const payload = {
        ...formData,
        openingHours: JSON.stringify(formData.openingHours),
        images: imagesArray,
      }
      
      const res = await fetch('/api/merchant/shop', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        let errorMessage = 'Failed to save shop'
        try {
          const error = await res.json()
          errorMessage = error.error || errorMessage
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = res.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      toast({
        title: 'Success',
        description: existingShop ? 'Shop updated successfully' : 'Shop created successfully',
      })

      router.push('/merchant/shop')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save shop',
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
            <div className="mb-8 text-center">
              <span className="material-symbols-outlined text-6xl text-primary mb-4">
                storefront
              </span>
              <h1 className="text-3xl font-bold mb-2">
                {existingShop ? 'Edit Your Shop' : 'Set Up Your Shop'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {existingShop 
                  ? 'Update your shop information'
                  : 'Create your merchant shop to start selling cards'
                }
              </p>
            </div>

            <Card className="glass-panel p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">info</span>
                    Basic Information
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Shop Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Card Kingdom Milano"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Tell customers about your shop..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">location_on</span>
                    Location
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="e.g., Via Roma 123"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="h-12"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="e.g., Milano"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        placeholder="e.g., 20121"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">phone</span>
                    Contact
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., +39 02 1234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="e.g., info@negozio.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="e.g., https://www.negozio.com"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Opening Hours */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">schedule</span>
                    Orari di Apertura
                  </h3>
                  
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => {
                    const dayNames: Record<string, string> = {
                      monday: 'Lunedì',
                      tuesday: 'Martedì',
                      wednesday: 'Mercoledì',
                      thursday: 'Giovedì',
                      friday: 'Venerdì',
                      saturday: 'Sabato',
                      sunday: 'Domenica',
                    }
                    
                    return (
                      <div key={day} className="flex items-center gap-4">
                        <div className="w-24">
                          <Label className="font-medium">{dayNames[day]}</Label>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={formData.openingHours[day].open}
                            onChange={(e) => setFormData({
                              ...formData,
                              openingHours: {
                                ...formData.openingHours,
                                [day]: { ...formData.openingHours[day], open: e.target.value },
                              },
                            })}
                            disabled={formData.openingHours[day].closed}
                            className="h-10"
                          />
                          <span className="text-gray-500">-</span>
                          <Input
                            type="time"
                            value={formData.openingHours[day].close}
                            onChange={(e) => setFormData({
                              ...formData,
                              openingHours: {
                                ...formData.openingHours,
                                [day]: { ...formData.openingHours[day], close: e.target.value },
                              },
                            })}
                            disabled={formData.openingHours[day].closed}
                            className="h-10"
                          />
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.openingHours[day].closed}
                              onChange={(e) => setFormData({
                                ...formData,
                                openingHours: {
                                  ...formData.openingHours,
                                  [day]: { ...formData.openingHours[day], closed: e.target.checked },
                                },
                              })}
                              className="w-4 h-4"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Chiuso</span>
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Social Media */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">share</span>
                    Social Media
                  </h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      type="url"
                      placeholder="https://www.facebook.com/negozio"
                      value={formData.facebookUrl}
                      onChange={(e) => setFormData({ ...formData, facebookUrl: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                    <Input
                      id="instagramUrl"
                      type="url"
                      placeholder="https://www.instagram.com/negozio"
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="twitterUrl">Twitter/X URL</Label>
                    <Input
                      id="twitterUrl"
                      type="url"
                      placeholder="https://twitter.com/negozio"
                      value={formData.twitterUrl}
                      onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="youtubeUrl">YouTube URL</Label>
                    <Input
                      id="youtubeUrl"
                      type="url"
                      placeholder="https://www.youtube.com/@negozio"
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tiktokUrl">TikTok URL</Label>
                    <Input
                      id="tiktokUrl"
                      type="url"
                      placeholder="https://www.tiktok.com/@negozio"
                      value={formData.tiktokUrl}
                      onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">image</span>
                    Immagini Negozio
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Logo Negozio</Label>
                      <p className="text-sm text-gray-500 mb-2">Carica il logo del tuo negozio</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingImages(true)
                          try {
                            const uploadFormData = new FormData()
                            uploadFormData.append('file', file)
                            const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData })
                            if (res.ok) {
                              const data = await res.json()
                              setFormData({ ...formData, logo: data.url })
                              toast({ title: 'Success', description: 'Logo caricato con successo' })
                            } else {
                              const error = await res.json()
                              throw new Error(error.error || 'Upload failed')
                            }
                          } catch (error: any) {
                            toast({ 
                              title: 'Error', 
                              description: error.message || 'Failed to upload image', 
                              variant: 'destructive' 
                            })
                          } finally {
                            setUploadingImages(false)
                          }
                        }}
                        disabled={uploadingImages}
                      />
                      {formData.logo && (
                        <div className="mt-2 relative inline-block">
                          <img src={formData.logo} alt="Logo" className="w-32 h-32 object-cover rounded-lg border-2 border-primary/20" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logo: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>Immagine di Copertina</Label>
                      <p className="text-sm text-gray-500 mb-2">Carica un'immagine di copertina per la landing page</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingImages(true)
                          try {
                            const uploadFormData = new FormData()
                            uploadFormData.append('file', file)
                            const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData })
                            if (res.ok) {
                              const data = await res.json()
                              setFormData({ ...formData, coverImage: data.url })
                              toast({ title: 'Success', description: 'Immagine di copertina caricata con successo' })
                            } else {
                              const error = await res.json()
                              throw new Error(error.error || 'Upload failed')
                            }
                          } catch (error: any) {
                            toast({ 
                              title: 'Error', 
                              description: error.message || 'Failed to upload image', 
                              variant: 'destructive' 
                            })
                          } finally {
                            setUploadingImages(false)
                          }
                        }}
                        disabled={uploadingImages}
                      />
                      {formData.coverImage && (
                        <div className="mt-2 relative inline-block">
                          <img src={formData.coverImage} alt="Cover" className="w-full max-w-md h-48 object-cover rounded-lg border-2 border-primary/20" />
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, coverImage: '' })}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label>Galleria Immagini</Label>
                      <p className="text-sm text-gray-500 mb-2">Aggiungi altre immagini del negozio (max 5)</p>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || [])
                          if (formData.galleryImages.length + files.length > 5) {
                            toast({ title: 'Error', description: 'Massimo 5 immagini nella galleria', variant: 'destructive' })
                            return
                          }
                          setUploadingImages(true)
                          try {
                            const newImages: string[] = []
                            for (const file of files) {
                              const uploadFormData = new FormData()
                              uploadFormData.append('file', file)
                              const res = await fetch('/api/upload', { method: 'POST', body: uploadFormData })
                              if (res.ok) {
                                const data = await res.json()
                                newImages.push(data.url)
                              } else {
                                const error = await res.json()
                                throw new Error(error.error || 'Upload failed')
                              }
                            }
                            setFormData({ ...formData, galleryImages: [...formData.galleryImages, ...newImages] })
                            toast({ title: 'Success', description: `${newImages.length} immagine/i caricata/e con successo` })
                          } catch (error: any) {
                            toast({ 
                              title: 'Error', 
                              description: error.message || 'Failed to upload images', 
                              variant: 'destructive' 
                            })
                          } finally {
                            setUploadingImages(false)
                          }
                        }}
                        disabled={uploadingImages}
                      />
                      {formData.galleryImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {formData.galleryImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt={`Gallery ${idx}`} className="w-full h-24 object-cover rounded-lg border-2 border-primary/20" />
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, galleryImages: formData.galleryImages.filter((_, i) => i !== idx) })}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Key (if existing shop) */}
                {existingShop?.apiKey && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">key</span>
                      Chrome Extension API Key
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 mb-2">
                        Use this key to connect the SafeTrade Chrome extension
                      </p>
                      <code className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                        {existingShop.apiKey}
                      </code>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary-dark"
                  disabled={saving}
                >
                  {saving 
                    ? 'Saving...' 
                    : existingShop 
                      ? 'Save Changes' 
                      : 'Create Shop'
                  }
                </Button>
              </form>
            </Card>

            {/* Benefits */}
            {!existingShop && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="glass-panel p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">
                    inventory_2
                  </span>
                  <h4 className="font-bold mb-1">Manage Inventory</h4>
                  <p className="text-sm text-gray-500">
                    Easily add and manage your card inventory
                  </p>
                </Card>
                <Card className="glass-panel p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">
                    verified
                  </span>
                  <h4 className="font-bold mb-1">SafeTrade Partner</h4>
                  <p className="text-sm text-gray-500">
                    Host secure P2P transactions in your store
                  </p>
                </Card>
                <Card className="glass-panel p-4 text-center">
                  <span className="material-symbols-outlined text-3xl text-primary mb-2">
                    extension
                  </span>
                  <h4 className="font-bold mb-1">Easy Import</h4>
                  <p className="text-sm text-gray-500">
                    Import from Cardmarket with our Chrome extension
                  </p>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

