'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useSubscription, useSubscriptionPlans, useUpdateSubscription } from '@/hooks/use-subscription'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

export default function PricingPage() {
  const router = useRouter()
  const { user } = useUser()
  const { data: subscription } = useSubscription()
  const { data: plans, isLoading } = useSubscriptionPlans()
  const updateSubscription = useUpdateSubscription()
  const [isYearly, setIsYearly] = useState(false)
  const { toast } = useToast()

  const handleSelectPlan = async (planName: string) => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    if (planName === subscription?.tier) {
      toast({ title: 'Info', description: 'Sei già su questo piano!' })
      return
    }

    // Per ora simuliamo l'upgrade (in produzione qui ci sarebbe Stripe)
    try {
      await updateSubscription.mutateAsync({
        planName,
        billingPeriod: isYearly ? 'YEARLY' : 'MONTHLY',
      })
      toast({ title: 'Successo!', description: `Piano ${planName} attivato con successo!` })
    } catch (error: any) {
      toast({ title: 'Errore', description: error.message || 'Errore durante l\'attivazione', variant: 'destructive' })
    }
  }

  const features = {
    FREE: [
      { text: 'Listing illimitati', included: true },
      { text: 'Ricerca marketplace', included: true },
      { text: 'SafeTrade base', included: true },
      { text: '3 price alerts', included: true },
      { text: 'Community pubblica', included: true },
      { text: 'Early Access listing', included: false },
      { text: 'Notifiche istantanee', included: false },
      { text: 'Priority SafeTrade', included: false },
      { text: 'Community Premium', included: false },
    ],
    PREMIUM: [
      { text: 'Tutto del piano FREE', included: true },
      { text: 'Early Access 24h', included: true, highlight: true },
      { text: '20 price alerts', included: true },
      { text: 'Notifiche push istantanee', included: true, highlight: true },
      { text: 'Priority SafeTrade (5/mese)', included: true },
      { text: 'Community Premium', included: true, highlight: true },
      { text: 'Badge Premium Member', included: true },
      { text: 'Bulk listing tools', included: false },
      { text: 'Alert SMS', included: false },
    ],
    PRO: [
      { text: 'Tutto del piano PREMIUM', included: true },
      { text: 'Early Access 48h', included: true, highlight: true },
      { text: 'Alert illimitati', included: true, highlight: true },
      { text: 'Alert via SMS', included: true },
      { text: 'Priority SafeTrade illimitata', included: true, highlight: true },
      { text: 'Bulk listing tools', included: true },
      { text: 'Badge PRO Member', included: true },
      { text: 'API access', included: true },
      { text: 'Support prioritario', included: true },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-gradient-to-r from-orange-500 to-purple-500 text-white border-0">
            🚀 Launch Special - 2 mesi gratis con piano annuale!
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
            Scegli il piano perfetto per te
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Ottieni accesso anticipato agli affari migliori, notifiche istantanee e molto altro.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`font-medium ${!isYearly ? 'text-primary' : 'text-gray-500'}`}>
            Mensile
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-primary"
          />
          <span className={`font-medium ${isYearly ? 'text-primary' : 'text-gray-500'}`}>
            Annuale
            <Badge className="ml-2 bg-green-500 text-white text-xs">-17%</Badge>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* FREE */}
          <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <p className="text-gray-500 text-sm mb-4">Per iniziare</p>
              <div className="text-4xl font-bold">€0</div>
              <div className="text-gray-500 text-sm">per sempre</div>
            </div>

            <ul className="space-y-3 mb-8">
              {features.FREE.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-lg ${feature.included ? 'text-green-500' : 'text-gray-300'}`}>
                    {feature.included ? 'check_circle' : 'cancel'}
                  </span>
                  <span className={feature.included ? '' : 'text-gray-400'}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              disabled={subscription?.tier === 'FREE'}
              onClick={() => handleSelectPlan('FREE')}
            >
              {subscription?.tier === 'FREE' ? 'Piano attuale' : 'Inizia gratis'}
            </Button>
          </Card>

          {/* PREMIUM */}
          <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-purple-500/10 dark:from-orange-500/20 dark:to-purple-500/20 backdrop-blur-xl border-2 border-orange-500/50 shadow-2xl relative scale-105">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-purple-500 text-white">
              🔥 Più popolare
            </Badge>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">Premium</h3>
              <p className="text-gray-500 text-sm mb-4">Per collezionisti seri</p>
              <div className="text-4xl font-bold">
                €{isYearly ? '8.33' : '9.99'}
              </div>
              <div className="text-gray-500 text-sm">
                {isYearly ? '/mese (fatturato annualmente)' : '/mese'}
              </div>
              {isYearly && (
                <Badge className="mt-2 bg-green-500/20 text-green-600 border-green-500/30">
                  Risparmi €20/anno
                </Badge>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {features.PREMIUM.map((feature, i) => (
                <li key={i} className={`flex items-center gap-2 ${feature.highlight ? 'font-medium' : ''}`}>
                  <span className={`material-symbols-outlined text-lg ${feature.included ? (feature.highlight ? 'text-orange-500' : 'text-green-500') : 'text-gray-300'}`}>
                    {feature.included ? (feature.highlight ? 'star' : 'check_circle') : 'cancel'}
                  </span>
                  <span className={feature.included ? '' : 'text-gray-400'}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-purple-500 hover:from-orange-600 hover:to-purple-600"
              disabled={subscription?.tier === 'PREMIUM' || updateSubscription.isPending}
              onClick={() => handleSelectPlan('PREMIUM')}
            >
              {updateSubscription.isPending ? 'Elaborazione...' : 
               subscription?.tier === 'PREMIUM' ? 'Piano attuale' : 
               'Passa a Premium'}
            </Button>
          </Card>

          {/* PRO */}
          <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-blue-500/5 dark:from-purple-500/10 dark:to-blue-500/10 backdrop-blur-xl border-purple-500/30 shadow-xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2 text-purple-600">Pro</h3>
              <p className="text-gray-500 text-sm mb-4">Per professionisti</p>
              <div className="text-4xl font-bold">
                €{isYearly ? '16.66' : '19.99'}
              </div>
              <div className="text-gray-500 text-sm">
                {isYearly ? '/mese (fatturato annualmente)' : '/mese'}
              </div>
              {isYearly && (
                <Badge className="mt-2 bg-green-500/20 text-green-600 border-green-500/30">
                  Risparmi €40/anno
                </Badge>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {features.PRO.map((feature, i) => (
                <li key={i} className={`flex items-center gap-2 ${feature.highlight ? 'font-medium' : ''}`}>
                  <span className={`material-symbols-outlined text-lg ${feature.included ? (feature.highlight ? 'text-purple-500' : 'text-green-500') : 'text-gray-300'}`}>
                    {feature.included ? (feature.highlight ? 'verified' : 'check_circle') : 'cancel'}
                  </span>
                  <span className={feature.included ? '' : 'text-gray-400'}>{feature.text}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full border-purple-500 text-purple-600 hover:bg-purple-50"
              disabled={subscription?.tier === 'PRO' || updateSubscription.isPending}
              onClick={() => handleSelectPlan('PRO')}
            >
              {updateSubscription.isPending ? 'Elaborazione...' : 
               subscription?.tier === 'PRO' ? 'Piano attuale' : 
               'Passa a Pro'}
            </Button>
          </Card>
        </div>

        {/* Current Plan Info */}
        {subscription?.subscription && (
          <div className="mt-12 text-center">
            <Card className="inline-block p-4 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <p className="text-gray-600 dark:text-gray-300">
                Piano attuale: <strong className="text-primary">{subscription.tier}</strong>
                {subscription.subscription.endDate && (
                  <span className="ml-2 text-sm">
                    • Rinnovo: {new Date(subscription.subscription.endDate).toLocaleDateString('it-IT')}
                  </span>
                )}
              </p>
            </Card>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Domande frequenti</h2>
          
          <div className="space-y-6">
            <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold text-lg mb-2">Cos'è l'Early Access?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                I membri Premium vedono i nuovi listing 24 ore prima di tutti gli altri. 
                Questo ti dà un vantaggio enorme per trovare le carte migliori al prezzo migliore!
              </p>
            </Card>

            <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold text-lg mb-2">Posso cancellare in qualsiasi momento?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Sì! Puoi cancellare il tuo abbonamento quando vuoi. L'accesso Premium rimarrà attivo 
                fino alla fine del periodo di fatturazione corrente.
              </p>
            </Card>

            <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold text-lg mb-2">Come funziona la Priority SafeTrade?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Le tue transazioni SafeTrade vengono processate con priorità rispetto agli utenti Free. 
                Meno attesa, più affari conclusi!
              </p>
            </Card>

            <Card className="p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl">
              <h3 className="font-bold text-lg mb-2">Che metodi di pagamento accettate?</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Accettiamo carte di credito/debito (Visa, Mastercard, American Express) e PayPal. 
                Tutti i pagamenti sono sicuri e processati tramite Stripe.
              </p>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

