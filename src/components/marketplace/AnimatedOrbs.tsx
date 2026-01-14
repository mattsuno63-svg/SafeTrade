'use client'

import { useEffect, useRef } from 'react'

interface AnimatedOrbsProps {
  count?: number
  className?: string
}

export function AnimatedOrbs({ count = 5, className = '' }: AnimatedOrbsProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return

    let gsapLoaded = false

    const loadGSAP = () => {
      return new Promise<void>((resolve) => {
        if (window.gsap) {
          gsapLoaded = true
          resolve()
          return
        }

        const gsapScript = document.createElement('script')
        gsapScript.src = '/gsap/gsap.min.js'
        gsapScript.async = true

        gsapScript.onload = () => {
          gsapLoaded = true
          resolve()
        }

        gsapScript.onerror = () => resolve()
        document.head.appendChild(gsapScript)
      })
    }

    const initAnimations = async () => {
      await loadGSAP()

      if (!gsapLoaded || !window.gsap || !containerRef.current) return

      const { gsap } = window
      const orbs = containerRef.current.querySelectorAll('.animated-orb')

      orbs.forEach((orb, index) => {
        const delay = index * 0.2
        const duration = 3 + Math.random() * 2 // 3-5 seconds
        const xMovement = (Math.random() - 0.5) * 100 // -50 to 50
        const yMovement = (Math.random() - 0.5) * 100

        // Floating animation
        gsap.to(orb, {
          x: xMovement,
          y: yMovement,
          duration,
          delay,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })

        // Scale pulse
        gsap.to(orb, {
          scale: 1.1,
          duration: duration * 0.5,
          delay,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })

        // Opacity pulse
        gsap.to(orb, {
          opacity: 0.6,
          duration: duration * 0.7,
          delay: delay + 0.3,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        })
      })
    }

    const timeoutId = setTimeout(() => {
      initAnimations()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [count])

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {Array.from({ length: count }).map((_, i) => {
        const size = 60 + Math.random() * 80 // 60-140px
        const left = Math.random() * 100 // 0-100%
        const top = Math.random() * 100 // 0-100%
        const delay = Math.random() * 2

        return (
          <div
            key={i}
            className="animated-orb absolute rounded-full bg-primary/20 blur-xl"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}
    </div>
  )
}

