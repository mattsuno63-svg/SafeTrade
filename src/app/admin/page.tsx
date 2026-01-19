'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Stats {
  users: number
  listings: number
  transactions: number
  shops: number
  pendingApplications: number
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const checkAdminAccess = useCallback(async () => {
    if (isFetchingRef.current || hasFetchedRef.current) return
    isFetchingRef.current = true

    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) {
        toast({
          title: 'Access Denied',
          description: 'You do not have admin privileges',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }
      
      if (res.ok) {
        const data = await res.json()
        setStats(data)
        hasFetchedRef.current = true
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [router, toast])

  useEffect(() => {
    if (!user && !userLoading) {
      router.push(`/login?redirect=${encodeURIComponent('/admin')}`)
      return
    }
    
    if (user && !userLoading) {
      checkAdminAccess()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userLoading])

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

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-red-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-4xl text-red-500">admin_panel_settings</span>
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage SafeTrade platform
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-blue-500 mb-2">group</span>
                <div className="text-3xl font-bold">{stats?.users || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Users</div>
              </Card>
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-green-500 mb-2">inventory_2</span>
                <div className="text-3xl font-bold">{stats?.listings || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Listings</div>
              </Card>
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-purple-500 mb-2">handshake</span>
                <div className="text-3xl font-bold">{stats?.transactions || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Transactions</div>
              </Card>
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-orange-500 mb-2">store</span>
                <div className="text-3xl font-bold">{stats?.shops || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Shops</div>
              </Card>
              <Card className="glass-panel p-6 text-center">
                <span className="material-symbols-outlined text-3xl text-yellow-500 mb-2">pending_actions</span>
                <div className="text-3xl font-bold">{stats?.pendingApplications || 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/admin/users">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <span className="material-symbols-outlined text-blue-500">manage_accounts</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">User Management</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        View and manage user accounts
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/applications">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/30 transition-colors">
                      <span className="material-symbols-outlined text-yellow-500">assignment</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Merchant Applications</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Review and approve merchant requests
                      </p>
                    </div>
                    {stats?.pendingApplications ? (
                      <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {stats.pendingApplications}
                      </span>
                    ) : null}
                  </div>
                </Card>
              </Link>

              <Link href="/admin/shops">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                      <span className="material-symbols-outlined text-orange-500">store</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Shop Management</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Manage partner stores
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/listings">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                      <span className="material-symbols-outlined text-green-500">inventory_2</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Listing Moderation</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Review and moderate listings
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/transactions">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                      <span className="material-symbols-outlined text-purple-500">receipt_long</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Transactions</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        View all SafeTrade transactions
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/pending-releases">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                      <span className="material-symbols-outlined text-emerald-500">payments</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Pending Releases</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Approve fund releases (manual approval required)
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/disputes">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group border-2 border-red-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                      <span className="material-symbols-outlined text-red-500">gavel</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Disputes</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestisci dispute tra buyer e seller
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/reports">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
                      <span className="material-symbols-outlined text-orange-500">flag</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Reports</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Handle user reports
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/hub">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group border-2 border-cyan-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                      <span className="material-symbols-outlined text-cyan-500">warehouse</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Hub Escrow</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestisci pacchi ricevuti, verifica e spedisci
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/insurance">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group border-2 border-emerald-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                      <span className="material-symbols-outlined text-emerald-500">shield</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Assicurazioni</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Gestisci assicurazioni e sinistri
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/audit-log">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-500/20 flex items-center justify-center group-hover:bg-slate-500/30 transition-colors">
                      <span className="material-symbols-outlined text-slate-500">history</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Audit Log</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Cronologia azioni finanziarie
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/admin/vault/requests">
                <Card className="glass-panel p-6 hover:shadow-lg transition-all cursor-pointer group border-2 border-cyan-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center group-hover:bg-cyan-500/30 transition-colors">
                      <span className="material-symbols-outlined text-cyan-500">inventory_2</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Richieste Teche Vault</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Rivedi e approva richieste teche dai merchant
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* Recent Activity */}
            <Card className="glass-panel p-6 mt-8">
              <h3 className="font-bold text-lg mb-4">Recent Activity</h3>
              <div className="text-center py-8 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2 block">history</span>
                <p>Activity log will appear here</p>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

