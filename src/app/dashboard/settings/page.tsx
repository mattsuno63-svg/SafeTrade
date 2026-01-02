'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { createClient } from '@/lib/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // Notification settings (mock for now)
  const [notifications, setNotifications] = useState({
    email: true,
    proposals: true,
    transactions: true,
    marketing: false,
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
    }
  }, [user, userLoading, router])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      })
      return
    }

    setChangingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      })

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Password changed successfully',
      })

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return
    }

    if (!confirm('This will permanently delete all your listings, proposals, and data. Continue?')) {
      return
    }

    toast({
      title: 'Info',
      description: 'Account deletion requires admin approval. Please contact support.',
    })
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
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>

            {/* Account Info */}
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Email</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">Account Type</span>
                  <span className="font-medium">User</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                  <span className="font-medium">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString('it-IT')
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Change Password */}
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">lock</span>
                Change Password
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary-dark"
                  disabled={changingPassword}
                >
                  {changingPassword ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </Card>

            {/* Notifications */}
            <Card className="glass-panel p-6 mb-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications</span>
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Proposal Updates</p>
                    <p className="text-sm text-gray-500">When you receive or your proposals are updated</p>
                  </div>
                  <Switch
                    checked={notifications.proposals}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, proposals: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Transaction Updates</p>
                    <p className="text-sm text-gray-500">SafeTrade transaction status changes</p>
                  </div>
                  <Switch
                    checked={notifications.transactions}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, transactions: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing</p>
                    <p className="text-sm text-gray-500">News, offers, and updates</p>
                  </div>
                  <Switch
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, marketing: checked })}
                  />
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="glass-panel p-6 border-red-200 dark:border-red-900">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined">warning</span>
                Danger Zone
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                variant="outline"
                onClick={handleDeleteAccount}
                className="border-red-500 text-red-500 hover:bg-red-500/10"
              >
                Delete Account
              </Button>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

