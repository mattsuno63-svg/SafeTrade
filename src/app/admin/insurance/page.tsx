'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUser } from '@/hooks/use-user'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Insurance {
  id: string
  transactionId: string
  insuredValue: number
  premiumAmount: number
  coverageType: string
  status: string
  riskFactor: number
  claimAmount?: number
  claimReason?: string
  claimPhotos?: string[]
  claimSubmittedAt?: string
  claimSettledAt?: string
  claimSettledAmount?: number
  claimNotes?: string
  createdAt: string
  transaction: {
    id: string
    status: string
    proposedPrice: number
    packageStatus?: string
    userA: { id: string; name: string; email: string }
    userB: { id: string; name: string; email: string }
  }
}

interface Stats {
  active: number
  claimed: number
  settled: number
  totalPremiums: number
  totalPayouts: number
  netProfit: number
}

export default function AdminInsurancePage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Settlement dialog
  const [settleDialogOpen, setSettleDialogOpen] = useState(false)
  const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null)
  const [settleDecision, setSettleDecision] = useState<string>('')
  const [settleAmount, setSettleAmount] = useState<string>('')
  const [settleNotes, setSettleNotes] = useState<string>('')
  const [settling, setSettling] = useState(false)

  const hasFetchedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const fetchInsurances = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    
    if (isInitial) setLoading(true)
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/admin/insurance?${params}`)
      if (response.ok) {
        const data = await response.json()
        setInsurances(data.insurances)
        setStats(data.stats)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Errore caricamento assicurazioni:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [page, statusFilter])

  useEffect(() => {
    if (!user?.id && !userLoading) {
      router.push('/login')
      return
    }

    if (user?.id && !userLoading && !hasFetchedRef.current && !isFetchingRef.current) {
      hasFetchedRef.current = true
      fetchInsurances(true)
    }
  }, [user?.id, userLoading, router, fetchInsurances])

  useEffect(() => {
    if (hasFetchedRef.current) {
      fetchInsurances(false)
    }
  }, [statusFilter, page, fetchInsurances])

  const handleSettle = (insurance: Insurance) => {
    setSelectedInsurance(insurance)
    setSettleDecision('')
    setSettleAmount(insurance.claimAmount?.toString() || '')
    setSettleNotes('')
    setSettleDialogOpen(true)
  }

  const submitSettlement = async () => {
    if (!selectedInsurance || !settleDecision) return
    
    setSettling(true)
    try {
      const response = await fetch(`/api/insurance/${selectedInsurance.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: settleDecision,
          settledAmount: parseFloat(settleAmount) || 0,
          notes: settleNotes,
        }),
      })

      if (response.ok) {
        setSettleDialogOpen(false)
        fetchInsurances(false)
      } else {
        const data = await response.json()
        alert(data.error || 'Errore nella risoluzione')
      }
    } catch (error) {
      console.error('Errore risoluzione sinistro:', error)
    } finally {
      setSettling(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-500">Attiva</Badge>
      case 'CLAIMED':
        return <Badge className="bg-orange-500">Sinistro Aperto</Badge>
      case 'SETTLED':
        return <Badge className="bg-blue-500">Risolta</Badge>
      case 'EXPIRED':
        return <Badge variant="secondary">Scaduta</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading && !hasFetchedRef.current) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-emerald-500">shield</span>
              Gestione Assicurazioni
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitora assicurazioni e gestisci sinistri
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/admin')}>
            ← Torna al Dashboard
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="glass-panel">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{stats.active}</div>
                <p className="text-sm text-muted-foreground">Attive</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-orange-500/30">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-500">{stats.claimed}</div>
                <p className="text-sm text-muted-foreground">Sinistri Aperti</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-500">{stats.settled}</div>
                <p className="text-sm text-muted-foreground">Risolti</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-emerald-500">€{stats.totalPremiums.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Premi Totali</p>
              </CardContent>
            </Card>
            <Card className="glass-panel">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-500">€{stats.totalPayouts.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground">Rimborsi</p>
              </CardContent>
            </Card>
            <Card className="glass-panel border-2 border-primary/30">
              <CardContent className="pt-6">
                <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  €{stats.netProfit.toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Profitto Netto</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="glass-panel mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="ACTIVE">Attive</SelectItem>
                  <SelectItem value="CLAIMED">Sinistri Aperti</SelectItem>
                  <SelectItem value="SETTLED">Risolti</SelectItem>
                  <SelectItem value="EXPIRED">Scadute</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={() => fetchInsurances(false)} className="gap-2">
                <span className="material-symbols-outlined text-sm">refresh</span>
                Aggiorna
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Assicurazioni ({insurances.length})</CardTitle>
            <CardDescription>
              Elenco di tutte le assicurazioni e sinistri
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insurances.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <span className="material-symbols-outlined text-6xl mb-4 block">shield_off</span>
                <p>Nessuna assicurazione trovata</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insurances.map((insurance) => (
                  <div
                    key={insurance.id}
                    className={`border rounded-lg p-4 ${
                      insurance.status === 'CLAIMED' ? 'border-orange-500/50 bg-orange-500/5' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          {getStatusBadge(insurance.status)}
                          <Badge variant="outline">{insurance.coverageType}</Badge>
                          <span className="text-sm text-muted-foreground">
                            #{insurance.transactionId.slice(0, 8)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Valore Assicurato:</span>
                            <p className="font-semibold">€{insurance.insuredValue.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Premio:</span>
                            <p className="font-semibold">€{insurance.premiumAmount.toFixed(2)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rischio:</span>
                            <p className={`font-semibold ${insurance.riskFactor > 1.3 ? 'text-red-500' : 'text-green-500'}`}>
                              {insurance.riskFactor.toFixed(2)}x
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Buyer:</span>
                            <p className="font-semibold">{insurance.transaction.userA.name || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Claim Info */}
                        {insurance.status === 'CLAIMED' && (
                          <div className="mt-4 p-3 bg-orange-500/10 rounded-lg">
                            <p className="font-semibold text-orange-500 mb-2">
                              📋 Sinistro: €{insurance.claimAmount?.toFixed(2)}
                            </p>
                            <p className="text-sm">{insurance.claimReason}</p>
                            {insurance.claimPhotos && insurance.claimPhotos.length > 0 && (
                              <div className="flex gap-2 mt-2">
                                {insurance.claimPhotos.map((photo, i) => (
                                  <a 
                                    key={i} 
                                    href={photo} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-500 text-sm hover:underline"
                                  >
                                    📷 Foto {i + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Settlement Info */}
                        {insurance.status === 'SETTLED' && insurance.claimSettledAmount !== undefined && (
                          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                            <p className="font-semibold text-blue-500">
                              ✅ Risolto: €{insurance.claimSettledAmount.toFixed(2)}
                            </p>
                            {insurance.claimNotes && (
                              <p className="text-sm mt-1">{insurance.claimNotes}</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {insurance.status === 'CLAIMED' && (
                          <Button 
                            onClick={() => handleSettle(insurance)}
                            className="bg-orange-500 hover:bg-orange-600"
                          >
                            <span className="material-symbols-outlined text-sm mr-1">gavel</span>
                            Risolvi
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/transactions/${insurance.transactionId}`)}
                        >
                          Transazione
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Precedente
                </Button>
                <span className="px-4 py-2">
                  Pagina {page} di {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Successiva →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settlement Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Risolvi Sinistro</DialogTitle>
            <DialogDescription>
              Sinistro per €{selectedInsurance?.claimAmount?.toFixed(2)} - 
              Valore assicurato: €{selectedInsurance?.insuredValue.toFixed(2)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Decisione</Label>
              <Select value={settleDecision} onValueChange={setSettleDecision}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona decisione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">✅ Approvato (rimborso totale)</SelectItem>
                  <SelectItem value="PARTIAL">⚠️ Parziale (rimborso ridotto)</SelectItem>
                  <SelectItem value="REJECTED">❌ Rifiutato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settleDecision && settleDecision !== 'REJECTED' && (
              <div className="space-y-2">
                <Label>Importo Rimborso (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  max={selectedInsurance?.claimAmount || 0}
                />
                <p className="text-xs text-muted-foreground">
                  Max: €{selectedInsurance?.claimAmount?.toFixed(2)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="Motivo della decisione..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettleDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              onClick={submitSettlement}
              disabled={!settleDecision || settling}
              className={settleDecision === 'REJECTED' ? 'bg-red-500' : 'bg-emerald-500'}
            >
              {settling ? 'Elaborazione...' : 'Conferma Decisione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

