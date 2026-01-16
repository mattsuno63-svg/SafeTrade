'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function CreateSubredditPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'tag',
    rules: '',
    isNSFW: false,
    isPremiumOnly: false,
    requiredTier: '',
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login?redirect=/community/create-subreddit')
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || formData.name.length < 3) {
      toast({
        title: 'Errore',
        description: 'Il nome del subreddit deve essere di almeno 3 caratteri',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/community/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requiredTier: formData.requiredTier || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create subreddit')
      }

      toast({
        title: 'Subreddit creato!',
        description: `r/${data.slug} è stato creato con successo`,
      })

      router.push(`/community?topic=${data.slug}`)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il subreddit',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // Generate preview slug
  const previewSlug = formData.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-4"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Torna alla Community
          </button>
          <h1 className="text-3xl font-bold mb-2">Crea un Subreddit</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Crea una nuova community per discutere di un argomento specifico
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass-panel p-6 space-y-6">
            {/* Name */}
            <div>
              <Label htmlFor="name">Nome del Subreddit *</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-500">r/</span>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="es. pokemon-tcg"
                  className="h-12 flex-1"
                  maxLength={21}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.name.length}/21 caratteri • Slug: r/{previewSlug || 'nome-subreddit'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Il nome può contenere solo lettere, numeri e trattini
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Descrizione</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrivi di cosa tratta questo subreddit..."
                className="mt-1"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 caratteri
              </p>
            </div>

            {/* Icon */}
            <div>
              <Label htmlFor="icon">Icona (Material Symbol)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="tag"
                className="h-12 mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Nome dell'icona Material Symbol (es. tag, forum, emoji_events)
              </p>
            </div>

            {/* Rules */}
            <div>
              <Label htmlFor="rules">Regole del Subreddit</Label>
              <Textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Scrivi le regole per questo subreddit..."
                className="mt-1"
                rows={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                Le regole aiutano a mantenere la community sana e rispettosa
              </p>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isNSFW"
                  checked={formData.isNSFW}
                  onChange={(e) => setFormData({ ...formData, isNSFW: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isNSFW" className="cursor-pointer">
                  Contenuto NSFW (Not Safe For Work)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPremiumOnly"
                  checked={formData.isPremiumOnly}
                  onChange={(e) => setFormData({ ...formData, isPremiumOnly: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="isPremiumOnly" className="cursor-pointer">
                  Solo per membri Premium
                </Label>
              </div>

              {formData.isPremiumOnly && (
                <div>
                  <Label htmlFor="requiredTier">Tier Richiesto</Label>
                  <select
                    id="requiredTier"
                    value={formData.requiredTier}
                    onChange={(e) => setFormData({ ...formData, requiredTier: e.target.value })}
                    className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mt-1"
                  >
                    <option value="">PREMIUM (default)</option>
                    <option value="PRO">PRO</option>
                  </select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                Annulla
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-dark"
                disabled={creating}
              >
                {creating ? 'Creando...' : 'Crea Subreddit'}
              </Button>
            </div>
          </Card>
        </form>
      </main>
    </div>
  )
}

