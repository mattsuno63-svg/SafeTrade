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
import { useQuery } from '@tanstack/react-query'

interface Topic {
  id: string
  name: string
  slug: string
  icon: string
  isPremiumOnly: boolean
  isLocked?: boolean
}

export default function SubmitPostPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    topicId: '',
  })

  // Fetch topics/subreddits
  const { data: topics, isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: () => fetch('/api/community').then(res => res.json()),
    enabled: !!user,
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login?redirect=/community/submit')
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.topicId) {
      toast({
        title: 'Errore',
        description: 'Compila tutti i campi obbligatori',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create post')
      }

      toast({
        title: data.message || 'Post creato!',
        description: data.status === 'pending' 
          ? 'Il tuo post è in attesa di approvazione'
          : 'Il tuo post è stato pubblicato',
      })

      router.push(`/community/posts/${data.id}`)
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile creare il post',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (userLoading || topicsLoading) {
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
          <h1 className="text-3xl font-bold mb-2">Crea un Thread</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Condividi qualcosa con la community
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="glass-panel p-6 space-y-6">
            {/* Subreddit Selection */}
            <div>
              <Label htmlFor="topicId">Scegli un Subreddit *</Label>
              <select
                id="topicId"
                value={formData.topicId}
                onChange={(e) => setFormData({ ...formData, topicId: e.target.value })}
                className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 mt-1"
                required
              >
                <option value="">Seleziona un subreddit...</option>
                {topics?.map((topic) => (
                  <option key={topic.id} value={topic.id} disabled={topic.isLocked}>
                    {topic.isLocked ? '🔒 ' : ''}
                    {topic.icon && <span className="material-symbols-outlined">{topic.icon}</span>}
                    {topic.name}
                    {topic.isPremiumOnly && ' (Premium)'}
                  </option>
                ))}
              </select>
              {topics?.some(t => t.isLocked) && (
                <p className="text-xs text-gray-500 mt-1">
                  I subreddit bloccati sono riservati ai membri Premium
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Inserisci un titolo accattivante..."
                className="h-12 mt-1"
                maxLength={300}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/300 caratteri
              </p>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content">Contenuto *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Scrivi il contenuto del tuo thread..."
                className="mt-1 min-h-[200px]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Puoi usare Markdown per formattare il testo
              </p>
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
                disabled={submitting}
              >
                {submitting ? 'Pubblicando...' : 'Pubblica Thread'}
              </Button>
            </div>
          </Card>
        </form>
      </main>
    </div>
  )
}

