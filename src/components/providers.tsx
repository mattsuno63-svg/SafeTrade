'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { OnboardingProvider } from '@/components/onboarding/OnboardingProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <OnboardingProvider>
          {children}
        </OnboardingProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}

