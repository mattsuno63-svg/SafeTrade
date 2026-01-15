'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animazione discreta per il rettangolo Escrow
 * Mostra il processo: Fondi depositati → Verifica → Completato
 * Senza cambiare layout o dimensioni
 */
export function EscrowAnimation() {
  const [step, setStep] = useState(0) // 0: lock, 1: loading, 2: success
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Ciclo animazione: lock → loading → success → lock (loop)
    intervalRef.current = setInterval(() => {
      setStep((prev) => (prev + 1) % 3)
    }, 3000) // Cambia step ogni 3 secondi

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Progress bar animation state
  const [progressWidth, setProgressWidth] = useState(0)

  useEffect(() => {
    if (step === 1) {
      // Anima progress bar quando è in loading
      setProgressWidth(0)
      const timer = setTimeout(() => setProgressWidth(100), 100)
      return () => clearTimeout(timer)
    } else {
      setProgressWidth(0)
    }
  }, [step])

  const getIcon = () => {
    switch (step) {
      case 0:
        return (
          <span className="material-symbols-outlined text-primary escrow-icon-animated">
            lock
          </span>
        )
      case 1:
        return (
          <span className="material-symbols-outlined text-primary escrow-icon-animated animate-spin">
            sync
          </span>
        )
      case 2:
        return (
          <span className="material-symbols-outlined text-green-500 escrow-icon-animated">
            check_circle
          </span>
        )
      default:
        return (
          <span className="material-symbols-outlined text-primary escrow-icon-animated">
            lock
          </span>
        )
    }
  }

  const getText = () => {
    switch (step) {
      case 0:
        return 'Fondi bloccati in Escrow'
      case 1:
        return 'Verifica in corso...'
      case 2:
        return 'Transazione completata'
      default:
        return 'Fondi bloccati in Escrow'
    }
  }

  const getColor = () => {
    switch (step) {
      case 0:
        return 'bg-primary/10 border-primary/20'
      case 1:
        return 'bg-blue-500/10 border-blue-500/20'
      case 2:
        return 'bg-green-500/10 border-green-500/20'
      default:
        return 'bg-primary/10 border-primary/20'
    }
  }

  return (
    <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-500 ${getColor()}`}>
      {getIcon()}
      <div className="flex-1">
        <span className={`font-bold transition-colors duration-500 ${
          step === 0 ? 'text-primary' : step === 1 ? 'text-blue-500' : 'text-green-500'
        }`}>
          {getText()}
        </span>
        {/* Progress bar discreta */}
        {step === 1 && (
          <div className="mt-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-2000 ease-out" 
              style={{ width: `${progressWidth}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  )
}

