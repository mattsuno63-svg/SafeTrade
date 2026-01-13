'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface EscrowDemoProps {
  isItalian: boolean
}

export function EscrowDemo({ isItalian }: EscrowDemoProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const steps = [
    {
      title: isItalian ? 'Accordo' : 'Agreement',
      icon: 'handshake',
      color: 'primary',
    },
    {
      title: isItalian ? 'Escrow' : 'Escrow',
      icon: 'account_balance_wallet',
      color: 'blue-500',
    },
    {
      title: isItalian ? 'Verifica' : 'Verification',
      icon: 'verified_user',
      color: 'purple-500',
    },
    {
      title: isItalian ? 'Completato' : 'Completed',
      icon: 'check_circle',
      color: 'green-500',
    },
  ]

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1)
      }, 3000)
      return () => clearTimeout(timer)
    } else if (currentStep === steps.length - 1) {
      setIsPlaying(false)
    }
  }, [currentStep, isPlaying, steps.length])

  const handlePlay = () => {
    setCurrentStep(0)
    setIsPlaying(true)
  }

  const handleReset = () => {
    setCurrentStep(0)
    setIsPlaying(false)
  }

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; icon: string }> = {
      'primary': {
        bg: 'bg-primary/10',
        border: 'border-primary/30',
        icon: 'bg-primary',
      },
      'blue-500': {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: 'bg-blue-500',
      },
      'purple-500': {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        icon: 'bg-purple-500',
      },
      'green-500': {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        icon: 'bg-green-500',
      },
    }
    return colors[color] || colors['primary']
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Demo Container - Apple Style */}
      <div 
        className="p-16 rounded-3xl relative overflow-hidden mb-12"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-100">
          <div 
            className="h-full bg-primary transition-all duration-700 ease-out"
            style={{
              width: `${((currentStep + 1) / steps.length) * 100}%`,
            }}
          />
        </div>

        {/* Simplified Flow */}
        <div className="relative mb-12">
          {/* Steps Timeline - Horizontal */}
          <div className="flex items-center justify-between mb-16">
            {steps.map((step, idx) => {
              const config = getColorClasses(step.color)
              const isActive = idx === currentStep
              const isCompleted = idx < currentStep
              
              return (
                <div key={idx} className="flex-1 relative">
                  {/* Step Circle */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ease-out ${
                        isActive
                          ? `${config.icon} text-white scale-110 shadow-lg`
                          : isCompleted
                          ? `${config.bg} ${config.border} border-2 text-slate-400 scale-100`
                          : 'bg-slate-100 border-2 border-slate-200 text-slate-300 scale-100'
                      }`}
                    >
                      {isCompleted ? (
                        <span className="material-symbols-outlined text-3xl text-white bg-green-500 rounded-full p-1">
                          check
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-3xl">
                          {step.icon}
                        </span>
                      )}
                    </div>
                    <h4 className={`font-black text-sm mb-1 transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </h4>
                  </div>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div className="absolute top-10 left-1/2 w-full h-0.5 -z-10">
                      <div 
                        className={`h-full transition-all duration-700 ease-out ${
                          isCompleted ? 'bg-primary' : 'bg-slate-200'
                        }`}
                        style={{
                          width: isCompleted ? '100%' : '0%',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Central Info Display */}
          <div className="text-center">
            <div 
              className="inline-block p-8 rounded-2xl transition-all duration-500 ease-out"
              style={{
                background: currentStep >= 1 && currentStep < 3
                  ? 'rgba(255, 107, 53, 0.08)'
                  : currentStep >= 3
                  ? 'rgba(34, 197, 94, 0.08)'
                  : 'rgba(248, 250, 252, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
              }}
            >
              <div className="text-5xl font-black text-slate-900 mb-2">
                {currentStep >= 1 ? '€100' : '€0'}
              </div>
              <div className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                {isItalian ? 'In Escrow' : 'In Escrow'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={handlePlay}
            disabled={isPlaying}
            className="px-10 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all shadow-lg hover:shadow-xl"
          >
            <span className="material-symbols-outlined mr-2">play_arrow</span>
            {isItalian ? 'Riproduci' : 'Play'}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            className="px-10 py-4 border-2 font-black rounded-2xl bg-white/80 backdrop-blur-xl"
          >
            <span className="material-symbols-outlined mr-2">refresh</span>
            {isItalian ? 'Ripristina' : 'Reset'}
          </Button>
        </div>
      </div>
    </div>
  )
}
