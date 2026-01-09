'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface SubscriptionPlan {
  id: string
  name: string
  tier: 'FREE' | 'PREMIUM' | 'PRO'
  description: string
  priceMonthly: number
  priceYearly: number
  earlyAccessHours: number
  maxAlerts: number
  prioritySafeTrade: boolean
  instantNotifications: boolean
  premiumCommunity: boolean
  bulkListingTools: boolean
  priorityMonthlyLimit: number
}

export interface UserSubscription {
  id: string
  userId: string
  planId: string
  plan: SubscriptionPlan
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE'
  billingPeriod: 'MONTHLY' | 'YEARLY'
  startDate: string
  endDate: string | null
  cancelledAt: string | null
  priorityUsedThisMonth: number
}

export interface SubscriptionFeatures {
  earlyAccessHours: number
  maxAlerts: number
  prioritySafeTrade: boolean
  instantNotifications: boolean
  premiumCommunity: boolean
  bulkListingTools: boolean
  priorityMonthlyLimit: number
}

export interface SubscriptionResponse {
  subscription: UserSubscription | null
  currentPlan: SubscriptionPlan | null
  tier: 'FREE' | 'PREMIUM' | 'PRO'
  features: SubscriptionFeatures
}

// Hook per ottenere la subscription corrente dell'utente
export function useSubscription() {
  return useQuery<SubscriptionResponse>({
    queryKey: ['subscription', 'my'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/my')
      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in, return free tier
          return {
            subscription: null,
            currentPlan: null,
            tier: 'FREE' as const,
            features: {
              earlyAccessHours: 0,
              maxAlerts: 3,
              prioritySafeTrade: false,
              instantNotifications: false,
              premiumCommunity: false,
              bulkListingTools: false,
              priorityMonthlyLimit: 0,
            },
          }
        }
        throw new Error('Failed to fetch subscription')
      }
      return res.json()
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  })
}

// Hook per ottenere tutti i piani disponibili
export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[]>({
    queryKey: ['subscription', 'plans'],
    queryFn: async () => {
      const res = await fetch('/api/subscriptions/plans')
      if (!res.ok) throw new Error('Failed to fetch plans')
      return res.json()
    },
    staleTime: 300000, // 5 minutes
  })
}

// Hook per aggiornare subscription
export function useUpdateSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planName, billingPeriod }: { planName: string; billingPeriod?: 'MONTHLY' | 'YEARLY' }) => {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, billingPeriod }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update subscription')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })
}

// Hook per cancellare subscription
export function useCancelSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/subscriptions', {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to cancel subscription')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] })
    },
  })
}

// Utility per controllare se utente ha accesso a feature premium
export function hasFeature(features: SubscriptionFeatures | undefined, feature: keyof SubscriptionFeatures): boolean {
  if (!features) return false
  const value = features[feature]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0 || value === -1 // -1 = unlimited
  return false
}

// Utility per controllare tier
export function isPremiumOrAbove(tier: string | undefined): boolean {
  return tier === 'PREMIUM' || tier === 'PRO'
}

export function isProTier(tier: string | undefined): boolean {
  return tier === 'PRO'
}

