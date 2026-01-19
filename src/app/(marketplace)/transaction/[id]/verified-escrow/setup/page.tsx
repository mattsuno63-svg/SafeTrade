'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * DEPRECATED: Questa pagina è stata sostituita da /verified-escrow/generate-label
 * Reindirizza automaticamente alla nuova pagina
 */
export default function VerifiedEscrowSetupPage() {
  const router = useRouter()
  const params = useParams()
  const transactionId = params.id as string

  useEffect(() => {
    // Reindirizza automaticamente alla nuova pagina di generazione etichette
    if (transactionId) {
      router.replace(`/transaction/${transactionId}/verified-escrow/generate-label`)
    }
  }, [transactionId, router])

  // Mostra un messaggio di caricamento durante il redirect
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Reindirizzamento...</p>
      </div>
    </div>
  )
}
