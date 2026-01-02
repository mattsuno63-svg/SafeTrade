'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function MerchantApplyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [submitting, setSubmitting] = useState(false)
  const [existingApplication, setExistingApplication] = useState<any>(null)
  const [formData, setFormData] = useState({
    shopName: '',
    companyName: '',
    vatNumber: '',
    taxCode: '',
    uniqueCode: '',
    description: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    email: '',
    website: '',
    legalForm: '',
  })

  useEffect(() => {
    if (!user && !userLoading) {
      router.push('/login')
      return
    }
    
    if (user) {
      checkExistingApplication()
    }
  }, [user, userLoading, router])

  const checkExistingApplication = async () => {
    try {
      const res = await fetch('/api/merchant/application')
      if (res.ok) {
        const data = await res.json()
        if (data) {
          setExistingApplication(data)
        }
      }
    } catch (error) {
      console.error('Error checking application:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/merchant/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit application')
      }

      toast({
        title: 'Application Submitted! 🎉',
        description: 'We will review your application and get back to you soon.',
      })

      router.push('/dashboard')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    )
  }

  // If user already has an application
  if (existingApplication) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
        <Header />
        <main className="flex-1 py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            <Card className="glass-panel p-8 text-center">
              <span className={`material-symbols-outlined text-6xl mb-4 ${
                existingApplication.status === 'PENDING' ? 'text-yellow-500' :
                existingApplication.status === 'APPROVED' ? 'text-green-500' :
                'text-red-500'
              }`}>
                {existingApplication.status === 'PENDING' ? 'hourglass_empty' :
                 existingApplication.status === 'APPROVED' ? 'check_circle' :
                 'cancel'}
              </span>
              <h2 className="text-2xl font-bold mb-2">
                {existingApplication.status === 'PENDING' ? 'Application Under Review' :
                 existingApplication.status === 'APPROVED' ? 'Application Approved!' :
                 'Application Rejected'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {existingApplication.status === 'PENDING' 
                  ? 'Your merchant application is being reviewed. We will notify you once a decision is made.'
                  : existingApplication.status === 'APPROVED'
                    ? 'Congratulations! You can now set up your shop.'
                    : existingApplication.reviewNotes || 'Unfortunately, your application was not approved.'}
              </p>
              {existingApplication.status === 'APPROVED' ? (
                <Button 
                  onClick={() => router.push('/merchant/setup')}
                  className="bg-primary hover:bg-primary-dark"
                >
                  Set Up Your Shop
                </Button>
              ) : existingApplication.status === 'REJECTED' ? (
                <Button 
                  onClick={() => setExistingApplication(null)}
                  variant="outline"
                >
                  Apply Again
                </Button>
              ) : null}
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-8">
              <span className="material-symbols-outlined text-5xl text-primary mb-4 block">
                store
              </span>
              <h1 className="text-3xl font-bold mb-2">Become a SafeTrade Partner</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Join our network of trusted merchants and reach thousands of collectors
              </p>
            </div>

            {/* Benefits */}
            <Card className="glass-panel p-6 mb-8">
              <h3 className="font-bold text-lg mb-4">Merchant Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <div>
                    <h4 className="font-medium">SafeTrade Hub</h4>
                    <p className="text-sm text-gray-500">Host SafeTrade transactions in your store</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <div>
                    <h4 className="font-medium">Inventory Management</h4>
                    <p className="text-sm text-gray-500">List and sell your products online</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <div>
                    <h4 className="font-medium">Tournament Hosting</h4>
                    <p className="text-sm text-gray-500">Organize and manage TCG tournaments</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-green-500">check_circle</span>
                  <div>
                    <h4 className="font-medium">Local Visibility</h4>
                    <p className="text-sm text-gray-500">Appear in local searches and maps</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Application Form */}
            <Card className="glass-panel p-6">
              <h3 className="font-bold text-lg mb-6">Merchant Application</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dati Aziendali */}
                <div className="border-b border-gray-200 dark:border-white/10 pb-4 mb-4">
                  <h4 className="font-bold text-lg mb-4">Dati Aziendali</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shopName">Nome Negozio *</Label>
                      <Input
                        id="shopName"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        placeholder="Nome del tuo negozio"
                        className="h-12 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="companyName">Ragione Sociale *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Ragione sociale completa"
                        className="h-12 mt-1"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="vatNumber">Partita IVA *</Label>
                      <Input
                        id="vatNumber"
                        value={formData.vatNumber}
                        onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                        placeholder="IT12345678901"
                        className="h-12 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="taxCode">Codice Fiscale</Label>
                      <Input
                        id="taxCode"
                        value={formData.taxCode}
                        onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                        placeholder="Codice fiscale"
                        className="h-12 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="uniqueCode">Codice Univoco Azienda</Label>
                      <Input
                        id="uniqueCode"
                        value={formData.uniqueCode}
                        onChange={(e) => setFormData({ ...formData, uniqueCode: e.target.value })}
                        placeholder="Codice univoco"
                        className="h-12 mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="legalForm">Forma Giuridica</Label>
                      <Input
                        id="legalForm"
                        value={formData.legalForm}
                        onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
                        placeholder="SRL, SNC, Ditta Individuale, ecc."
                        className="h-12 mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Dati di Contatto */}
                <div className="border-b border-gray-200 dark:border-white/10 pb-4 mb-4">
                  <h4 className="font-bold text-lg mb-4">Dati di Contatto</h4>
                  
                  <div>
                    <Label htmlFor="description">Descrizione</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Raccontaci del tuo negozio..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="address">Indirizzo *</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Via, numero civico"
                      className="h-12 mt-1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div>
                      <Label htmlFor="city">Città *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Città"
                        className="h-12 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="province">Provincia</Label>
                      <Input
                        id="province"
                        value={formData.province}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        placeholder="Provincia"
                        className="h-12 mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCode">CAP</Label>
                      <Input
                        id="postalCode"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                        placeholder="CAP"
                        className="h-12 mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="phone">Telefono *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+39 xxx xxx xxxx"
                        className="h-12 mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Email Aziendale</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="info@negozio.it"
                        className="h-12 mt-1"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="website">Sito Web</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.negozio.it"
                      className="h-12 mt-1"
                    />
                  </div>
                </div>

                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-yellow-500">info</span>
                    <div>
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400">Review Process</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your application will be manually reviewed by our team. This usually takes 1-3 business days.
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 bg-primary hover:bg-primary-dark text-lg font-bold"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

