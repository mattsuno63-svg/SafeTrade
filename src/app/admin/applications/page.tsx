'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

interface Application {
  id: string
  shopName: string
  description: string | null
  address: string
  city: string
  phone: string
  documentUrl: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNotes: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function AdminApplicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      fetchApplications()
    }
  }, [user, userLoading, router])

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/admin/applications')
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setApplications(data)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (applicationId: string, status: 'APPROVED' | 'REJECTED') => {
    setProcessing(true)
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewNotes: reviewNotes || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update application')
      }

      toast({
        title: status === 'APPROVED' ? 'Application Approved' : 'Application Rejected',
        description: status === 'APPROVED' 
          ? 'The merchant can now set up their shop.'
          : 'The applicant has been notified.',
      })

      setSelectedApp(null)
      setReviewNotes('')
      fetchApplications()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  const filteredApplications = filter === 'ALL' 
    ? applications 
    : applications.filter(a => a.status === filter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-500">Pending Review</Badge>
      case 'APPROVED':
        return <Badge className="bg-green-500">Approved</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-yellow-500/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => router.push('/admin')} className="text-gray-500 hover:text-primary">
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <h1 className="text-3xl font-bold">Merchant Applications</h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Review and approve merchant registration requests
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? 'default' : 'outline'}
                  onClick={() => setFilter(f)}
                  size="sm"
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                  {f === 'PENDING' && applications.filter(a => a.status === 'PENDING').length > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {applications.filter(a => a.status === 'PENDING').length}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Applications List */}
            {filteredApplications.length === 0 ? (
              <Card className="glass-panel p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">
                  assignment_turned_in
                </span>
                <h3 className="text-xl font-bold mb-2">No Applications</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filter === 'PENDING' 
                    ? 'All applications have been reviewed.'
                    : `No ${filter.toLowerCase()} applications found.`}
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <Card key={app.id} className="glass-panel p-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{app.shopName}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              by {app.user.name || app.user.email}
                            </p>
                          </div>
                          {getStatusBadge(app.status)}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <span className="text-xs text-gray-500 block">Address</span>
                            <span className="font-medium">{app.address}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">City</span>
                            <span className="font-medium">{app.city}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Phone</span>
                            <span className="font-medium">{app.phone}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500 block">Submitted</span>
                            <span className="font-medium">
                              {new Date(app.createdAt).toLocaleDateString('it-IT')}
                            </span>
                          </div>
                        </div>

                        {app.description && (
                          <div className="mb-4">
                            <span className="text-xs text-gray-500 block">Description</span>
                            <p className="text-sm">{app.description}</p>
                          </div>
                        )}

                        {app.reviewNotes && app.status !== 'PENDING' && (
                          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
                            <span className="text-xs text-gray-500 block">Review Notes</span>
                            <p className="text-sm">{app.reviewNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Review Panel */}
                      {app.status === 'PENDING' && (
                        <div className="w-full lg:w-80 p-4 bg-white/50 dark:bg-black/20 rounded-xl">
                          <h4 className="font-bold mb-3">Review Application</h4>
                          <Textarea
                            placeholder="Add review notes (optional)..."
                            value={selectedApp === app.id ? reviewNotes : ''}
                            onChange={(e) => {
                              setSelectedApp(app.id)
                              setReviewNotes(e.target.value)
                            }}
                            className="mb-3"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 border-red-500 text-red-500 hover:bg-red-500/10"
                              onClick={() => handleReview(app.id, 'REJECTED')}
                              disabled={processing}
                            >
                              Reject
                            </Button>
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => handleReview(app.id, 'APPROVED')}
                              disabled={processing}
                            >
                              Approve
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

