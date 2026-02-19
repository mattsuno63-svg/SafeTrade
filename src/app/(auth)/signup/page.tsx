'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/layout/Header'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { ITALIAN_PROVINCES } from '@/lib/data/italian-provinces'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'USER' as 'USER' | 'MERCHANT',
    // Merchant fields
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
    emailCompany: '',
    website: '',
    legalForm: '',
  })
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const getRedirectUrl = () => {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL && typeof window !== 'undefined'
        ? process.env.NEXT_PUBLIC_SITE_URL
        : typeof window !== 'undefined'
          ? window.location.origin
          : ''
    return `${base.replace(/\/$/, '')}/auth/callback`
  }

  const handleOAuthSignup = async (provider: 'google' | 'apple') => {
    setOauthLoading(provider)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
        },
      })

      if (error) {
        setError(error.message)
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      setError('An error occurred. Please try again.')
    } finally {
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      setLoading(false)
      return
    }

    // City is required for all users
    if (!formData.city || formData.city.trim() === '') {
      setError('La città è obbligatoria')
      setLoading(false)
      return
    }

    // Merchant validation
    if (formData.role === 'MERCHANT') {
      if (!formData.shopName || !formData.companyName || !formData.vatNumber || !formData.address || !formData.city || !formData.phone) {
        setError('Please fill in all required merchant fields')
        setLoading(false)
        return
      }
    }

    try {
      const signupPayload: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        city: formData.city || null,
        province: formData.province || null,
      }

      // Add merchant data if role is MERCHANT
      if (formData.role === 'MERCHANT') {
        signupPayload.merchantData = {
          shopName: formData.shopName,
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          taxCode: formData.taxCode || null,
          uniqueCode: formData.uniqueCode || null,
          description: formData.description || null,
          address: formData.address,
          city: formData.city,
          province: formData.province || null,
          postalCode: formData.postalCode || null,
          phone: formData.phone,
          email: formData.emailCompany || null,
          website: formData.website || null,
          legalForm: formData.legalForm || null,
        }
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupPayload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        toast({
          title: 'Error',
          description: data.error || 'Signup failed',
          variant: 'destructive',
        })
        return
      }

      if (formData.role === 'MERCHANT') {
        toast({
          title: 'Richiesta Inviata! 🎉',
          description: 'La tua richiesta di registrazione come commerciante è stata inviata. Riceverai una notifica quando verrà approvata.',
        })
        // Redirect to merchant application status
        router.push('/merchant/apply')
      } else {
        toast({
          title: 'Success',
          description: 'Account created successfully! Please log in.',
        })
        // Redirect to login
        router.push('/login')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      toast({
        title: 'Error',
        description: 'An error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <Card className="glass-panel w-full max-w-md rounded-3xl p-8 sm:p-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-3xl font-black text-text-primary dark:text-white">
                Create Account
              </CardTitle>
              <CardDescription className="text-base">
                Join SafeTrade and start trading safely
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* OAuth Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3"
                  onClick={() => handleOAuthSignup('google')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'google' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Sign up with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-3"
                  onClick={() => handleOAuthSignup('apple')}
                  disabled={!!oauthLoading}
                >
                  {oauthLoading === 'apple' ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  )}
                  Sign up with Apple
                </Button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-500">or sign up with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'USER' })}
                      className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                        formData.role === 'USER'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <div className="font-bold">Collector</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Buy, sell, trade cards</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, role: 'MERCHANT' })}
                      className={`flex-1 rounded-xl border-2 p-4 text-left transition-all ${
                        formData.role === 'MERCHANT'
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 dark:border-white/10'
                      }`}
                    >
                      <div className="font-bold">Merchant</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Sell from your store</div>
                    </button>
                  </div>
                </div>

                {/* Location Fields - For all users */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Città *</Label>
                    <Input
                      id="city"
                      type="text"
                      placeholder="Milano"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="h-12"
                      required
                    />
                    <p className="text-xs text-gray-500">La città è obbligatoria per filtrare i negozi nella tua zona</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Provincia</Label>
                    <Select
                      value={formData.province}
                      onValueChange={(value) => setFormData({ ...formData, province: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Seleziona provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITALIAN_PROVINCES.map((p) => (
                          <SelectItem key={p.code} value={p.name}>
                            {p.name} ({p.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Merchant Additional Fields */}
                {formData.role === 'MERCHANT' && (
                  <div className="space-y-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-blue-500">info</span>
                        <div>
                          <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Registrazione Commerciante</h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            La tua richiesta verrà esaminata manualmente. Riceverai una notifica quando verrà approvata.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dati Aziendali */}
                    <div>
                      <h3 className="font-bold text-lg mb-4">Dati Aziendali</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="shopName">Nome Negozio *</Label>
                            <Input
                              id="shopName"
                              value={formData.shopName}
                              onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                              placeholder="Nome del tuo negozio"
                              className="h-12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyName">Ragione Sociale *</Label>
                            <Input
                              id="companyName"
                              value={formData.companyName}
                              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                              placeholder="Ragione sociale completa"
                              className="h-12"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="vatNumber">Partita IVA *</Label>
                            <Input
                              id="vatNumber"
                              value={formData.vatNumber}
                              onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                              placeholder="IT12345678901"
                              className="h-12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="taxCode">Codice Fiscale</Label>
                            <Input
                              id="taxCode"
                              value={formData.taxCode}
                              onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                              placeholder="Codice fiscale"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="uniqueCode">Codice Univoco Azienda</Label>
                            <Input
                              id="uniqueCode"
                              value={formData.uniqueCode}
                              onChange={(e) => setFormData({ ...formData, uniqueCode: e.target.value })}
                              placeholder="Codice univoco"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="legalForm">Forma Giuridica</Label>
                            <Input
                              id="legalForm"
                              value={formData.legalForm}
                              onChange={(e) => setFormData({ ...formData, legalForm: e.target.value })}
                              placeholder="SRL, SNC, Ditta Individuale, ecc."
                              className="h-12"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dati di Contatto */}
                    <div>
                      <h3 className="font-bold text-lg mb-4">Dati di Contatto</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="description">Descrizione</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Raccontaci del tuo negozio..."
                            rows={4}
                            className="resize-none"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Indirizzo *</Label>
                          <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Via, numero civico"
                            className="h-12"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">Città *</Label>
                            <Input
                              id="city"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              placeholder="Città"
                              className="h-12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="province">Provincia</Label>
                            <Input
                              id="province"
                              value={formData.province}
                              onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                              placeholder="Provincia"
                              className="h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="postalCode">CAP</Label>
                            <Input
                              id="postalCode"
                              value={formData.postalCode}
                              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                              placeholder="CAP"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefono *</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+39 xxx xxx xxxx"
                              className="h-12"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emailCompany">Email Aziendale</Label>
                            <Input
                              id="emailCompany"
                              type="email"
                              value={formData.emailCompany}
                              onChange={(e) => setFormData({ ...formData, emailCompany: e.target.value })}
                              placeholder="info@negozio.it"
                              className="h-12"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="website">Sito Web</Label>
                          <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            placeholder="https://www.negozio.it"
                            className="h-12"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    {error}
                  </div>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary-dark"
                  disabled={loading}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Already have an account? </span>
                <Link href="/login" className="font-bold text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}

