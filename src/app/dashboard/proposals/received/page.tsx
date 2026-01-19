'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

type FilterType = 'ALL' | 'PENDING' | 'ACCEPTED'

export default function ProposalsReceivedPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('ALL')

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const res = await fetch('/api/proposals?type=received')
        if (res.ok) {
          const data = await res.json()
          setProposals(data.proposals || [])
        }
      } catch (error) {
        console.error('Error fetching proposals:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProposals()
  }, [])

  const handleAccept = async (proposalId: string) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to accept proposal')
      }

      toast({
        title: '✅ Successo',
        description: 'Proposta accettata! Seleziona il metodo di escrow.',
      })

      // Redirect to select escrow method (LOCAL or VERIFIED)
      router.push(`/select-escrow-method?proposalId=${proposalId}`)
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile accettare la proposta',
        variant: 'destructive',
      })
    }
  }

  const handleReject = async (proposalId: string) => {
    if (!confirm('Sei sicuro di voler rifiutare questa proposta?')) return

    try {
      const res = await fetch(`/api/proposals/${proposalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to reject proposal')
      }

      toast({
        title: '✅ Successo',
        description: 'Proposta rifiutata',
      })

      // Refresh proposals
      const proposalsRes = await fetch('/api/proposals?type=received')
      if (proposalsRes.ok) {
        const data = await proposalsRes.json()
        setProposals(data.proposals || [])
      }
    } catch (error: any) {
      toast({
        title: '❌ Errore',
        description: error.message || 'Impossibile rifiutare la proposta',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Proposte Ricevute</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestisci tutte le proposte ricevute per i tuoi annunci
            </p>
          </div>

          {/* Filtri */}
          <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'ALL'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-primary'
              }`}
            >
              Tutte ({proposals.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'PENDING'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-primary'
              }`}
            >
              In Attesa ({proposals.filter(p => p.status === 'PENDING').length})
            </button>
            <button
              onClick={() => setFilter('ACCEPTED')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'ACCEPTED'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-primary'
              }`}
            >
              Accettate ({proposals.filter(p => p.status === 'ACCEPTED').length})
            </button>
          </div>

          {(() => {
            const filteredProposals = filter === 'ALL' 
              ? proposals 
              : proposals.filter(p => p.status === filter)

            if (filteredProposals.length === 0) {
              return (
                <Card className="glass-panel p-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 inline-block">
                    {filter === 'PENDING' ? 'schedule' : filter === 'ACCEPTED' ? 'check_circle' : 'inbox'}
                  </span>
                  <h2 className="text-2xl font-bold mb-2">
                    {filter === 'PENDING' ? 'Nessuna Proposta in Attesa' : 
                     filter === 'ACCEPTED' ? 'Nessuna Proposta Accettata' : 
                     'Nessuna Proposta'}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {filter === 'PENDING' ? 'Non hai proposte in attesa di risposta.' :
                     filter === 'ACCEPTED' ? 'Non hai ancora accettato nessuna proposta.' :
                     'Non hai ricevuto ancora nessuna proposta.'}
                  </p>
                </Card>
              )
            }

            return (
              <div className="space-y-4">
                {filteredProposals.map((proposal) => (
                <Card key={proposal.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="text-xl font-bold">{proposal.listing.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          proposal.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-500' :
                          proposal.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-500' :
                          'bg-red-500/20 text-red-500'
                        }`}>
                          {proposal.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        {/* Tipo Proposta */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            proposal.type === 'SALE' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                          }`}>
                            {proposal.type === 'SALE' ? '💰 Vendita' : '🔄 Scambio'}
                          </span>
                        </div>

                        {/* From */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Da:</span>
                          <span className="font-bold">{proposal.proposer.name || proposal.proposer.email}</span>
                        </div>

                        {/* Offer Price o Trade Items */}
                        {proposal.type === 'SALE' && proposal.offerPrice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-400">Prezzo Offerto:</span>
                            <span className="font-bold text-primary">€{proposal.offerPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            {proposal.listing.price && proposal.offerPrice !== proposal.listing.price && (
                              <span className="text-xs text-gray-500">
                                (Prezzo originale: €{proposal.listing.price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                              </span>
                            )}
                          </div>
                        ) : proposal.type === 'TRADE' && proposal.tradeItems ? (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-sm mt-0.5">swap_horiz</span>
                              <div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Item di Scambio:</p>
                                <p className="font-medium text-blue-900 dark:text-blue-100">{proposal.tradeItems}</p>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        {/* Chi Paga le Commissioni */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 dark:text-gray-400">Commissioni SafeTrade:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            proposal.feePaidBy === 'SELLER'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                              : proposal.feePaidBy === 'BUYER'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            {proposal.feePaidBy === 'SELLER' ? '👤 Venditore' : proposal.feePaidBy === 'BUYER' ? '🛒 Acquirente' : '⚖️ Divise'}
                          </span>
                        </div>

                        {/* Messaggio */}
                        {proposal.message && (
                          <div className="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Messaggio:</p>
                            <p className="text-sm">{proposal.message}</p>
                          </div>
                        )}

                        {/* Data Creazione */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-gray-500">
                            Ricevuta il {new Date(proposal.createdAt).toLocaleDateString('it-IT', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {proposal.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAccept(proposal.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <span className="material-symbols-outlined mr-2 text-sm">check_circle</span>
                          Accetta
                        </Button>
                        <Button
                          onClick={() => handleReject(proposal.id)}
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          <span className="material-symbols-outlined mr-2 text-sm">cancel</span>
                          Rifiuta
                        </Button>
                      </div>
                    )}
                    {proposal.status === 'ACCEPTED' && !proposal.transaction && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => router.push(`/select-escrow-method?proposalId=${proposal.id}`)}
                          className="bg-primary hover:bg-primary-dark"
                        >
                          <span className="material-symbols-outlined mr-2 text-sm">shopping_cart</span>
                          Completa Transazione
                        </Button>
                      </div>
                    )}
                    {proposal.status === 'ACCEPTED' && proposal.transaction && (
                      <div className="flex flex-col gap-3 items-end">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          ✅ Transazione creata
                        </div>
                        
                        {/* Informazioni Etichetta se esiste */}
                        {proposal.transaction.shippingLabel && (
                          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-2">
                            <div className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                              📦 Etichetta Generata
                            </div>
                            {proposal.transaction.shippingLabel.shippoTrackingNumber && (
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Tracking: {proposal.transaction.shippingLabel.shippoTrackingNumber}
                              </div>
                            )}
                            {proposal.transaction.shippingLabel.labelUrl && (
                              <Button
                                onClick={() => window.open(proposal.transaction.shippingLabel.labelUrl, '_blank')}
                                variant="outline"
                                size="sm"
                                className="mt-2 text-xs border-green-500 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                              >
                                📥 Scarica Etichetta
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Pulsanti Azione */}
                        <div className="flex gap-2">
                          {proposal.transaction.escrowType === 'VERIFIED' && !proposal.transaction.shippingLabel && (
                            <Button
                              onClick={() => router.push(`/transaction/${proposal.transaction.id}/verified-escrow/generate-label`)}
                              className="bg-primary hover:bg-primary-dark font-bold"
                              variant="default"
                            >
                              <span className="material-symbols-outlined mr-2 text-sm">local_shipping</span>
                              Genera Etichetta
                            </Button>
                          )}
                          {proposal.transaction.shippingLabel ? (
                            <Button
                              onClick={() => router.push(`/transaction/${proposal.transaction.id}/status`)}
                              className="bg-blue-600 hover:bg-blue-700"
                              variant="default"
                            >
                              <span className="material-symbols-outlined mr-2 text-sm">visibility</span>
                              Vedi Transazione
                            </Button>
                          ) : (
                            <Button
                              onClick={() => router.push(`/transaction/${proposal.transaction.id}/status`)}
                              className="bg-primary hover:bg-primary-dark"
                              variant="default"
                            >
                              <span className="material-symbols-outlined mr-2 text-sm">visibility</span>
                              Vedi Transazione
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
                ))}
              </div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}

