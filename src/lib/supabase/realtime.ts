import { createClient } from './client'
import { useEffect, useState } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook for subscribing to real-time database changes
 */
export function useRealtimeSubscription<T>(
  table: string,
  filter?: string,
  callback?: (payload: any) => void
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    // Initial fetch
    const fetchData = async () => {
      try {
        let query = supabase.from(table).select('*')
        
        if (filter) {
          // Parse filter like "user_id=eq.123"
          const [column, operator, value] = filter.split(/[.=]/)
          if (operator === 'eq') {
            query = query.eq(column, value)
          }
        }

        const { data: initialData, error } = await query
        if (error) throw error
        setData(initialData as T[])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Subscribe to changes
    channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter,
        },
        (payload) => {
          if (callback) {
            callback(payload)
          }
          
          // Update local state
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as T])
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item: any) =>
                item.id === payload.new.id ? (payload.new as T) : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item: any) => (item as any).id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter, supabase, callback])

  return { data, loading }
}

/**
 * Hook for real-time notifications
 */
export function useNotifications(userId: string) {
  return useRealtimeSubscription(
    'notifications',
    `user_id=eq.${userId}`,
    (payload) => {
      // You can add custom logic here, like showing toast notifications
      console.log('New notification:', payload)
    }
  )
}

/**
 * Hook for real-time proposals
 */
export function useProposals(userId: string, type: 'sent' | 'received' = 'received') {
  const filter = type === 'received' 
    ? `receiver_id=eq.${userId}`
    : `proposer_id=eq.${userId}`
  
  return useRealtimeSubscription('proposals', filter)
}

