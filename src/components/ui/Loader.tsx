'use client'

import { useEffect, useState } from 'react'

interface LoaderProps {
  onComplete?: () => void
  duration?: number
}

export function Loader({ onComplete, duration = 2000 }: LoaderProps) {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Animate progress
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(100, (elapsed / duration) * 100)
      setProgress(newProgress)

      if (newProgress >= 100) {
        setIsComplete(true)
        clearInterval(interval)
        
        // Fade out after a short delay
        setTimeout(() => {
          onComplete?.()
        }, 300)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [duration, onComplete])

  return (
    <div className={`loader-container fixed inset-0 z-[9999] bg-background-light flex items-center justify-center transition-opacity duration-500 ${isComplete ? 'opacity-0' : 'opacity-100'}`}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-primary/8 blur-3xl animate-float-reverse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Logo/Brand */}
        <div className="relative">
          <div className="liquid-glass px-8 py-6 rounded-3xl border border-white/80 backdrop-blur-3xl bg-white/60 shadow-liquid">
            <h1 className="text-5xl font-display font-black tracking-tighter text-primary">
              SafeTrade
            </h1>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 -z-10 bg-primary/20 blur-2xl rounded-3xl animate-pulse-glow"></div>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full bg-gradient-to-r from-primary via-orange-500 to-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Loading text */}
        <p className="text-sm font-medium text-slate-500 tracking-wide">
          Caricamento...
        </p>
      </div>
    </div>
  )
}

