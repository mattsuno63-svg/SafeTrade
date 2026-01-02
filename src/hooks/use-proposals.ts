'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useProposals(userId: string, type: 'sent' | 'received' = 'received') {
  return useQuery({
    queryKey: ['proposals', userId, type],
    queryFn: async () => {
      const res = await fetch(`/api/proposals?userId=${userId}&type=${type}`)
      if (!res.ok) throw new Error('Failed to fetch proposals')
      return res.json()
    },
    enabled: !!userId,
  })
}

export function useCreateProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create proposal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

export function useUpdateProposal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update proposal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] })
    },
  })
}

