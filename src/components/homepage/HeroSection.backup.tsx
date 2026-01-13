'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    gsap: any
    ScrollTrigger: any
  }
}

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const ecosystemVaultRef = useRef<HTMLDivElement>(null)
  const energyCore1Ref = useRef<HTMLDivElement>(null)
  const energyCore2Ref = useRef<HTMLDivElement>(null)
  const energyCore3Ref = useRef<HTMLDivElement>(null)
  const energyCore4Ref = useRef<HTMLDivElement>(null)
  const geometricShapesRef = useRef<HTMLDivElement>(null)
  const scrollIndicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let gsapLoaded = false
    let animations: any[] = []

    const loadGSAP = () => {
      return new Promise<void>((resolve) => {
        if (typeof window === 'undefined') {
          resolve()
          return
        }

        if (window.gsap && window.ScrollTrigger) {
          gsapLoaded = true
          resolve()
          return
        }

        const gsapScript = document.createElement('script')
        gsapScript.src = '/gsap/gsap.min.js'
        gsapScript.async = true

        gsapScript.onload = () => {
          const scrollTriggerScript = document.createElement('script')
          scrollTriggerScript.src = '/gsap/ScrollTrigger.min.js'
          scrollTriggerScript.async = true

          scrollTriggerScript.onload = () => {
            window.gsap.registerPlugin(window.ScrollTrigger)
            gsapLoaded = true
            resolve()
          }

          scrollTriggerScript.onerror = () => resolve()
          document.head.appendChild(scrollTriggerScript)
        }

        gsapScript.onerror = () => resolve()
        document.head.appendChild(gsapScript)
      })
    }

    const initAnimations = async () => {
      await loadGSAP()

      if (!gsapLoaded || !window.gsap) return

      const { gsap } = window

      // Energy Cores - Simple floating animations (no parallax)
      const cores = [
        { ref: energyCore1Ref, delay: 0, duration: 4, y: -20, x: -15 },
        { ref: energyCore2Ref, delay: 0.5, duration: 5, y: 20, x: 15 },
        { ref: energyCore3Ref, delay: 1, duration: 4.5, y: -15, x: 10 },
        { ref: energyCore4Ref, delay: 1.5, duration: 5.5, y: 15, x: -10 },
      ]

      cores.forEach((core) => {
        if (!core.ref.current) return

        const floatAnim = gsap.to(core.ref.current, {
          y: core.y,
          x: core.x,
          duration: core.duration,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: core.delay,
        })
        animations.push(floatAnim)
      })

      // Ecosystem Vault - Gentle pulse
      if (ecosystemVaultRef.current) {
        const vaultPulse = gsap.to(ecosystemVaultRef.current, {
          scale: 1.03,
          opacity: 0.7,
          duration: 5,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
        animations.push(vaultPulse)
      }

      // Geometric Shapes - Slow rotation
      if (geometricShapesRef.current) {
        const innerShape = geometricShapesRef.current.querySelector('div')
        
        const outerRotate = gsap.to(geometricShapesRef.current, {
          rotation: 360,
          duration: 40,
          ease: 'none',
          repeat: -1,
        })
        animations.push(outerRotate)

        if (innerShape) {
          const innerRotate = gsap.to(innerShape, {
            rotation: -360,
            duration: 35,
            ease: 'none',
            repeat: -1,
          })
          animations.push(innerRotate)
        }
      }

      // Scroll Indicator - Bounce animation
      if (scrollIndicatorRef.current) {
        const scrollBounce = gsap.to(scrollIndicatorRef.current, {
          y: 8,
          opacity: 0.6,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true,
        })
        animations.push(scrollBounce)
      }
    }

    initAnimations()

    return () => {
      animations.forEach((anim) => {
        if (anim && anim.kill) anim.kill()
      })
      animations = []
    }
  }, [])

  return (
    <header
      data-hero-section ref={heroRef} className="relative w-screen h-screen min-h-screen overflow-hidden flex items-center justify-center">

      {/* Hero Grid Background */}
      <div className="absolute inset-0 hero-grid-fade grid-background-fade pointer-events-none z-0"></div>
      
      {/* Ecosystem Vault Background */}
      <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
        <div ref={ecosystemVaultRef} className="ecosystem-vault scale-100 opacity-60 relative overflow-hidden flex items-center justify-center border-white/40">
          {/* Energy Cores - Reduced opacity */}
          <div ref={energyCore1Ref} className="energy-core bg-primary/20 -translate-x-48 -translate-y-32 scale-150 opacity-20"></div>
          <div ref={energyCore2Ref} className="energy-core bg-blue-500/20 translate-x-48 translate-y-16 scale-125 opacity-20"></div>
          <div ref={energyCore3Ref} className="energy-core bg-purple-500/20 -translate-x-16 translate-y-48 scale-110 opacity-20"></div>
          <div ref={energyCore4Ref} className="energy-core bg-emerald-400/20 translate-x-32 -translate-y-48 scale-100 opacity-20"></div>
          
          {/* Shield Icons with Orange Accents */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Main Shield */}
            <div className="relative w-32 h-32 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/30 text-8xl">shield</span>
              <div className="absolute inset-0 border-4 border-primary/20 rounded-3xl"></div>
            </div>
            
            {/* Smaller Shields with Orange Accents */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/25 text-5xl">shield</span>
              <div className="absolute inset-0 border-2 border-primary/15 rounded-2xl"></div>
            </div>
            <div className="absolute top-3/4 right-1/4 translate-x-1/2 translate-y-1/2 w-20 h-20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/25 text-5xl">shield</span>
              <div className="absolute inset-0 border-2 border-primary/15 rounded-2xl"></div>
            </div>
            <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 translate-y-1/2 w-16 h-16 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/20 text-4xl">shield</span>
              <div className="absolute inset-0 border-2 border-primary/10 rounded-xl"></div>
            </div>
            <div className="absolute top-1/3 right-1/3 translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/20 text-4xl">shield</span>
              <div className="absolute inset-0 border-2 border-primary/10 rounded-xl"></div>
            </div>
          </div>
          
          {/* Geometric Shapes */}
          <div ref={geometricShapesRef} className="absolute w-80 h-80 border-[3px] border-primary/20 rounded-[30%] rotate-[15deg] backdrop-blur-xl flex items-center justify-center opacity-30">
            <div className="w-64 h-64 border border-white/30 rounded-[20%] rotate-[10deg] flex items-center justify-center">
              <span className="material-symbols-outlined text-primary/20 text-9xl opacity-15">shield</span>
            </div>
          </div>
          
          {/* Decorative Glass Panes - Reduced opacity */}
          <div className="absolute w-16 h-16 bg-white/10 backdrop-blur-md border border-white/30 -translate-x-64 translate-y-32 rotate-45 opacity-30"></div>
          <div className="absolute w-12 h-12 bg-primary/5 backdrop-blur-sm border border-primary/20 translate-x-72 -translate-y-16 -rotate-12 opacity-30"></div>
          
          {/* Dotted Pattern */}
          <svg className="absolute w-full h-full opacity-20" viewBox="0 0 100 100">
            <circle cx="25" cy="25" fill="#FF6B35" r="0.6"></circle>
            <circle cx="75" cy="15" fill="#3B82F6" r="0.8"></circle>
            <circle cx="35" cy="85" fill="#8B5CF6" r="0.7"></circle>
            <circle cx="65" cy="45" fill="#FF6B35" r="1.2"></circle>
            <circle cx="15" cy="65" fill="#10B981" r="0.5"></circle>
            <circle cx="85" cy="75" fill="#F59E0B" r="0.9"></circle>
          </svg>
        </div>
        
        {/* Etched Glass Panes - Reduced opacity */}
        <div className="etched-pane w-[600px] h-[400px] -top-32 -left-32 rotate-[-12deg] rounded-4xl z-[1] shadow-holo-gold border-r-white/50 border-t-white/50 opacity-30">
          <div className="absolute inset-0 etched-texture opacity-20"></div>
        </div>
        <div className="etched-pane w-[500px] h-[700px] top-1/2 -right-32 -translate-y-1/2 rotate-[8deg] rounded-4xl z-[1] shadow-holo-cyan border-l-white/50 border-b-white/50 opacity-30">
          <div className="absolute inset-0 etched-texture opacity-15"></div>
        </div>
      </div>

      {/* Hero Content */}
      <div className="hero-content max-w-5xl mx-auto text-center relative z-20 -mt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 bg-white/80 px-6 py-2.5 rounded-full border border-white/50 mb-12 backdrop-blur-xl shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,107,53,0.8)]"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Standard di Scambio Verificati</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-7xl md:text-[110px] font-display font-black tracking-tighter mb-12 leading-[0.85] text-slate-900">
          Colleziona con<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">Passione e Fiducia</span>
        </h1>

        {/* Description */}
        <p className="text-lg md:text-xl text-slate-500 mb-16 max-w-2xl mx-auto font-medium leading-relaxed tracking-tight">
          L'ecosistema definitivo per i professionisti del TCG. 
          Sicurezza di grado militare fusa con l'eleganza Liquid Glass dell'era iOS 26.1.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/marketplace">
            <Button className="w-full sm:w-auto px-14 py-6 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1.5 transition-all flex items-center justify-center gap-3 group">
              Entra nel Mercato
              <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Button>
          </Link>
          <Link href="/sell">
            <Button variant="outline" className="w-full sm:w-auto px-14 py-6 bg-white/40 backdrop-blur-3xl text-slate-900 font-black rounded-2xl border border-white/80 hover:bg-white/90 transition-all">
              Invia per Gradazione
            </Button>
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div ref={scrollIndicatorRef} className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 opacity-40">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Scorri</span>
        <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1.5">
          <div className="w-1 h-2 bg-primary rounded-full"></div>
        </div>
      </div>
    </header>
  )
}
