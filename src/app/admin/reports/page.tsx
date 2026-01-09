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

interface Report {
  id: string
  type: 'LISTING' | 'USER' | 'SHOP' | 'TRANSACTION' | 'COMMUNITY'
  status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'
  reason: string
  description: string
  reportedItemId: string
  reportedItemTitle: string | null
  reporterId: string
  reporterName: string
  reportedUserId: string
  reportedUserName: string
  createdAt: string
  resolvedAt?: string
  resolvedBy?: string
  resolution?: string
}

interface Stats {
  total: number
  pending: number
  investigating: number
  resolved: number
  dismissed: number
}

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  LISTING: { label: 'Listing', icon: 'inventory_2', color: 'bg-blue-500' },
  USER: { label: 'Utente', icon: 'person', color: 'bg-purple-500' },
  SHOP: { label: 'Negozio', icon: 'store', color: 'bg-orange-500' },
  TRANSACTION: { label: 'Transazione', icon: 'receipt_long', color: 'bg-green-500' },
  COMMUNITY: { label: 'Community', icon: 'forum', color: 'bg-pink-500' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'In Attesa', color: 'bg-yellow-500' },
  INVESTIGATING: { label: 'In Indagine', color: 'bg-blue-500' },
  RESOLVED: { label: 'Risolto', color: 'bg-green-500' },
  DISMISSED: { label: 'Archiviato', color: 'bg-gray-500' },
}

export default function AdminReportsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()
  
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }
    
    if (currentUser) {
      fetchReports()
    }
  }, [currentUser, userLoading, statusFilter, typeFilter])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (typeFilter !== 'ALL') params.set('type', typeFilter)

      const res = await fetch(`/api/admin/reports?${params}`)
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setReports(data.reports)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeBadge = (type: string) => {
    const typeInfo = TYPE_LABELS[type] || { label: type, icon: 'help', color: 'bg-gray-500' }
    return (
      <Badge className={`${typeInfo.color} flex items-center gap-1`}>
        <span className="material-symbols-outlined text-sm">{typeInfo.icon}</span>
        {typeInfo.label}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = STATUS_LABELS[status] || { label: status, color: 'bg-gray-500' }
    return <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
  }

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    // In futuro: chiamata API per aggiornare lo status
    toast({
      title: 'Demo',
      description: `In produzione, questo cambierebbe lo stato a "${newStatus}"`,
    })
  }

  if (userLoading || (loading && reports.length === 0)) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Caricamento...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-red-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link href="/admin" className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Link>
                  <h1 className="text-3xl font-bold">Reports & Segnalazioni</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Gestisci segnalazioni e dispute degli utenti
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="glass-panel p-4 text-center">
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <div className="text-sm text-gray-500">Totale</div>
              </Card>
              <Card className="glass-panel p-4 text-center border-l-4 border-l-yellow-500">
                <div className="text-2xl font-bold text-yellow-500">{stats?.pending || 0}</div>
                <div className="text-sm text-gray-500">In Attesa</div>
              </Card>
              <Card className="glass-panel p-4 text-center border-l-4 border-l-blue-500">
                <div className="text-2xl font-bold text-blue-500">{stats?.investigating || 0}</div>
                <div className="text-sm text-gray-500">In Indagine</div>
              </Card>
              <Card className="glass-panel p-4 text-center border-l-4 border-l-green-500">
                <div className="text-2xl font-bold text-green-500">{stats?.resolved || 0}</div>
                <div className="text-sm text-gray-500">Risolti</div>
              </Card>
              <Card className="glass-panel p-4 text-center border-l-4 border-l-gray-500">
                <div className="text-2xl font-bold text-gray-500">{stats?.dismissed || 0}</div>
                <div className="text-sm text-gray-500">Archiviati</div>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti gli stati</SelectItem>
                  <SelectItem value="PENDING">In Attesa</SelectItem>
                  <SelectItem value="INVESTIGATING">In Indagine</SelectItem>
                  <SelectItem value="RESOLVED">Risolti</SelectItem>
                  <SelectItem value="DISMISSED">Archiviati</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtra per tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti i tipi</SelectItem>
                  <SelectItem value="LISTING">Listing</SelectItem>
                  <SelectItem value="USER">Utente</SelectItem>
                  <SelectItem value="SHOP">Negozio</SelectItem>
                  <SelectItem value="TRANSACTION">Transazione</SelectItem>
                  <SelectItem value="COMMUNITY">Community</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reports List */}
            {reports.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4 block">flag</span>
                <h3 className="text-xl font-bold mb-2">Nessuna segnalazione</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Non ci sono segnalazioni da mostrare
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="glass-panel p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Report Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getTypeBadge(report.type)}
                            {getStatusBadge(report.status)}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        
                        <h3 className="font-bold text-lg mb-2">{report.reason}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          {report.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 block">Segnalato da:</span>
                            <span className="font-medium">{report.reporterName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Utente segnalato:</span>
                            <span className="font-medium text-red-500">{report.reportedUserName}</span>
                          </div>
                          {report.reportedItemTitle && (
                            <div className="col-span-2">
                              <span className="text-gray-500 block">Oggetto:</span>
                              <span className="font-medium">{report.reportedItemTitle}</span>
                            </div>
                          )}
                        </div>

                        {report.resolution && (
                          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <span className="text-xs text-green-600 font-medium block mb-1">
                              Risolto da {report.resolvedBy} il {new Date(report.resolvedAt!).toLocaleDateString('it-IT')}
                            </span>
                            <p className="text-sm">{report.resolution}</p>
                          </div>
                        )}
                      </div>

                      {/* Actions Panel */}
                      {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
                        <div className="w-full lg:w-64 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Azioni</h4>
                          <div className="space-y-2">
                            {report.status === 'PENDING' && (
                              <Button
                                variant="outline"
                                className="w-full border-blue-500 text-blue-500 hover:bg-blue-500/10"
                                onClick={() => handleStatusChange(report.id, 'INVESTIGATING')}
                              >
                                <span className="material-symbols-outlined text-sm mr-2">search</span>
                                Inizia Indagine
                              </Button>
                            )}
                            <Button
                              className="w-full bg-green-500 hover:bg-green-600"
                              onClick={() => handleStatusChange(report.id, 'RESOLVED')}
                            >
                              <span className="material-symbols-outlined text-sm mr-2">check_circle</span>
                              Segna Risolto
                            </Button>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleStatusChange(report.id, 'DISMISSED')}
                            >
                              <span className="material-symbols-outlined text-sm mr-2">archive</span>
                              Archivia
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

