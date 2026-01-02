'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading, refreshSession } = useUser()
  
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    avatar: '',
  })
  
  // Track if the form has been initialized to avoid overwriting user input
  const formInitializedRef = useRef(false)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }

    // Only initialize form once when user first loads
    if (user && !formInitializedRef.current) {
      formInitializedRef.current = true
      setFormData({
        name: user.user_metadata?.name || '',
        avatar: user.user_metadata?.avatar_url || '',
      })
    }
  }, [user, userLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update profile')
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })

      // Allow form to be reinitialized with new user data
      formInitializedRef.current = false
      refreshSession()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
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
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Profile</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your personal information
              </p>
            </div>

            {/* Avatar Section */}
            <Card className="glass-panel p-6 mb-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        {(formData.name || user?.email || 'U').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary-dark transition-colors">
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{formData.name || 'No name set'}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{user?.email}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('it-IT', {
                      month: 'long',
                      year: 'numeric',
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Edit Form */}
            <Card className="glass-panel p-6">
              <h3 className="font-bold text-lg mb-6">Edit Profile</h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-12"
                  />
                  <p className="text-sm text-gray-500">
                    This is how other users will see you
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="h-12 bg-gray-100 dark:bg-gray-800"
                  />
                  <p className="text-sm text-gray-500">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                    className="h-12"
                  />
                  <p className="text-sm text-gray-500">
                    Enter a URL to your profile picture
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary-dark"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </Card>

            {/* Stats Section */}
            <Card className="glass-panel p-6 mt-6">
              <h3 className="font-bold text-lg mb-4">Your Stats</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Listings</div>
                </div>
                <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                  <div className="text-3xl font-bold text-primary">0</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Trades</div>
                </div>
                <div className="p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                  <div className="text-3xl font-bold text-yellow-500">⭐ N/A</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Rating</div>
                </div>
              </div>
            </Card>

            {/* Quick Links */}
            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.push('/dashboard/listings')}
                className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">inventory_2</span>
                  <span className="font-medium">My Listings</span>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/proposals/received')}
                className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">inbox</span>
                  <span className="font-medium">Proposals Received</span>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/proposals/sent')}
                className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">send</span>
                  <span className="font-medium">Proposals Sent</span>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-white/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">settings</span>
                  <span className="font-medium">Account Settings</span>
                </div>
                <span className="material-symbols-outlined text-gray-400">chevron_right</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

