'use client'

import { useState } from 'react'
import { useNotifications, useMarkNotificationRead } from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface NotificationBellProps {
  userId: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useNotifications(userId)
  const markRead = useMarkNotificationRead()

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0

  const handleMarkRead = async (id: string) => {
    await markRead.mutateAsync(id)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto z-50 glass-panel">
            <CardContent className="p-0">
              <div className="p-4 border-b border-gray-200 dark:border-white/10">
                <h3 className="font-bold">Notifications</h3>
              </div>
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No notifications</div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {notifications.map((notif: any) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer ${
                        !notif.read ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => {
                        if (!notif.read) handleMarkRead(notif.id)
                        if (notif.link) window.location.href = notif.link
                      }}
                    >
                      <div className="font-bold text-sm mb-1">{notif.title}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {notif.message}
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

