'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AdminNotification {
  id: string
  type: string
  referenceType: string
  referenceId: string
  title: string
  message: string
  priority: string
  createdAt: string
  isRead: boolean
}

export function AdminNotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    
    // Polling ogni 30 secondi per nuove notifiche
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/admin/notifications?unread=false&limit=10')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.items || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (notifId: string) => {
    try {
      await fetch(`/api/admin/notifications/${notifId}/read`, {
        method: 'POST',
      })
      // Aggiorna lista locale
      setNotifications(prev => 
        prev.map(n => n.id === notifId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleNotificationClick = (notif: AdminNotification) => {
    // Marca come letto
    if (!notif.isRead) {
      handleMarkRead(notif.id)
    }

    // Naviga alla risorsa
    if (notif.referenceType === 'PENDING_RELEASE') {
      router.push('/admin/pending-releases')
    } else if (notif.referenceType === 'DISPUTE') {
      router.push('/admin/reports')
    }
    
    setOpen(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'NORMAL':
        return 'bg-blue-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PENDING_RELEASE':
        return 'payments'
      case 'DISPUTE_ESCALATED':
        return 'gavel'
      case 'WITHDRAWAL_REQUEST':
        return 'account_balance_wallet'
      case 'HUB_VERIFICATION':
        return 'verified_user'
      default:
        return 'notifications'
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}g fa`
    if (diffHours > 0) return `${diffHours}h fa`
    if (diffMins > 0) return `${diffMins}m fa`
    return 'Ora'
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        title="Notifiche Admin"
      >
        <span className="material-symbols-outlined text-emerald-500">shield_person</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          
          {/* Dropdown */}
          <Card className="absolute right-0 top-12 w-96 max-h-[500px] overflow-hidden z-50 glass-panel shadow-2xl">
            <CardContent className="p-0">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500">admin_panel_settings</span>
                    <h3 className="font-bold">Notifiche Admin</h3>
                  </div>
                  {unreadCount > 0 && (
                    <Badge className="bg-red-500">{unreadCount} non lette</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-gray-500">
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    <p className="mt-2 text-sm">Caricamento...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block text-gray-300">inbox</span>
                    <p className="text-sm">Nessuna notifica</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-white/10">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-emerald-500/5 border-l-4 border-l-emerald-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notif)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${getPriorityColor(notif.priority)}`}>
                            <span className="material-symbols-outlined text-sm">
                              {getTypeIcon(notif.type)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm truncate">{notif.title}</span>
                              {notif.priority === 'URGENT' && (
                                <span className="material-symbols-outlined text-red-500 text-sm animate-pulse">
                                  priority_high
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatTimeAgo(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-gray-800/50">
                <Button
                  variant="ghost"
                  className="w-full text-sm text-primary hover:bg-primary/10"
                  onClick={() => {
                    router.push('/admin/pending-releases')
                    setOpen(false)
                  }}
                >
                  Vai a Pending Releases
                  <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

