'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface AuditLog {
  id: string
  actionType: string
  amount: number | null
  orderId: string | null
  recipientId: string | null
  performedById: string
  performedByRole: string
  ipAddress: string | null
  userAgent: string | null
  firstClickAt: string | null
  confirmClickAt: string | null
  notes: string | null
  createdAt: string
  performedBy: {
    id: string
    name: string | null
    email: string
  }
  recipient: {
    id: string
    name: string | null
    email: string
  } | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'RELEASE_TO_SELLER_APPROVED': { label: 'Rilascio Approvato', color: 'bg-green-500', icon: 'check_circle' },
  'REFUND_FULL_APPROVED': { label: 'Rimborso Approvato', color: 'bg-blue-500', icon: 'undo' },
  'REFUND_PARTIAL_APPROVED': { label: 'Rimborso Parziale', color: 'bg-orange-500', icon: 'price_change' },
  'HUB_COMMISSION_APPROVED': { label: 'Commissione Hub', color: 'bg-purple-500', icon: 'hub' },
  'WITHDRAWAL_APPROVED': { label: 'Prelievo Approvato', color: 'bg-indigo-500', icon: 'account_balance' },
  'RELEASE_REJECTED': { label: 'Rilascio Rifiutato', color: 'bg-red-500', icon: 'cancel' },
  'REFUND_REJECTED': { label: 'Rimborso Rifiutato', color: 'bg-red-500', icon: 'cancel' },
}

export default function AdminAuditLogPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionTypeFilter, setActionTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }
    
    if (currentUser) {
      fetchAuditLogs()
    }
  }, [currentUser, userLoading, actionTypeFilter, page])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (actionTypeFilter !== 'ALL') params.set('action_type', actionTypeFilter)

      const res = await fetch(`/api/admin/audit-log?${params}`)
      if (res.status === 403) {
        toast({
          title: 'Accesso Negato',
          description: 'Solo Admin possono accedere a questa pagina.',
          variant: 'destructive',
        })
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setAuditLogs(data.items)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast({
        title: 'Errore',
        description: 'Impossibile caricare l\'audit log.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (actionType: string) => {
    const info = ACTION_TYPE_LABELS[actionType] || { label: actionType, color: 'bg-gray-500', icon: 'info' }
    return (
      <Badge className={`${info.color} flex items-center gap-1`}>
        <span className="material-symbols-outlined text-sm">{info.icon}</span>
        {info.label}
      </Badge>
    )
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const calculateConfirmationDelay = (firstClick: string | null, confirmClick: string | null) => {
    if (!firstClick || !confirmClick) return null
    const first = new Date(firstClick).getTime()
    const confirm = new Date(confirmClick).getTime()
    const diffMs = confirm - first
    const diffSec = Math.floor(diffMs / 1000)
    return `${diffSec}s`
  }

  if (userLoading || (loading && auditLogs.length === 0)) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Caricamento...
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-blue-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href="/admin/pending-releases" className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <h1 className="text-3xl font-bold">Audit Log Finanziario</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Storico completo di tutte le approvazioni e rifiuti di rilascio fondi
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={actionTypeFilter} onValueChange={(v) => { setActionTypeFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tipo azione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutte le azioni</SelectItem>
                  <SelectItem value="RELEASE_TO_SELLER_APPROVED">Rilascio Approvato</SelectItem>
                  <SelectItem value="REFUND_FULL_APPROVED">Rimborso Approvato</SelectItem>
                  <SelectItem value="REFUND_PARTIAL_APPROVED">Rimborso Parziale</SelectItem>
                  <SelectItem value="RELEASE_REJECTED">Rilascio Rifiutato</SelectItem>
                  <SelectItem value="REFUND_REJECTED">Rimborso Rifiutato</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={fetchAuditLogs}
                className="gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Aggiorna
              </Button>
            </div>

            {/* List */}
            {auditLogs.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">history</span>
                <h3 className="text-xl font-bold mb-2">Nessun log trovato</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Non ci sono azioni nel log che corrispondono ai filtri selezionati.
                </p>
              </Card>
            ) : (
              <Card className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Ora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Azione
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Importo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eseguito da
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Destinatario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Delay Conferma
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono">
                              {formatDateTime(log.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getActionBadge(log.actionType)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.amount ? (
                              <span className="font-bold text-lg">€{log.amount.toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="font-medium">
                                {log.performedBy.name || log.performedBy.email}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {log.performedByRole}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {log.recipient ? (
                              <div className="text-sm">
                                {log.recipient.name || log.recipient.email}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {calculateConfirmationDelay(log.firstClickAt, log.confirmClickAt) ? (
                              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {calculateConfirmationDelay(log.firstClickAt, log.confirmClickAt)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {log.notes ? (
                              <div className="text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={log.notes}>
                                {log.notes}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </Button>
                <span className="flex items-center px-4">
                  Pagina {page} di {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </Button>
              </div>
            )}

            {/* Info Card */}
            <Card className="glass-panel p-6 mt-8">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">info</span>
                Informazioni Audit Log
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Cosa viene registrato:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Ogni approvazione di rilascio fondi</li>
                    <li>Ogni rifiuto con motivo</li>
                    <li>IP address e User Agent</li>
                    <li>Timestamp di primo click e conferma</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white mb-1">Sicurezza:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Doppia conferma richiesta (token 5 min)</li>
                    <li>Log immutabili</li>
                    <li>Solo Admin può consultare</li>
                    <li>Delay conferma tracciato</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

