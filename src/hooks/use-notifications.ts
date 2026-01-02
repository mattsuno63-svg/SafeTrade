'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useNotifications(userId: string) {
  const queryClient = useQueryClient()
  
  // Fetch notifications via API
  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] New notification:', payload)
          // Invalidate the query to refetch notifications
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Notification',
          filter: `userId=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Notification updated:', payload)
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to mark notification as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

