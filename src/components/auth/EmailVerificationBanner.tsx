'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Mail, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EmailVerificationBannerProps {
  email: string
  onDismiss?: () => void
}

export function EmailVerificationBanner({ email, onDismiss }: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false)
  const { toast } = useToast()

  const handleResend = async () => {
    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification email')
      }

      toast({
        title: 'Email inviata',
        description: 'Controlla la tua casella email per il link di verifica.',
      })
    } catch (error: any) {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile inviare l\'email di verifica.',
        variant: 'destructive',
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 mb-4">
      <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-900 dark:text-orange-100">
        Verifica la tua email
      </AlertTitle>
      <AlertDescription className="text-orange-800 dark:text-orange-200 mt-2">
        <p className="mb-3">
          Per utilizzare tutte le funzionalità di SafeTrade, verifica il tuo indirizzo email{' '}
          <strong>{email}</strong>.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={handleResend}
            disabled={isResending}
            size="sm"
            variant="outline"
            className="border-orange-600 text-orange-700 hover:bg-orange-100 dark:border-orange-400 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            {isResending ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Invio in corso...
              </>
            ) : (
              <>
                <Mail className="h-3 w-3 mr-2" />
                Reinvia email
              </>
            )}
          </Button>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              size="sm"
              variant="ghost"
              className="text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-900/30"
            >
              <X className="h-3 w-3 mr-2" />
              Chiudi
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}

