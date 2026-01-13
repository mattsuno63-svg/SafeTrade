'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader } from '@/components/ui/Loader'

interface OnboardingProviderProps {
  children: React.ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [showLoader, setShowLoader] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Check if onboarding is completed
    const onboardingCompleted = localStorage.getItem('onboarding_completed')
    
    // Don't show loader/onboarding on these pages
    const skipPages = ['/onboarding', '/login', '/signup', '/api', '/dashboard']
    const shouldSkip = skipPages.some(page => pathname?.startsWith(page))

    // Only show loader on homepage for first-time users
    if (onboardingCompleted || shouldSkip || pathname !== '/') {
      setShowLoader(false)
    }
  }, [pathname])

  const handleLoaderComplete = () => {
    setShowLoader(false)
    
    // If onboarding should be shown, redirect to onboarding page
    const onboardingCompleted = localStorage.getItem('onboarding_completed')
    if (!onboardingCompleted && pathname === '/') {
      router.push('/onboarding')
    }
  }

  // Show loader on initial load (only on homepage for new users)
  if (showLoader && pathname === '/') {
    return <Loader onComplete={handleLoaderComplete} duration={1500} />
  }

  return <>{children}</>
}

