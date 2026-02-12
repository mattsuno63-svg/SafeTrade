'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MetaballBackground } from '@/components/homepage/MetaballBackground'

export default function SafeVaultPage() {
  const { locale } = useLocale()
  const isItalian = locale === 'it'
  const heroRef = useRef<HTMLDivElement>(null)
  const badgeRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const buttonsRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isVisible, setIsVisible] = useState(false)
  const [animatedSections, setAnimatedSections] = useState<Set<string>>(new Set())
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        setMousePosition({ x, y })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-animate-id')
            if (id) {
              setAnimatedSections((prev) => new Set([...prev, id]))
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    const elements = document.querySelectorAll('[data-animate-id]')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const faqs = [
    {
      question: isItalian ? 'Cos\'è SafeVault?' : 'What is SafeVault?',
      answer: isItalian
        ? 'SafeVault è il servizio di deposito custodito di SafeTrade: invii le tue carte a un hub certificato o le consegni in un negozio partner; vengono verificate, catalogate e custodite in sicurezza. Puoi venderle online mentre le carte restano al sicuro in vault.'
        : 'SafeVault is SafeTrade\'s custodial storage service: you send your cards to a certified hub or drop them at a partner store; they are verified, catalogued and stored securely. You can sell them online while the cards stay safe in the vault.',
    },
    {
      question: isItalian ? 'Quanto costa depositare le carte?' : 'How much does it cost to deposit cards?',
      answer: isItalian
        ? 'Il costo dipende dal numero di carte e dal valore dichiarato. È prevista una tariffa di gestione deposito e, se richiesta, la verifica fisica. I dettagli sono visibili al momento della creazione del deposito.'
        : 'The cost depends on the number of cards and declared value. A deposit management fee applies and, if requested, physical verification. Details are shown when creating a deposit.',
    },
    {
      question: isItalian ? 'Dove vengono custodite le mie carte?' : 'Where are my cards stored?',
      answer: isItalian
        ? 'Le carte accettate vengono assegnate a un vault fisico presso uno dei nostri negozi partner. Ogni item ha uno slot identificato e tracciato; puoi vedere in quale case e slot si trova dalla dashboard.'
        : 'Accepted cards are assigned to a physical vault at one of our partner stores. Each item has an identified, tracked slot; you can see which case and slot it is in from the dashboard.',
    },
    {
      question: isItalian ? 'Posso vendere le carte mentre sono in vault?' : 'Can I sell cards while they are in the vault?',
      answer: isItalian
        ? 'Sì. Una volta in vault puoi metterle in vendita sul marketplace. All\'acquisto, il negozio partner prepara e spedisce la carta; i fondi vengono gestiti in sicurezza come per le altre transazioni SafeTrade.'
        : 'Yes. Once in the vault you can list them for sale on the marketplace. On purchase, the partner store prepares and ships the card; funds are handled securely as with other SafeTrade transactions.',
    },
    {
      question: isItalian ? 'Come ritiro le carte dal vault?' : 'How do I withdraw cards from the vault?',
      answer: isItalian
        ? 'Puoi richiedere il ritiro tramite la sezione Vault: le carte ti vengono rispedite o puoi ritirarle in negozio secondo le opzioni disponibili per il tuo hub.'
        : 'You can request withdrawal via the Vault section: cards are shipped back to you or you can pick them up in store, depending on the options available for your hub.',
    },
  ]

  return (
    <div className="min-h-screen bg-background-light text-slate-900 selection:bg-primary/30 antialiased">
      <Header />

      <main className="relative">
        {/* Hero Section */}
        <section
          ref={heroRef}
          data-hero-section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
          <MetaballBackground />
          <div className="absolute inset-0 grid-background-fade opacity-30 z-0" />

          <div className="relative z-20 max-w-6xl mx-auto px-6 flex flex-col items-center justify-center">
            <div
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg mb-6 transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                transitionDelay: '0.2s',
              }}
            >
              <span className="material-symbols-outlined text-primary text-lg">account_balance</span>
              <span className="text-sm font-bold text-slate-900">
                {isItalian ? 'Deposito Custodito' : 'Custodial Storage'}
              </span>
            </div>

            <div
              className="relative inline-block mb-12 px-16 py-10 rounded-3xl transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
                transitionDelay: '0.4s',
              }}
            >
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden"
                style={{
                  background: `radial-gradient(circle 800px at ${mousePosition.x}% ${mousePosition.y}%, 
                    rgba(255, 255, 255, 0.95) 0%, 
                    rgba(255, 255, 255, 0.85) 40%, 
                    rgba(255, 255, 255, 0.7) 70%, 
                    rgba(255, 255, 255, 0.5) 90%,
                    transparent 100%)`,
                  backdropFilter: 'blur(60px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(60px) saturate(200%)',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  boxShadow: `
                    0 25px 80px rgba(0, 0, 0, 0.12),
                    0 10px 30px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.98),
                    inset 0 -1px 0 rgba(255, 255, 255, 0.5)
                  `,
                  transform: `translate(${(mousePosition.x - 50) * 0.02}px, ${(mousePosition.y - 50) * 0.02}px)`,
                  transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: `radial-gradient(circle 500px at ${mousePosition.x}% ${mousePosition.y}%, 
                    rgba(255, 107, 53, 0.08) 0%, 
                    rgba(255, 107, 53, 0.04) 50%,
                    transparent 70%)`,
                  transition: 'background 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
              />
              <div
                className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.3) 0%, 
                    transparent 50%,
                    rgba(255, 255, 255, 0.1) 100%)`,
                  mixBlendMode: 'overlay',
                }}
              />

              <h1
                ref={titleRef}
                className="text-5xl md:text-7xl font-display font-black tracking-tighter leading-[1.1] relative z-10 text-center"
                style={{
                  color: '#1e293b',
                  textShadow: `
                    0 1px 2px rgba(0, 0, 0, 0.05),
                    0 2px 4px rgba(0, 0, 0, 0.03)
                  `,
                }}
              >
                {isItalian ? (
                  <>
                    Le Tue Carte<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">
                      Sempre al Sicuro
                    </span>
                  </>
                ) : (
                  <>
                    Your Cards<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">
                      Always Secure
                    </span>
                  </>
                )}
              </h1>
            </div>

            <p
              ref={subtitleRef}
              className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto font-medium leading-relaxed transition-all duration-1000 text-center"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '0.6s',
              }}
            >
              {isItalian
                ? 'Deposita, verifica e vendi senza preoccupazioni. SafeVault custodisce le tue carte nei nostri hub certificati e nei negozi partner: tracciamento completo e vendita online con la carta al sicuro.'
                : 'Deposit, verify and sell with peace of mind. SafeVault stores your cards at our certified hubs and partner stores: full tracking and online selling with your cards secure.'}
            </p>

            <div
              ref={buttonsRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '0.8s',
              }}
            >
              <Link href="/vault">
                <Button className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all text-lg">
                  {isItalian ? 'Accedi al Vault' : 'Access Vault'}
                </Button>
              </Link>
              <Link href="/vault/deposit/new">
                <Button variant="outline" className="px-8 py-4 bg-white/40 backdrop-blur-3xl text-slate-900 font-bold rounded-2xl border border-white/80 hover:bg-white/90 transition-all text-lg">
                  {isItalian ? 'Nuovo Deposito' : 'New Deposit'}
                </Button>
              </Link>
            </div>
          </div>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 opacity-40 animate-bounce">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              {isItalian ? 'Scorri' : 'Scroll'}
            </span>
            <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1.5">
              <div className="w-1 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Come funziona SafeVault */}
        <section className="py-24 relative bg-white/50 border-t-0 border-b-0">
          <div className="max-w-7xl mx-auto px-6">
            <div
              className="text-center mb-16 transition-all duration-1000"
              data-animate-id="how-it-works-title"
              style={{
                opacity: animatedSections.has('how-it-works-title') ? 1 : 0,
                transform: animatedSections.has('how-it-works-title') ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-black tracking-tighter mb-4 text-slate-900">
                {isItalian ? 'Come Funziona SafeVault' : 'How SafeVault Works'}
              </h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {[
                {
                  icon: 'inventory_2',
                  title: isItalian ? '1. Crea il deposito' : '1. Create deposit',
                  description: isItalian
                    ? 'Registra le carte che vuoi depositare e scegli spedizione al hub o consegna in negozio partner.'
                    : 'Register the cards you want to deposit and choose shipping to hub or drop-off at partner store.',
                },
                {
                  icon: 'local_shipping',
                  title: isItalian ? '2. Spedisci o consegna' : '2. Ship or drop off',
                  description: isItalian
                    ? 'Spedisci il pacco con tracciamento o consegna le carte in un punto SafeTrade autorizzato.'
                    : 'Ship the package with tracking or drop off the cards at an authorized SafeTrade point.',
                },
                {
                  icon: 'fact_check',
                  title: isItalian ? '3. Verifica e catalogazione' : '3. Verification & cataloguing',
                  description: isItalian
                    ? 'I nostri esperti verificano autenticità e condizioni, poi assegnano ogni item a uno slot nel vault.'
                    : 'Our experts verify authenticity and condition, then assign each item to a slot in the vault.',
                },
                {
                  icon: 'store',
                  title: isItalian ? '4. In vault e in vendita' : '4. In vault & for sale',
                  description: isItalian
                    ? 'Le carte restano custodite in negozio; puoi metterle in vendita e ritirare quando vuoi.'
                    : 'Cards stay stored in store; you can list them for sale and withdraw when you want.',
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center group transition-all duration-1000"
                  data-animate-id={`step-vault-${idx}`}
                  style={{
                    opacity: animatedSections.has(`step-vault-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`step-vault-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  <div
                    className="w-full mb-6 p-6 rounded-3xl relative overflow-hidden group-hover:scale-105 transition-all duration-500"
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: `
                        0 8px 32px rgba(0, 0, 0, 0.08),
                        0 2px 8px rgba(0, 0, 0, 0.04),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `,
                    }}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 relative">
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255, 107, 53, 0.15) 0%, transparent 70%)`,
                        }}
                      />
                      <span className="material-symbols-outlined text-primary text-4xl relative z-10 animate-pulse-slow">
                        {step.icon}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-black">{idx + 1}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Vantaggi SafeVault */}
        <section className="py-24 relative bg-white/30 rounded-[40px] mx-6 border border-white/20 mt-0">
          <div className="max-w-7xl mx-auto px-6">
            <div
              className="text-center mb-16 transition-all duration-1000"
              data-animate-id="benefits-title"
              style={{
                opacity: animatedSections.has('benefits-title') ? 1 : 0,
                transform: animatedSections.has('benefits-title') ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-black tracking-tighter mb-4 text-slate-900">
                {isItalian ? 'Perché Scegliere SafeVault' : 'Why Choose SafeVault'}
              </h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative mb-12">
              {[
                {
                  icon: 'security',
                  title: isItalian ? 'Custodia sicura' : 'Secure custody',
                  description: isItalian
                    ? 'Carte in vault fisico con slot tracciati e accesso solo a personale autorizzato.'
                    : 'Cards in physical vault with tracked slots and access only for authorized staff.',
                },
                {
                  icon: 'verified',
                  title: isItalian ? 'Verifica inclusa' : 'Verification included',
                  description: isItalian
                    ? 'Autenticità e condizioni certificate prima dell\'ingresso in vault.'
                    : 'Authenticity and condition certified before entry into the vault.',
                },
                {
                  icon: 'sell',
                  title: isItalian ? 'Vendi senza spedire' : 'Sell without shipping',
                  description: isItalian
                    ? 'Metti in vendita e lascia che il negozio partner gestisca picking e spedizione.'
                    : 'List for sale and let the partner store handle picking and shipping.',
                },
                {
                  icon: 'track_changes',
                  title: isItalian ? 'Tracciamento totale' : 'Full tracking',
                  description: isItalian
                    ? 'Stato deposito, slot e vendite sempre visibili dalla tua dashboard.'
                    : 'Deposit status, slot and sales always visible from your dashboard.',
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center group transition-all duration-1000"
                  data-animate-id={`benefit-vault-${idx}`}
                  style={{
                    opacity: animatedSections.has(`benefit-vault-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`benefit-vault-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  <div
                    className="w-full mb-6 p-6 rounded-3xl relative overflow-hidden group-hover:scale-105 transition-all duration-500"
                    style={{
                      background: 'rgba(255, 255, 255, 0.85)',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: `
                        0 8px 32px rgba(0, 0, 0, 0.08),
                        0 2px 8px rgba(0, 0, 0, 0.04),
                        inset 0 1px 0 rgba(255, 255, 255, 0.9)
                      `,
                    }}
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 relative">
                      <div
                        className="absolute inset-0 rounded-2xl"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, rgba(255, 107, 53, 0.15) 0%, transparent 70%)`,
                        }}
                      />
                      <span className="material-symbols-outlined text-primary text-4xl relative z-10 animate-pulse-slow">
                        {step.icon}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-slate-900">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>

            <div
              className="max-w-3xl mx-auto p-8 rounded-3xl transition-all duration-1000 mt-12"
              data-animate-id="vault-quote"
              style={{
                opacity: animatedSections.has('vault-quote') ? 1 : 0,
                transform: animatedSections.has('vault-quote') ? 'translateY(0)' : 'translateY(20px)',
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
                boxShadow: `
                  0 8px 32px rgba(0, 0, 0, 0.08),
                  0 2px 8px rgba(0, 0, 0, 0.04),
                  inset 0 1px 0 rgba(255, 255, 255, 0.9)
                `,
              }}
            >
              <div className="flex items-start gap-6">
                <div
                  className="w-16 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%)',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                  }}
                >
                  <span className="material-symbols-outlined text-primary text-3xl relative z-10">account_balance</span>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900 leading-relaxed mb-2">
                    {isItalian ? (
                      <>
                        &ldquo;Le tue carte restano{' '}
                        <span
                          className="text-primary relative inline-block"
                          style={{
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(255, 107, 53, 0.8)',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          fisicamente custodite
                        </span>
                        {' '}in vault certificato: vendi online con zero rischio di perdita o danneggiamento in transito.&rdquo;
                      </>
                    ) : (
                      <>
                        &ldquo;Your cards stay{' '}
                        <span
                          className="text-primary relative inline-block"
                          style={{
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(255, 107, 53, 0.8)',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          physically stored
                        </span>
                        {' '}in certified vault: sell online with zero risk of loss or damage in transit.&rdquo;
                      </>
                    )}
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3">
                    {isItalian ? 'GARANZIA SAFEVAULT' : 'SAFEVAULT GUARANTEE'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Per i negozi: host a vault */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div
                className="lg:w-1/3 text-left transition-all duration-1000"
                data-animate-id="stores-text"
                style={{
                  opacity: animatedSections.has('stores-text') ? 1 : 0,
                  transform: animatedSections.has('stores-text') ? 'translateX(0)' : 'translateX(-30px)',
                }}
              >
                <span className="text-primary font-bold tracking-widest text-xs uppercase mb-3 block">
                  {isItalian ? 'Partner Store' : 'Partner Store'}
                </span>
                <h2 className="text-4xl font-display font-black mb-6 leading-tight text-slate-900">
                  {isItalian ? 'Hosti un Vault nel Tuo Negozio?' : 'Host a Vault in Your Store?'}
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  {isItalian
                    ? 'I negozi partner SafeTrade possono ospitare vault fisici: ricevi depositi, gestisci slot e vendite, e guadagna su ogni transazione custodita.'
                    : 'SafeTrade partner stores can host physical vaults: receive deposits, manage slots and sales, and earn on every custodial transaction.'}
                </p>
                <Link href="/merchant/register">
                  <Button className="bg-primary text-white font-bold px-8 py-3 rounded-2xl hover:scale-105 transition-all w-fit shadow-lg shadow-primary/20">
                    {isItalian ? 'Diventa Partner' : 'Become a Partner'}
                  </Button>
                </Link>
              </div>

              <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  {
                    icon: 'inventory',
                    title: isItalian ? 'Ricevi depositi' : 'Receive deposits',
                    description: isItalian
                      ? 'I collezionisti consegnano o spediscono le carte al tuo vault; tu le registri e le assegni agli slot.'
                      : 'Collectors drop off or ship cards to your vault; you register and assign them to slots.',
                  },
                  {
                    icon: 'payments',
                    title: isItalian ? 'Commissioni su vendite' : 'Commissions on sales',
                    description: isItalian
                      ? 'Guadagna quando le carte custodite nel tuo vault vengono vendute sul marketplace.'
                      : 'Earn when cards stored in your vault are sold on the marketplace.',
                  },
                  {
                    icon: 'local_shipping',
                    title: isItalian ? 'Spedisci per il venditore' : 'Ship for the seller',
                    description: isItalian
                      ? 'All\'acquisto prepara e spedisci la carta; il venditore non deve occuparsene.'
                      : 'On purchase you prepare and ship the card; the seller doesn\'t have to.',
                  },
                  {
                    icon: 'groups',
                    title: isItalian ? 'Più traffico in negozio' : 'More store traffic',
                    description: isItalian
                      ? 'Chi deposita e ritira passa dal tuo negozio; più visibilità e fiducia nel brand.'
                      : 'Those who deposit and withdraw come to your store; more visibility and brand trust.',
                  },
                ].map((benefit, idx) => (
                  <div
                    key={idx}
                    className="p-8 liquid-glass rounded-3xl border-white/40 hover:bg-white/50 transition-all duration-1000"
                    data-animate-id={`store-benefit-${idx}`}
                    style={{
                      opacity: animatedSections.has(`store-benefit-${idx}`) ? 1 : 0,
                      transform: animatedSections.has(`store-benefit-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
                      transitionDelay: `${idx * 0.1}s`,
                    }}
                  >
                    <span className="material-symbols-outlined text-primary text-3xl mb-4 block">{benefit.icon}</span>
                    <h3 className="text-xl font-bold mb-2 text-slate-900">{benefit.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Feature Icons */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { icon: 'verified', label: isItalian ? 'Certificato' : 'Certified' },
                { icon: 'health_and_safety', label: isItalian ? 'Assicurato' : 'Insured' },
                { icon: 'workspace_premium', label: isItalian ? 'Tracciato' : 'Tracked' },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-3 transition-all duration-1000"
                  data-animate-id={`feature-vault-${idx}`}
                  style={{
                    opacity: animatedSections.has(`feature-vault-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`feature-vault-${idx}`) ? 'scale(1)' : 'scale(0.8)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  <div className="w-32 h-32 liquid-glass rounded-full flex flex-col items-center justify-center border-2 border-primary/20 transform hover:scale-110 transition-all cursor-default">
                    <span className="material-symbols-outlined text-primary text-4xl mb-1">{feature.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">{feature.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 max-w-4xl mx-auto px-6">
          <div
            className="text-center mb-16 transition-all duration-1000"
            data-animate-id="faq-vault-title"
            style={{
              opacity: animatedSections.has('faq-vault-title') ? 1 : 0,
              transform: animatedSections.has('faq-vault-title') ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-4 text-slate-900">
              {isItalian ? 'Domande Frequenti' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-slate-500">
              {isItalian ? 'Tutto quello che devi sapere su SafeVault.' : 'Everything you need to know about SafeVault.'}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <details
                key={idx}
                className="group faq-item liquid-glass rounded-3xl transition-all duration-300 overflow-hidden"
                open={openFAQ === idx}
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) {
                    setOpenFAQ(idx)
                  } else {
                    setOpenFAQ(null)
                  }
                }}
              >
                <summary className="flex items-center justify-between p-6 md:p-8 cursor-pointer list-none">
                  <h3 className="text-lg md:text-xl font-bold text-slate-900 pr-4">{faq.question}</h3>
                  <div
                    className={`expand-icon w-10 h-10 liquid-glass rounded-full flex items-center justify-center transition-transform duration-300 border border-primary/20 flex-shrink-0 ${
                      openFAQ === idx ? 'rotate-45' : ''
                    }`}
                  >
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                </summary>
                <div className="px-6 pb-8 md:px-8 md:pb-10 text-slate-600 leading-relaxed">{faq.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 mb-20 relative overflow-hidden rounded-[40px] mx-6">
          <div className="absolute inset-0 bg-primary/5 -z-10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-5 blur-[120px] -z-10"></div>
          <div
            className="text-center px-6 transition-all duration-1000"
            data-animate-id="final-cta-vault"
            style={{
              opacity: animatedSections.has('final-cta-vault') ? 1 : 0,
              transform: animatedSections.has('final-cta-vault') ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-black mb-8 text-slate-900">
              {isItalian ? 'Pronto a custodire le tue carte?' : 'Ready to store your cards securely?'}
            </h2>
            <p className="max-w-xl mx-auto text-slate-500 mb-12 text-lg">
              {isItalian
                ? 'Crea il tuo primo deposito o accedi al vault per gestire inventario e vendite.'
                : 'Create your first deposit or access the vault to manage inventory and sales.'}
            </p>
            <Link href="/vault">
              <Button className="bg-primary text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-4">
                <span>{isItalian ? 'Vai al Vault' : 'Go to Vault'}</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
