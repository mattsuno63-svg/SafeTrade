'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUser } from '@/hooks/use-user'
import Image from 'next/image'
import { OnboardingMetaballBackground } from '@/components/onboarding/OnboardingMetaballBackground'
import { ITALIAN_PROVINCES, searchProvinces } from '@/lib/data/italian-provinces'

// Charizard image
const charizardImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3PdU7cx6XnZMsiV942Vum5vj3iNZ9noVzkZs5HHcFx5JvLlPfHFIMHPN5HlgYlS6MnLgmwu-B-_87NJvIgXr8cFFuuwaj19TwtlUEvo0lSUWwOZmG62hCOFDLefunQxzhvDWusnz_4znGvdYrWCGxU5XVvlydI2zU8l72ynj61xDuBslYap5TWkswR8p3ftD-7Mudfu6U_1JCeIWkgZweDzIM-FNMZULPNacLnAk3bZGAX5VtYLKGnS6sGHOcGaNPGnkdP5IjW-NI'

// User onboarding steps
const userSteps = [
  {
    id: 1,
    title: 'Benvenuto su SafeTrade',
    subtitle: 'Compra e vendi carte collezionabili con un processo protetto, tracciato e semplice.',
    ctaPrimary: 'Inizia',
    ctaSecondary: 'Scopri come funziona',
    type: 'welcome'
  },
  {
    id: 2,
    title: 'Scegli il tuo obiettivo',
    subtitle: 'Cosa vuoi fare oggi?',
    helper: 'Potrai cambiare in qualsiasi momento dal tuo profilo.',
    options: [
      { id: 'buy', label: 'Comprare carte', icon: 'shopping_cart' },
      { id: 'sell', label: 'Vendere carte', icon: 'sell' },
      { id: 'both', label: 'Entrambi', icon: 'swap_horiz' }
    ],
    type: 'choice'
  },
  {
    id: 3,
    title: 'Ogni scambio è protetto',
    subtitle: 'Come funziona la protezione',
    points: [
      'I fondi vengono trattenuti in escrow fino al completamento della verifica.',
      'Puoi scegliere un negozio partner per verificare autenticità e condizioni.',
      'Ogni step è tracciato e in caso di problemi puoi aprire una dispute guidata.'
    ],
    note: 'Niente trattative "a fiducia": passaggi chiari e conferme.',
    cta: 'Ok, continua',
    type: 'protection'
  },
  {
    id: 4,
    title: 'Personalizza l\'esperienza',
    subtitle: 'Impostazioni rapide',
    fields: {
      games: ['Pokemon', 'Magic', 'Yu-Gi-Oh', 'Altro'],
      distance: ['5 km', '15 km', '50 km', 'Nessun limite'],
      notifications: ['Proposte', 'Messaggi', 'Aggiornamenti transazioni']
    },
    cta: 'Salva e continua',
    type: 'settings'
  },
  {
    id: 5,
    title: 'Pubblica il tuo primo annuncio',
    titleAlt: 'Trova la tua prima carta',
    suggestion: 'Aggiungi foto chiare, condizione e descrizione: riduce dispute e accelera la vendita.',
    ctaPrimary: 'Crea un annuncio',
    ctaPrimaryAlt: 'Esplora il marketplace',
    type: 'action'
  }
]

// Merchant onboarding steps
const merchantSteps = [
  {
    id: 1,
    title: 'Attiva il profilo negozio',
    subtitle: 'Gestisci profilo, inventario, offerte, tornei e verifiche SafeTrade dalla dashboard.',
    cta: 'Configura negozio',
    type: 'welcome'
  },
  {
    id: 2,
    title: 'Verifica semplice, transazione più sicura',
    subtitle: 'Come funzionano le verifiche',
    points: [
      'Appuntamenti a slot e check-in: processo ordinato in negozio.',
      'Checklist verifica (autenticità/condizioni + foto documentazione).',
      'Transazione tracciata con stati e log; fondi in escrow fino a esito.'
    ],
    cta: 'Vai alla dashboard',
    type: 'verification'
  }
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useUser()
  const isMerchant = searchParams.get('type') === 'merchant' || user?.role === 'MERCHANT'
  
  const steps = isMerchant ? merchantSteps : userSteps
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null)
  const [settings, setSettings] = useState({
    games: [] as string[],
    distance: '50 km',
    notifications: [] as string[],
    city: '',
    province: ''
  })
  const [provinceSearch, setProvinceSearch] = useState('')
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false)
  const [settingsError, setSettingsError] = useState('')

  const handleNext = () => {
    const step = steps[currentStep]
    
    if (step.type === 'choice' && !selectedGoal) {
      return
    }
    
    // Città obbligatoria nello step "Personalizza l'esperienza" per filtri zona (locale/regionale)
    if (step.type === 'settings') {
      if (!settings.city || settings.city.trim() === '') {
        setSettingsError('La città è obbligatoria per usare i filtri "Vicino a me" e "Nella mia provincia" nel marketplace.')
        return
      }
      setSettingsError('')
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = async () => {
    localStorage.setItem('onboarding_completed', 'true')
    if (selectedGoal) {
      localStorage.setItem('user_goal', selectedGoal)
    }
    if (settings.games.length > 0) {
      localStorage.setItem('preferred_games', JSON.stringify(settings.games))
    }
    if (settings.distance) {
      localStorage.setItem('preferred_distance', settings.distance)
    }
    
    // Salva city e province nel profilo utente (città obbligatoria per filtri zona)
    if (user && settings.city?.trim()) {
      try {
        await fetch('/api/user/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city: settings.city.trim(),
            province: settings.province?.trim() || null,
          }),
        })
      } catch (error) {
        console.error('Error saving location:', error)
      }
    }
    
    const step = steps[currentStep]
    if (step.type === 'action') {
      if (selectedGoal === 'sell' || selectedGoal === 'both') {
        router.push('/listings/create')
      } else {
        router.push('/marketplace')
      }
    } else if (isMerchant) {
      router.push('/merchant/setup')
    } else {
      router.push('/')
    }
  }

  const currentStepData = steps[currentStep]
  const isWelcomeStep = currentStep === 0 && currentStepData.type === 'welcome'

  return (
    <div className="min-h-screen bg-background-light text-slate-900 selection:bg-primary/30 antialiased relative">
      {/* Grid Background - Always visible */}
      <div className="fixed inset-0 grid-background-fade pointer-events-none z-0"></div>
      
      {/* Metaball Background - Hidden in welcome step */}
      <OnboardingMetaballBackground hideInWelcome={isWelcomeStep} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 py-6 border-b border-slate-200/30 bg-white/60 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                <span className="text-primary font-black text-xl">ST</span>
              </div>
              <h1 className="text-2xl font-display font-black tracking-tighter">SafeTrade</h1>
            </div>
            <button
              onClick={handleSkip}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              Salta
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="max-w-6xl w-full">
            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-16">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    index === currentStep
                      ? 'w-12 bg-primary'
                      : index < currentStep
                      ? 'w-3 bg-primary/50'
                      : 'w-3 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Step Content Container */}
            <div className="relative min-h-[500px] flex items-center justify-center">
              {/* Welcome Step */}
              {currentStepData.type === 'welcome' && (
                <div className="w-full text-center space-y-10">
                  <div className="flex justify-center">
                    <div className="relative w-56 h-72 rounded-3xl overflow-hidden liquid-glass border border-white/80 backdrop-blur-3xl bg-white/60 shadow-liquid">
                      <Image
                        src={charizardImage}
                        alt="Charizard Shadowless"
                        fill
                        className="object-cover"
                        priority
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {currentStepData.title}
                    </h2>
                    <p className="text-2xl md:text-3xl text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
                      {currentStepData.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                      onClick={handleNext}
                      className="px-14 py-7 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1.5 transition-all text-lg"
                    >
                      {'ctaPrimary' in currentStepData ? currentStepData.ctaPrimary : currentStepData.cta || 'Continua'}
                    </Button>
                    {'ctaSecondary' in currentStepData && currentStepData.ctaSecondary && (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(2)}
                        className="px-10 py-7 bg-white/60 backdrop-blur-3xl border border-white/80 hover:bg-white/90 text-lg"
                      >
                        {currentStepData.ctaSecondary}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Choice Step */}
              {currentStepData.type === 'choice' && (
                <div className="w-full text-center space-y-10">
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {currentStepData.title}
                    </h2>
                    <p className="text-2xl text-slate-600">{currentStepData.subtitle}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {'options' in currentStepData && currentStepData.options?.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSelectedGoal(option.id)}
                        className={`liquid-glass p-10 rounded-3xl border border-white/80 backdrop-blur-3xl bg-white/60 shadow-liquid hover:shadow-liquid-hover transition-all text-left group ${
                          selectedGoal === option.id
                            ? 'ring-2 ring-primary bg-primary/5 scale-105'
                            : ''
                        }`}
                      >
                        <span className={`material-symbols-outlined text-5xl mb-6 block transition-transform group-hover:scale-110 ${
                          selectedGoal === option.id ? 'text-primary' : 'text-primary/70'
                        }`}>
                          {option.icon}
                        </span>
                        <h3 className="text-2xl font-display font-black mb-2">{option.label}</h3>
                      </button>
                    ))}
                  </div>
                  
                  {'helper' in currentStepData && currentStepData.helper && (
                    <p className="text-sm text-slate-500">{currentStepData.helper}</p>
                  )}
                </div>
              )}

              {/* Protection Step */}
              {currentStepData.type === 'protection' && (
                <div className="w-full text-center space-y-10">
                  <div className="flex justify-center">
                    <div className="relative w-72 h-96 rounded-3xl overflow-hidden liquid-glass border border-white/80 backdrop-blur-3xl bg-white/60 shadow-liquid">
                      <Image
                        src={charizardImage}
                        alt="Charizard Shadowless"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {currentStepData.title}
                    </h2>
                    <p className="text-2xl text-slate-600 mb-12">{currentStepData.subtitle}</p>
                  </div>
                  
                  <div className="max-w-3xl mx-auto space-y-6">
                    {'points' in currentStepData && currentStepData.points?.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-5 text-left liquid-glass p-6 rounded-2xl border border-white/80 backdrop-blur-3xl bg-white/60">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">
                            check_circle
                          </span>
                        </div>
                        <p className="text-xl text-slate-700 leading-relaxed pt-1">{point}</p>
                      </div>
                    ))}
                  </div>
                  
                  {'note' in currentStepData && currentStepData.note && (
                    <div className="liquid-glass p-6 rounded-2xl border border-primary/20 bg-primary/5 max-w-2xl mx-auto">
                      <p className="text-base text-slate-600 italic">{currentStepData.note}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Step */}
              {currentStepData.type === 'settings' && (
                <div className="w-full max-w-4xl mx-auto space-y-12">
                  <div className="text-center space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {currentStepData.title}
                    </h2>
                    <p className="text-2xl text-slate-600">{currentStepData.subtitle}</p>
                  </div>
                  
                  <div className="space-y-10">
                    {/* Games */}
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-5 uppercase tracking-wider">
                        Giochi preferiti
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {'fields' in currentStepData && currentStepData.fields?.games.map((game) => (
                          <button
                            key={game}
                            onClick={() => {
                              setSettings(prev => ({
                                ...prev,
                                games: prev.games.includes(game)
                                  ? prev.games.filter(g => g !== game)
                                  : [...prev.games, game]
                              }))
                            }}
                            className={`px-8 py-4 rounded-xl border transition-all font-medium text-base ${
                              settings.games.includes(game)
                                ? 'bg-primary text-white border-primary shadow-liquid'
                                : 'bg-white/60 border-white/80 text-slate-700 hover:bg-primary/10 hover:border-primary/30'
                            }`}
                          >
                            {game}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location - città obbligatoria per filtri zona marketplace */}
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-5 uppercase tracking-wider">
                        La tua posizione <span className="text-primary">*</span>
                      </label>
                      {settingsError && (
                        <p className="text-sm text-red-600 mb-3">{settingsError}</p>
                      )}
                      <div className="space-y-4">
                        <div>
                          <Input
                            type="text"
                            placeholder="Città (es. Ragusa, Milano)"
                            value={settings.city}
                            onChange={(e) => {
                              setSettings(prev => ({ ...prev, city: e.target.value }))
                              if (settingsError) setSettingsError('')
                            }}
                            className={`w-full px-4 py-3 rounded-xl border backdrop-blur-3xl ${
                              settingsError ? 'border-red-500 bg-red-50/50' : 'border-white/80 bg-white/60'
                            }`}
                            required
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Obbligatoria per filtrare le carte per zona (vicino a me / nella mia provincia).
                          </p>
                        </div>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="Provincia (es. Ragusa)"
                            value={provinceSearch}
                            onChange={(e) => {
                              setProvinceSearch(e.target.value)
                              setShowProvinceDropdown(true)
                            }}
                            onFocus={() => setShowProvinceDropdown(true)}
                            className="w-full px-4 py-3 rounded-xl border border-white/80 bg-white/60 backdrop-blur-3xl"
                          />
                          {showProvinceDropdown && (
                            <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto bg-white/95 backdrop-blur-3xl border border-white/80 rounded-xl shadow-lg">
                              {searchProvinces(provinceSearch).slice(0, 10).map((province) => (
                                <button
                                  key={province.code}
                                  onClick={() => {
                                    setSettings(prev => ({ ...prev, province: province.name }))
                                    setProvinceSearch(province.name)
                                    setShowProvinceDropdown(false)
                                  }}
                                  className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors"
                                >
                                  {province.name} ({province.code})
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Distance */}
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-5 uppercase tracking-wider">
                        Distanza massima dai tornei
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {'fields' in currentStepData && currentStepData.fields?.distance.map((dist) => (
                          <button
                            key={dist}
                            onClick={() => setSettings(prev => ({ ...prev, distance: dist }))}
                            className={`px-8 py-4 rounded-xl border transition-all font-medium text-base ${
                              settings.distance === dist
                                ? 'bg-primary text-white border-primary shadow-liquid'
                                : 'bg-white/60 border-white/80 text-slate-700 hover:bg-primary/10 hover:border-primary/30'
                            }`}
                          >
                            {dist}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notifications */}
                    <div>
                      <label className="block text-sm font-black text-slate-900 mb-5 uppercase tracking-wider">
                        Notifiche
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {'fields' in currentStepData && currentStepData.fields?.notifications.map((notif) => (
                          <button
                            key={notif}
                            onClick={() => {
                              setSettings(prev => ({
                                ...prev,
                                notifications: prev.notifications.includes(notif)
                                  ? prev.notifications.filter(n => n !== notif)
                                  : [...prev.notifications, notif]
                              }))
                            }}
                            className={`px-8 py-4 rounded-xl border transition-all font-medium text-base ${
                              settings.notifications.includes(notif)
                                ? 'bg-primary text-white border-primary shadow-liquid'
                                : 'bg-white/60 border-white/80 text-slate-700 hover:bg-primary/10 hover:border-primary/30'
                            }`}
                          >
                            {notif}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Step */}
              {currentStepData.type === 'action' && (
                <div className="w-full text-center space-y-10">
                  <div className="flex justify-center">
                    <div className="relative w-80 h-[500px] rounded-3xl overflow-hidden liquid-glass border border-white/80 backdrop-blur-3xl bg-white/60 shadow-liquid">
                      <Image
                        src={charizardImage}
                        alt="Charizard Shadowless PSA 10"
                        fill
                        className="object-cover"
                        priority
                      />
                      {/* Holographic effect overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent pointer-events-none"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {'titleAlt' in currentStepData && selectedGoal === 'buy' ? currentStepData.titleAlt : currentStepData.title}
                    </h2>
                    {'suggestion' in currentStepData && currentStepData.suggestion && (
                      <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        {currentStepData.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Merchant Verification Step */}
              {currentStepData.type === 'verification' && (
                <div className="w-full text-center space-y-10">
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-7xl font-display font-black tracking-tighter">
                      {currentStepData.title}
                    </h2>
                    <p className="text-2xl text-slate-600 mb-12">{currentStepData.subtitle}</p>
                  </div>
                  
                  <div className="max-w-3xl mx-auto space-y-6">
                    {'points' in currentStepData && currentStepData.points?.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-5 text-left liquid-glass p-6 rounded-2xl border border-white/80 backdrop-blur-3xl bg-white/60">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-primary text-xl">
                            verified
                          </span>
                        </div>
                        <p className="text-xl text-slate-700 leading-relaxed pt-1">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-16 flex items-center justify-center gap-4">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="px-10 py-6 bg-white/60 backdrop-blur-3xl border border-white/80 hover:bg-white/90"
                >
                  Indietro
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                disabled={
                  (currentStepData.type === 'choice' && !selectedGoal) ||
                  (currentStepData.type === 'settings' && !settings.city?.trim())
                }
                className="px-14 py-6 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1.5 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {currentStep === steps.length - 1 
                  ? (currentStepData.type === 'action' 
                      ? ('ctaPrimaryAlt' in currentStepData && selectedGoal === 'buy' ? currentStepData.ctaPrimaryAlt : ('ctaPrimary' in currentStepData ? currentStepData.ctaPrimary : 'Inizia'))
                      : ('cta' in currentStepData ? currentStepData.cta : 'Inizia'))
                  : ('cta' in currentStepData ? currentStepData.cta : 'Avanti')}
                <span className="material-symbols-outlined font-bold">
                  {currentStep === steps.length - 1 ? 'check' : 'arrow_forward'}
                </span>
              </Button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 py-6 text-center border-t border-slate-200/30 bg-white/60 backdrop-blur-sm">
          <p className="text-sm text-slate-500">
            L'ecosistema definitivo per i professionisti del TCG
          </p>
        </footer>
      </div>
    </div>
  )
}

const fallback = <div className="flex min-h-[40vh] items-center justify-center"><span className="text-muted-foreground">Caricamento...</span></div>
export default function OnboardingPage() {
  return <Suspense fallback={fallback}><OnboardingContent /></Suspense>
}
