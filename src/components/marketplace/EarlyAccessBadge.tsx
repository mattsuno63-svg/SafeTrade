'use client'

import { Badge } from '@/components/ui/badge'

interface EarlyAccessBadgeProps {
  hoursRemaining?: number | null
  className?: string
}

export function EarlyAccessBadge({ hoursRemaining, className = '' }: EarlyAccessBadgeProps) {
  if (hoursRemaining === null || hoursRemaining === undefined) return null

  return (
    <Badge 
      className={`bg-gradient-to-r from-orange-500 to-purple-500 text-white border-0 text-xs font-bold animate-pulse ${className}`}
    >
      <span className="material-symbols-outlined text-sm mr-1">bolt</span>
      {hoursRemaining > 0 ? (
        <>EARLY ACCESS • {hoursRemaining}h</>
      ) : (
        <>EARLY ACCESS</>
      )}
    </Badge>
  )
}

export function PremiumRequiredBadge({ className = '' }: { className?: string }) {
  return (
    <Badge 
      className={`bg-gray-500/80 text-white border-0 text-xs ${className}`}
    >
      <span className="material-symbols-outlined text-sm mr-1">lock</span>
      Premium Only
    </Badge>
  )
}

export function PremiumMemberBadge({ tier, className = '' }: { tier: 'PREMIUM' | 'PRO'; className?: string }) {
  const colors = {
    PREMIUM: 'bg-gradient-to-r from-yellow-500 to-orange-500',
    PRO: 'bg-gradient-to-r from-purple-500 to-blue-500',
  }
  
  const icons = {
    PREMIUM: 'workspace_premium',
    PRO: 'verified',
  }

  return (
    <Badge 
      className={`${colors[tier]} text-white border-0 text-xs font-bold ${className}`}
    >
      <span className="material-symbols-outlined text-sm mr-1">{icons[tier]}</span>
      {tier}
    </Badge>
  )
}

