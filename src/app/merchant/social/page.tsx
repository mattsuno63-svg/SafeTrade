'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function MerchantSocialPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    tiktokUrl: '',
  })

  const fetchShop = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/merchant/shop')
      if (res.ok) {
        const shop = await res.json()
        setFormData({
          facebookUrl: shop.facebookUrl || '',
          instagramUrl: shop.instagramUrl || '',
          twitterUrl: shop.twitterUrl || '',
          youtubeUrl: shop.youtubeUrl || '',
          tiktokUrl: shop.tiktokUrl || '',
        })
      } else if (res.status === 404) {
        // No shop found - redirect to setup
        toast({
          title: 'Nessun negozio trovato',
          description: 'Configura prima il tuo negozio',
          variant: 'destructive',
        })
        router.push('/merchant/setup')
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || 'Failed to fetch shop')
      }
    } catch (error: any) {
      console.error('Error fetching shop:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile caricare i dati del negozio',
        variant: 'destructive',
      })
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        router.push('/merchant/setup')
      }
    } finally {
      setLoading(false)
    }
  }, [router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchShop()
    }
  }, [user, userLoading, router, fetchShop])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/merchant/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error('Failed to update social links')
      }

      toast({
        title: 'Success',
        description: 'Link social aggiornati con successo',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update social links',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
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

  const socialPlatforms = [
    {
      key: 'facebookUrl',
      label: 'Facebook',
      icon: 'facebook',
      placeholder: 'https://www.facebook.com/negozio',
      color: 'text-blue-600',
    },
    {
      key: 'instagramUrl',
      label: 'Instagram',
      icon: 'photo_camera',
      placeholder: 'https://www.instagram.com/negozio',
      color: 'text-pink-600',
    },
    {
      key: 'twitterUrl',
      label: 'Twitter/X',
      icon: 'chat',
      placeholder: 'https://twitter.com/negozio',
      color: 'text-blue-400',
    },
    {
      key: 'youtubeUrl',
      label: 'YouTube',
      icon: 'play_circle',
      placeholder: 'https://www.youtube.com/@negozio',
      color: 'text-red-600',
    },
    {
      key: 'tiktokUrl',
      label: 'TikTok',
      icon: 'music_note',
      placeholder: 'https://www.tiktok.com/@negozio',
      color: 'text-black dark:text-white',
    },
  ]

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Social Media</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Collega i tuoi profili social al negozio. I link appariranno nella landing page pubblica.
              </p>
            </div>

            <Card className="glass-panel p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {socialPlatforms.map((platform) => (
                  <div key={platform.key} className="space-y-2">
                    <Label htmlFor={platform.key} className="flex items-center gap-2">
                      <span className={`material-symbols-outlined ${platform.color}`}>
                        {platform.icon}
                      </span>
                      {platform.label}
                    </Label>
                    <Input
                      id={platform.key}
                      type="url"
                      value={formData[platform.key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [platform.key]: e.target.value })}
                      placeholder={platform.placeholder}
                      className="h-12"
                    />
                  </div>
                ))}

                <div className="pt-4 flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/merchant/shop')}
                    className="flex-1"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-primary hover:bg-primary-dark"
                  >
                    {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Preview */}
            <Card className="glass-panel p-6 mt-6">
              <h3 className="font-bold text-lg mb-4">Anteprima Landing Page</h3>
              <div className="flex flex-wrap gap-4">
                {socialPlatforms.map((platform) => {
                  const url = formData[platform.key as keyof typeof formData]
                  if (!url) return null
                  return (
                    <a
                      key={platform.key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className={`material-symbols-outlined ${platform.color}`}>
                        {platform.icon}
                      </span>
                      <span className="font-medium">{platform.label}</span>
                    </a>
                  )
                })}
                {socialPlatforms.every(p => !formData[p.key as keyof typeof formData]) && (
                  <p className="text-sm text-gray-500 italic">
                    Aggiungi link social per vedere l'anteprima
                  </p>
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

