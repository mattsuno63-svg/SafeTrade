'use client'

import { useEffect, useRef, useState } from 'react'

export function LiquidGlassBadge() {
  const badgeRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!badgeRef.current) return

      const rect = badgeRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      setMousePosition({ x, y })

      // Update glow position
      if (glowRef.current) {
        const distance = Math.sqrt(x * x + y * y)
        const intensity = Math.max(0, 1 - distance / 200)
        
        glowRef.current.style.opacity = String(intensity * 0.8)
        glowRef.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(${1 + intensity * 0.5})`
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div
      ref={badgeRef}
      className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full mb-12 relative group"
      style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(50px)',
        WebkitBackdropFilter: 'blur(50px)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        boxShadow: `
          0 8px 32px rgba(0, 0, 0, 0.12),
          0 0 0 1px rgba(255, 107, 53, 0.15) inset,
          0 0 60px rgba(255, 107, 53, 0.1) inset
        `,
      }}
    >
      {/* Animated orange glow that follows mouse */}
      <div
        ref={glowRef}
        className="absolute inset-0 rounded-full pointer-events-none transition-all duration-300 ease-out"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 107, 53, 0.7) 0%, rgba(255, 140, 66, 0.5) 40%, transparent 70%)',
          filter: 'blur(30px)',
          opacity: 0,
          transform: 'scale(1)',
        }}
      />

      {/* Secondary glow layer */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(255, 107, 53, 0.4) 0%, transparent 60%)',
          filter: 'blur(20px)',
          animation: 'pulse-glow 3s ease-in-out infinite',
        }}
      />

      {/* Inner highlight */}
      <div
        className="absolute inset-[1px] rounded-full pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 100%)',
          borderRadius: '9999px',
        }}
      />

      <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,107,53,0.8)] relative z-10"></span>
      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary relative z-10">
        Standard di Scambio Verificati
      </span>
    </div>
  )
}

