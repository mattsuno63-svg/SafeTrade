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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'PENDING' | 'READ' | 'REPLIED' | 'CLOSED'
  createdAt: string
  user: { id: string; email: string; name: string | null } | null
}

interface Pagination {
  total: number
  pages: number
  page: number
  limit: number
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Da leggere', color: 'bg-yellow-500' },
  READ: { label: 'Letto', color: 'bg-blue-500' },
  REPLIED: { label: 'Risposto', color: 'bg-green-500' },
  CLOSED: { label: 'Chiuso', color: 'bg-gray-500' },
}

export default function AdminContactsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user: currentUser, loading: userLoading } = useUser()

  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)

  useEffect(() => {
    if (!currentUser && !userLoading) {
      router.push('/login')
      return
    }

    if (currentUser) {
      fetchMessages()
    }
  }, [currentUser, userLoading, statusFilter, page])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)

      const res = await fetch(`/api/admin/contacts?${params}`)
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast({ title: 'Errore', description: 'Impossibile caricare i messaggi', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const info = STATUS_LABELS[status] || { label: status, color: 'bg-gray-500' }
    return <Badge className={info.color}>{info.label}</Badge>
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-red-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-primary">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <span className="material-symbols-outlined text-4xl text-blue-500">contact_mail</span>
                <div>
                  <h1 className="text-3xl font-bold">Messaggi di contatto</h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Messaggi inviati dal form di contatto del sito
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              <Select value={statusFilter || 'ALL'} onValueChange={(v) => { setStatusFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tutti</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="glass-panel overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-500">
                  <span className="material-symbols-outlined animate-spin text-4xl">sync</span>
                  <p className="mt-2">Caricamento...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <span className="material-symbols-outlined text-5xl mb-2 block text-gray-300">inbox</span>
                  <p>Nessun messaggio di contatto</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-white/10">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedMessage(msg)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold truncate">{msg.subject}</span>
                            {getStatusBadge(msg.status)}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                            {msg.name} &lt;{msg.email}&gt;
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{msg.message}</p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">{formatDate(msg.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {pagination && pagination.pages > 1 && (
                <div className="p-4 flex justify-center gap-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Precedente
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    Pagina {page} / {pagination.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Successiva
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.subject}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Da</p>
                <p className="font-medium">{selectedMessage.name}</p>
                <a href={`mailto:${selectedMessage.email}`} className="text-primary hover:underline text-sm">
                  {selectedMessage.email}
                </a>
              </div>
              <div>
                <p className="text-sm text-gray-500">Data</p>
                <p className="text-sm">{formatDate(selectedMessage.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Messaggio</p>
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <a href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}`}>
                  <span className="material-symbols-outlined mr-2">reply</span>
                  Rispondi via email
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
