'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MetaballBackground } from './MetaballBackground'
import { LiquidGlassBadge } from './LiquidGlassBadge'

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null)
  const storyTextRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 })
  const [isHovering, setIsHovering] = useState(false)
  const [storyData, setStoryData] = useState({
    x: '0.00',
    y: '0.00',
    radius: '0.10',
    merges: 0,
    fps: 0,
  })

  useEffect(() => {
    // Update story text periodically
    const interval = setInterval(() => {
      if (storyTextRef.current) {
        const text = `il nostro ecosistema naviga alle coordinate (${storyData.x}, ${storyData.y})<br>
campo di sicurezza si estende ${storyData.radius} unità nel quantum foam<br>
attualmente in connessione con ${storyData.merges} altre entità<br>
flusso temporale: ${storyData.fps} cicli al secondo`
        storyTextRef.current.innerHTML = text
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [storyData])

  useEffect(() => {
    const heading = headingRef.current
    if (!heading) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heading.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      setMousePosition({ x, y })
    }

    const handleMouseEnter = () => {
      setIsHovering(true)
    }

    const handleMouseLeave = () => {
      setIsHovering(false)
    }

    heading.addEventListener('mousemove', handleMouseMove)
    heading.addEventListener('mouseenter', handleMouseEnter)
    heading.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      heading.removeEventListener('mousemove', handleMouseMove)
      heading.removeEventListener('mouseenter', handleMouseEnter)
      heading.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <section
      ref={heroRef}
      data-hero-section
      className="relative w-screen h-screen min-h-screen overflow-hidden flex items-center justify-center"
    >
      {/* Metaball Background Animation */}
      <MetaballBackground />

      {/* Hero Content */}
      <div className="hero-content max-w-5xl mx-auto text-center relative z-20 -mt-32">
        {/* Badge with Liquid Glass Effect */}
        <LiquidGlassBadge />

        {/* Text readability overlay - subtle blur to maintain metallic balls visibility */}
        <div 
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 40% at 50% 40%, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.3) 50%, transparent 75%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            maskImage: 'radial-gradient(ellipse 70% 40% at 50% 40%, black 0%, black 45%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 40% at 50% 40%, black 0%, black 45%, transparent 70%)',
          }}
        />

        {/* Main Heading - Apple Style */}
        <div className="relative inline-block mb-12 px-8 py-6 rounded-3xl">
          {/* Liquid Glass Pane - follows mouse (Apple style) */}
          <div
            ref={glowRef}
            className="absolute inset-0 rounded-3xl pointer-events-none overflow-hidden"
            style={{
              background: `radial-gradient(circle 500px at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(255, 255, 255, ${isHovering ? 0.85 : 0.75}) 0%, 
                rgba(255, 255, 255, ${isHovering ? 0.7 : 0.6}) 40%, 
                rgba(255, 255, 255, ${isHovering ? 0.5 : 0.4}) 70%, 
                transparent 100%)`,
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              boxShadow: `
                0 8px 32px rgba(0, 0, 0, 0.08),
                0 2px 8px rgba(0, 0, 0, 0.04),
                inset 0 1px 0 rgba(255, 255, 255, 0.9)
              `,
              transform: `translate(${(mousePosition.x - 50) * 0.03}px, ${(mousePosition.y - 50) * 0.03}px) scale(${isHovering ? 1.02 : 1})`,
              transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              opacity: isHovering ? 1 : 0.95,
            }}
          />

          {/* Subtle inner glow highlight */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: `radial-gradient(circle 350px at ${mousePosition.x}% ${mousePosition.y}%, 
                rgba(255, 107, 53, ${isHovering ? 0.08 : 0.04}) 0%, 
                transparent 60%)`,
              transition: 'background 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          />

          <h1 
            ref={headingRef}
            className="text-7xl md:text-[110px] font-display font-black tracking-tighter leading-[0.85] relative z-10 cursor-default text-slate-900"
            style={{
              textShadow: `
                0 1px 2px rgba(0, 0, 0, 0.05),
                0 2px 4px rgba(0, 0, 0, 0.03)
              `,
              transition: 'text-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            Colleziona con<br/>
            <span 
              className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400"
              style={{
                textShadow: `
                  0 1px 2px rgba(0, 0, 0, 0.05),
                  0 2px 4px rgba(0, 0, 0, 0.03)
                `,
                transition: 'text-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
              }}
            >
              Passione e Fiducia
            </span>
          </h1>
        </div>

        {/* Description */}
        <p className="text-lg md:text-xl text-slate-500 mb-16 max-w-2xl mx-auto font-medium leading-relaxed tracking-tight relative z-10">
          L'ecosistema definitivo per i professionisti del TCG. 
          Sicurezza di grado militare fusa con l'eleganza Liquid Glass dell'era iOS 26.1.
        </p>


        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/marketplace">
            <Button className="w-full sm:w-auto px-14 py-6 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1.5 transition-all flex items-center justify-center gap-3 group">
              Entra nel Mercato
              <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Button>
          </Link>
          <Link href="/sell">
            <Button variant="outline" className="w-full sm:w-auto px-14 py-6 bg-white/40 backdrop-blur-3xl text-slate-900 font-black rounded-2xl border border-white/80 hover:bg-white/90 transition-all">
              Vendi le tue Carte
            </Button>
          </Link>
        </div>
      </div>


      {/* Scroll Indicator */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 opacity-40">
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Scorri</span>
        <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1.5">
          <div className="w-1 h-2 bg-primary rounded-full"></div>
        </div>
      </div>
    </section>
  )
}
