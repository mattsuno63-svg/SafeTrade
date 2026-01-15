'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MetaballBackground } from '@/components/homepage/MetaballBackground'

export default function SafeTradePage() {
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

  // Intersection Observer for scroll animations
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
      question: isItalian ? 'Come funziona la verifica in negozio?' : 'How does in-store verification work?',
      answer: isItalian 
        ? 'Una volta concordato l\'appuntamento tramite la nostra piattaforma, buyer e seller si incontrano presso uno dei nostri centri autorizzati. Un esperto certificato SafeTrade esaminerà la carta sotto luce UV e ingrandimento per confermare autenticità e stato di conservazione.'
        : 'Once the appointment is agreed through our platform, buyer and seller meet at one of our authorized centers. A certified SafeTrade expert will examine the card under UV light and magnification to confirm authenticity and condition.',
    },
    {
      question: isItalian ? 'Quali sono i costi del servizio SafeTrade?' : 'What are the costs of the SafeTrade service?',
      answer: isItalian
        ? 'Il servizio prevede una commissione fissa per la gestione del deposito a garanzia (escrow) e un costo di verifica fisica variabile in base al valore dichiarato della carta, pagabile direttamente allo store partner o incluso nel servizio Central Escrow.'
        : 'The service includes a fixed commission for escrow management and a variable physical verification cost based on the declared card value, payable directly to the partner store or included in the Central Escrow service.',
    },
    {
      question: isItalian ? 'Cosa succede se la carta non supera la verifica?' : 'What happens if the card does not pass verification?',
      answer: isItalian
        ? 'In caso di esito negativo (carta contraffatta o condizioni non corrispondenti), la transazione viene annullata istantaneamente e i fondi bloccati in escrow vengono immediatamente rimborsati all\'acquirente. La carta viene restituita al venditore con un report dettagliato.'
        : 'In case of negative outcome (counterfeit card or non-matching conditions), the transaction is instantly cancelled and the funds blocked in escrow are immediately refunded to the buyer. The card is returned to the seller with a detailed report.',
    },
    {
      question: isItalian ? 'Posso scambiare carte oltre che venderle?' : 'Can I trade cards besides selling them?',
      answer: isItalian
        ? 'Assolutamente sì. Il nostro sistema supporta sia la compravendita diretta che lo scambio tra collezionisti. In caso di scambio, entrambe le carte passano attraverso il processo di verifica fisica prima della consegna finale per garantire equità.'
        : 'Absolutely yes. Our system supports both direct sales and trades between collectors. In case of trade, both cards go through the physical verification process before final delivery to ensure fairness.',
    },
    {
      question: isItalian ? 'Come trovo un negozio autorizzato vicino a me?' : 'How do I find an authorized store near me?',
      answer: isItalian
        ? 'Utilizza la nostra mappa interattiva disponibile nella sezione "Negozi". Ti basterà inserire la tua posizione o il CAP per visualizzare tutti i Partner certificati SafeTrade nell\'area, completi di orari e disponibilità per la verifica.'
        : 'Use our interactive map available in the "Stores" section. Just enter your location or ZIP code to view all certified SafeTrade Partners in the area, complete with hours and verification availability.',
    },
  ]

  return (
    <div className="min-h-screen bg-background-light text-slate-900 selection:bg-primary/30 antialiased">
      <Header />

      <main className="relative">
        {/* Hero Section - Full Screen */}
        <section 
          ref={heroRef}
          data-hero-section
          className="relative min-h-screen flex items-center justify-center overflow-hidden"
        >
          {/* Metaball Background Animation */}
          <MetaballBackground />

          {/* Grid Background */}
          <div className="absolute inset-0 grid-background-fade opacity-30 z-0" />

          {/* Hero Content */}
          <div className="relative z-20 max-w-6xl mx-auto px-6 flex flex-col items-center justify-center">
            {/* Badge - Above Title, Centered */}
            <div 
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-xl border border-white/60 shadow-lg mb-6 transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(-20px)',
                transitionDelay: '0.2s',
              }}
            >
              <span className="material-symbols-outlined text-primary text-lg">verified</span>
              <span className="text-sm font-bold text-slate-900">
                {isItalian ? 'Scambio Verificato' : 'Verified Exchange'}
              </span>
            </div>

            {/* Main Heading with Enhanced Glass Container - Centered */}
            <div 
              className="relative inline-block mb-12 px-16 py-10 rounded-3xl transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
                transitionDelay: '0.4s',
              }}
            >
              {/* Enhanced Liquid Glass Pane - More glassy effect */}
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

              {/* Enhanced inner glow with more depth */}
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

              {/* Additional glass reflection layer */}
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
                    Sicurezza Totale nel<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">
                      Collezionismo
                    </span>
                  </>
                ) : (
                  <>
                    Total Security in<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">
                      Collectibles
                    </span>
                  </>
                )}
              </h1>
            </div>

            {/* Subtitle - Animated */}
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
                ? 'Il primo sistema di verifica fisica per i tuoi scambi di TCG. Transazioni garantite con tecnologia Liquid Glass, sia in negozio che tramite il nostro centro certificato.'
                : 'The first physical verification system for your TCG exchanges. Transactions guaranteed with Liquid Glass technology, both in-store and through our certified center.'}
            </p>

            {/* CTA Buttons - Animated */}
            <div 
              ref={buttonsRef}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000"
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: '0.8s',
              }}
            >
              <Link href="/safetrade/info">
                <Button className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all text-lg">
                  {isItalian ? 'Scopri il Sistema' : 'Discover the System'}
                </Button>
              </Link>
              <Link href="/stores">
                <Button variant="outline" className="px-8 py-4 bg-white/40 backdrop-blur-3xl text-slate-900 font-bold rounded-2xl border border-white/80 hover:bg-white/90 transition-all text-lg">
                  {isItalian ? 'Trova Store Partner' : 'Find Partner Store'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 opacity-40 animate-bounce">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
              {isItalian ? 'Scorri' : 'Scroll'}
            </span>
            <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1.5">
              <div className="w-1 h-2 bg-primary rounded-full"></div>
            </div>
          </div>
        </section>

        {/* Verifica in Negozio Partner Section */}
        <section className="py-24 relative bg-white/50 border-t-0 border-b-0">
          <div className="max-w-7xl mx-auto px-6">
            <div 
              className="text-center mb-16 transition-all duration-1000"
              data-animate-id="store-verification-title"
              style={{
                opacity: animatedSections.has('store-verification-title') ? 1 : 0,
                transform: animatedSections.has('store-verification-title') ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-black tracking-tighter mb-4 text-slate-900">
                {isItalian ? 'Verifica in Negozio Partner' : 'Verification in Partner Store'}
              </h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {[
                {
                  icon: 'contract',
                  title: isItalian ? '1. Accordo Online' : '1. Online Agreement',
                  description: isItalian 
                    ? 'Accordo sul prezzo e dettagli dello scambio sulla nostra piattaforma.'
                    : 'Agreement on price and exchange details on our platform.',
                },
                {
                  icon: 'store',
                  title: isItalian ? '2. Scelta Punto SafeTrade' : '2. SafeTrade Point Selection',
                  description: isItalian
                    ? 'Seleziona un negozio autorizzato tramite la nostra mappa per il drop-off.'
                    : 'Select an authorized store through our map for drop-off.',
                },
                {
                  icon: 'verified',
                  title: isItalian ? '3. Verifica in Locale' : '3. Local Verification',
                  description: isItalian
                    ? 'Esperti certificati controllano l\'autenticità della carta dal vivo.'
                    : 'Certified experts check the card\'s authenticity in person.',
                },
                {
                  icon: 'security',
                  title: isItalian ? '4. Transazione Garantita' : '4. Guaranteed Transaction',
                  description: isItalian
                    ? 'Scambio sicuro e rilascio immediato dei fondi garantiti.'
                    : 'Secure exchange and immediate release of guaranteed funds.',
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center group transition-all duration-1000"
                  data-animate-id={`step-store-${idx}`}
                  style={{
                    opacity: animatedSections.has(`step-store-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`step-store-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  {/* Apple-style Glass Rectangle */}
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
                    {/* Animated Icon Container */}
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
                    
                    {/* Step Number */}
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

        {/* SafeTrade Central Escrow Section */}
        <section className="py-24 relative bg-white/30 rounded-[40px] mx-6 border border-white/20 mt-0">
          <div className="max-w-7xl mx-auto px-6">
            <div 
              className="text-center mb-16 transition-all duration-1000"
              data-animate-id="escrow-title"
              style={{
                opacity: animatedSections.has('escrow-title') ? 1 : 0,
                transform: animatedSections.has('escrow-title') ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              <h2 className="text-3xl md:text-4xl font-display font-black tracking-tighter mb-4 text-slate-900">
                {isItalian ? 'SafeTrade Central Escrow: Protezione Totale Ovunque' : 'SafeTrade Central Escrow: Total Protection Everywhere'}
              </h2>
              <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-0"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative mb-12">
              {[
                {
                  icon: 'inventory_2',
                  title: isItalian ? 'Spedizione al Centro' : 'Shipping to Center',
                  description: isItalian
                    ? 'Il venditore spedisce la carta al nostro hub centrale.'
                    : 'Seller ships the card to our central hub.',
                },
                {
                  icon: 'fact_check',
                  title: isItalian ? 'Ispezione Certificata' : 'Certified Inspection',
                  description: isItalian
                    ? 'Esperti verificano autenticità e condizioni.'
                    : 'Experts verify authenticity and condition.',
                },
                {
                  icon: 'account_balance_wallet',
                  title: isItalian ? 'Rilascio Manuale Fondi' : 'Manual Fund Release',
                  description: isItalian
                    ? 'Fondi rilasciati automaticamente al venditore.'
                    : 'Funds automatically released to seller.',
                },
                {
                  icon: 'local_shipping',
                  title: isItalian ? 'Spedizione all\'Acquirente' : 'Shipping to Buyer',
                  description: isItalian
                    ? 'Carta spedita all\'acquirente con tracciamento completo.'
                    : 'Card shipped to buyer with full tracking.',
                },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center group transition-all duration-1000"
                  data-animate-id={`step-escrow-${idx}`}
                  style={{
                    opacity: animatedSections.has(`step-escrow-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`step-escrow-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
                    transitionDelay: `${idx * 0.1}s`,
                  }}
                >
                  {/* Apple-style Glass Rectangle */}
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
                    {/* Animated Icon Container */}
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
                    
                    {/* Step Number */}
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs font-black">{idx + 1}</span>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2 text-slate-900">{step.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>

            {/* Quote Box - Liquid Glass Apple Style */}
            <div 
              className="max-w-3xl mx-auto p-8 rounded-3xl transition-all duration-1000 mt-12"
              data-animate-id="escrow-quote"
              style={{
                opacity: animatedSections.has('escrow-quote') ? 1 : 0,
                transform: animatedSections.has('escrow-quote') ? 'translateY(0)' : 'translateY(20px)',
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
                {/* Icon Container */}
                <div 
                  className="w-16 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%)',
                    border: '1px solid rgba(255, 107, 53, 0.2)',
                  }}
                >
                  <span className="material-symbols-outlined text-primary text-3xl relative z-10">verified</span>
                </div>
                
                {/* Text Content */}
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900 leading-relaxed mb-2">
                    {isItalian ? (
                      <>
                        &ldquo;Ogni rilascio di fondi è{' '}
                        <span 
                          className="text-primary relative inline-block"
                          style={{
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(255, 107, 53, 0.8)',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          approvato manualmente
                        </span>
                        {' '}dai nostri esperti per garantire zero truffe.&rdquo;
                      </>
                    ) : (
                      <>
                        &ldquo;Every fund release is{' '}
                        <span 
                          className="text-primary relative inline-block"
                          style={{
                            textDecoration: 'underline',
                            textDecorationColor: 'rgba(255, 107, 53, 0.8)',
                            textDecorationThickness: '2px',
                            textUnderlineOffset: '4px',
                          }}
                        >
                          manually approved
                        </span>
                        {' '}by our experts to guarantee zero scams.&rdquo;
                      </>
                    )}
                  </p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3">
                    {isItalian ? 'GARANZIA SAFETRADE CENTRAL' : 'SAFETRADE CENTRAL GUARANTEE'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vantaggi per i Negozi Partner Section */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
              <div 
                className="lg:w-1/3 text-left transition-all duration-1000"
                data-animate-id="benefits-text"
                style={{
                  opacity: animatedSections.has('benefits-text') ? 1 : 0,
                  transform: animatedSections.has('benefits-text') ? 'translateX(0)' : 'translateX(-30px)',
                }}
              >
                <span className="text-primary font-bold tracking-widest text-xs uppercase mb-3 block">
                  {isItalian ? 'Business Network' : 'Business Network'}
                </span>
                <h2 className="text-4xl font-display font-black mb-6 leading-tight text-slate-900">
                  {isItalian ? 'Vantaggi per i Negozi Partner' : 'Benefits for Partner Stores'}
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  {isItalian
                    ? 'Unisciti al network SafeTrade per trasformare il tuo negozio nel punto di riferimento locale per il collezionismo d\'alto livello.'
                    : 'Join the SafeTrade network to transform your store into the local reference point for high-end collectibles.'}
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
                    icon: 'trending_up',
                    title: isItalian ? 'Aumento Traffico' : 'Increased Traffic',
                    description: isItalian
                      ? 'Porta nuovi collezionisti fisicamente nel tuo punto vendita grazie al nostro sistema.'
                      : 'Bring new collectors physically to your store thanks to our system.',
                  },
                  {
                    icon: 'payments',
                    title: isItalian ? 'Commissioni Extra' : 'Extra Commissions',
                    description: isItalian
                      ? 'Guadagna commissioni fisse per ogni servizio di verifica effettuato.'
                      : 'Earn fixed commissions for each verification service performed.',
                  },
                  {
                    icon: 'stars',
                    title: isItalian ? 'Autorità del Brand' : 'Brand Authority',
                    description: isItalian
                      ? 'Diventa un punto di riferimento certificato per la tua community locale.'
                      : 'Become a certified reference point for your local community.',
                  },
                  {
                    icon: 'groups',
                    title: isItalian ? 'Community Fedele' : 'Loyal Community',
                    description: isItalian
                      ? 'I clienti che verificano le carte spesso completano acquisti accessori in store.'
                      : 'Customers who verify cards often complete accessory purchases in store.',
                  },
                ].map((benefit, idx) => (
                  <div
                    key={idx}
                    className="p-8 liquid-glass rounded-3xl border-white/40 hover:bg-white/50 transition-all duration-1000"
                    data-animate-id={`benefit-${idx}`}
                    style={{
                      opacity: animatedSections.has(`benefit-${idx}`) ? 1 : 0,
                      transform: animatedSections.has(`benefit-${idx}`) ? 'translateY(0)' : 'translateY(30px)',
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

        {/* Feature Icons Section */}
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16">
              {[
                { icon: 'verified', label: isItalian ? 'Certificato' : 'Certified' },
                { icon: 'health_and_safety', label: isItalian ? 'Assicurato' : 'Insured' },
                { icon: 'workspace_premium', label: isItalian ? 'Autentico' : 'Authentic' },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-3 transition-all duration-1000"
                  data-animate-id={`feature-icon-${idx}`}
                  style={{
                    opacity: animatedSections.has(`feature-icon-${idx}`) ? 1 : 0,
                    transform: animatedSections.has(`feature-icon-${idx}`) ? 'scale(1)' : 'scale(0.8)',
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

        {/* FAQ Section */}
        <section className="py-24 max-w-4xl mx-auto px-6">
          <div 
            className="text-center mb-16 transition-all duration-1000"
            data-animate-id="faq-title"
            style={{
              opacity: animatedSections.has('faq-title') ? 1 : 0,
              transform: animatedSections.has('faq-title') ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-4 text-slate-900">
              {isItalian ? 'Domande Frequenti' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-slate-500">
              {isItalian ? 'Tutto quello che devi sapere sul sistema SafeTrade.' : 'Everything you need to know about the SafeTrade system.'}
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
                  <div className={`expand-icon w-10 h-10 liquid-glass rounded-full flex items-center justify-center transition-transform duration-300 border border-primary/20 flex-shrink-0 ${
                    openFAQ === idx ? 'rotate-45' : ''
                  }`}>
                    <span className="material-symbols-outlined text-primary">add</span>
                  </div>
                </summary>
                <div className="px-6 pb-8 md:px-8 md:pb-10 text-slate-600 leading-relaxed">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 mb-20 relative overflow-hidden rounded-[40px] mx-6">
          <div className="absolute inset-0 bg-primary/5 -z-10"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary opacity-5 blur-[120px] -z-10"></div>
          <div 
            className="text-center px-6 transition-all duration-1000"
            data-animate-id="final-cta"
            style={{
              opacity: animatedSections.has('final-cta') ? 1 : 0,
              transform: animatedSections.has('final-cta') ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-black mb-8 text-slate-900">
              {isItalian ? 'Pronto a scambiare senza pensieri?' : 'Ready to trade without worries?'}
            </h2>
            <p className="max-w-xl mx-auto text-slate-500 mb-12 text-lg">
              {isItalian
                ? 'Unisciti a migliaia di collezionisti che hanno scelto il sistema più sicuro d\'Europa per il mercato secondario TCG.'
                : 'Join thousands of collectors who have chosen Europe\'s most secure system for the secondary TCG market.'}
            </p>
            <Link href="/marketplace">
              <Button className="bg-primary text-white text-xl font-bold px-12 py-5 rounded-2xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all inline-flex items-center gap-4">
                <span>{isItalian ? 'Inizia a Vendere in Sicurezza' : 'Start Selling Securely'}</span>
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
