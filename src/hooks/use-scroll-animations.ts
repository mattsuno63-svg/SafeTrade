'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    gsap: any
    ScrollTrigger: any
  }
}

export function useScrollAnimations() {
  useEffect(() => {
    let gsapLoaded = false

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

    const initScrollAnimations = async () => {
      await loadGSAP()

      if (!gsapLoaded || !window.gsap || !window.ScrollTrigger) return

      const { gsap } = window

      // Featured Section - Fade in from bottom
      const featuredSection = document.querySelector('[data-section="featured"]')
      if (featuredSection) {
        gsap.fromTo(
          featuredSection,
          {
            opacity: 0,
            y: 80,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: featuredSection,
              start: 'top 80%',
              end: 'top 50%',
              toggleActions: 'play none none none',
            },
          }
        )
      }

      // Categories Section - Staggered fade in
      const categoryCards = document.querySelectorAll('[data-category-card]')
      if (categoryCards.length > 0) {
        gsap.fromTo(
          categoryCards,
          {
            opacity: 0,
            y: 60,
            scale: 0.9,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.15,
            scrollTrigger: {
              trigger: categoryCards[0]?.parentElement,
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          }
        )
      }

      // Tournaments Section - Fade in with parallax
      const tournamentSection = document.querySelector('[data-section="tournaments"]')
      if (tournamentSection) {
        gsap.fromTo(
          tournamentSection,
          {
            opacity: 0,
            y: 100,
          },
          {
            opacity: 1,
            y: 0,
            duration: 1.2,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: tournamentSection,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        )

        const tournamentCards = tournamentSection.querySelectorAll('[data-tournament-card]')
        if (tournamentCards.length > 0) {
          gsap.fromTo(
            tournamentCards,
            {
              opacity: 0,
              x: (index: number) => (index % 2 === 0 ? -50 : 50),
            },
            {
              opacity: 1,
              x: 0,
              duration: 1,
              ease: 'power3.out',
              stagger: 0.2,
              scrollTrigger: {
                trigger: tournamentCards[0]?.parentElement,
                start: 'top 75%',
                toggleActions: 'play none none none',
              },
            }
          )
        }
      }

      // Refresh on resize
      const handleResize = () => {
        window.ScrollTrigger.refresh()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    // Delay initialization to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initScrollAnimations()
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((trigger: any) => {
          if (trigger.trigger?.hasAttribute?.('data-section') || trigger.trigger?.querySelector?.('[data-category-card]')) {
            trigger.kill()
          }
        })
      }
    }
  }, [])
}

