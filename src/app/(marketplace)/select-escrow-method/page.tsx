'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

function SelectEscrowMethodContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const proposalId = searchParams.get('proposalId')
  const [loading, setLoading] = useState(false)

  const handleSelectEscrowType = async (escrowType: 'LOCAL' | 'VERIFIED') => {
    if (!proposalId) {
      toast({
        title: 'Errore',
        description: 'ID proposta mancante',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      if (escrowType === 'VERIFIED') {
        // For VERIFIED escrow, create transaction immediately (no shop selection needed)
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposalId,
            escrowType: 'VERIFIED',
          }),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Errore nella creazione della transazione')
        }

        const transaction = await res.json()

        // Redirect to Verified Escrow setup page
        router.push(`/transaction/${transaction.id}/verified-escrow/generate-label`)
      } else {
        // For LOCAL escrow, redirect to store selection first (transaction will be created after appointment selection)
        // Store escrowType in sessionStorage or pass via query param
        router.push(`/select-store?proposalId=${proposalId}&escrowType=LOCAL`)
      }
    } catch (error: any) {
      console.error('Error selecting escrow type:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile selezionare il tipo di escrow',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">security</span>
              </div>
              <h1 className="text-3xl font-bold mb-2">Scegli il Metodo di Escrow</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Seleziona come vuoi proteggere la tua transazione
              </p>
            </div>

            {/* Escrow Options */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Escrow Locale */}
              <Card className="glass-panel p-8 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-blue-600 dark:text-blue-400">store</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Escrow Locale</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Incontro fisico in un negozio partner SafeTrade nella tua zona
                  </p>
                  <ul className="text-left space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Verifica immediata in negozio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Scambio diretto buyer-seller</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Nessun costo di spedizione</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSelectEscrowType('LOCAL')}
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                  >
                    Seleziona Escrow Locale
                  </Button>
                </div>
              </Card>

              {/* Verified Escrow */}
              <Card className="glass-panel p-8 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1 border-2 border-primary/20">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-primary">verified</span>
                  </div>
                  <div className="mb-2">
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full mb-2">
                      CONSIGLIATO
                    </span>
                    <h3 className="text-2xl font-bold">Verified Escrow</h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Verifica professionale garantita dal team SafeTrade
                  </p>
                  <ul className="text-left space-y-2 mb-6 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Verifica professionale della carta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Foto e report dettagliati</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Massima sicurezza e garanzia</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
                      <span>Disponibile ovunque in Italia</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSelectEscrowType('VERIFIED')}
                    className="w-full bg-primary hover:bg-primary-dark"
                    disabled={loading}
                  >
                    Seleziona Verified Escrow
                  </Button>
                </div>
              </Card>
            </div>

            {/* Info Box */}
            <Card className="glass-panel p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                </div>
                <div>
                  <h4 className="font-bold mb-2">Come Funziona Verified Escrow</h4>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">1.</span>
                      <span>Il venditore spedisce la carta al nostro hub centrale</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">2.</span>
                      <span>Il nostro team professionale verifica la carta (foto e report)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">3.</span>
                      <span>Se tutto OK, rispediamo la carta all'acquirente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-primary">4.</span>
                      <span>L'acquirente conferma ricezione e i fondi vengono rilasciati</span>
                    </li>
                  </ol>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

const fallback = <div className="flex min-h-[40vh] items-center justify-center"><span className="text-muted-foreground">Caricamento...</span></div>
export default function SelectEscrowMethodPage() {
  return <Suspense fallback={fallback}><SelectEscrowMethodContent /></Suspense>
}

