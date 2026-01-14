'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    gsap: any
    ScrollTrigger: any
  }
}

export function useSectionScroll() {
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

    const initSectionScroll = async () => {
      await loadGSAP()

      if (!gsapLoaded || !window.gsap || !window.ScrollTrigger) return

      const { gsap } = window

      // Get all sections
      const heroSection = document.querySelector('header[class*="relative"]')
      const featuredSection = document.querySelector('[data-section="featured"]')
      const categoriesSection = document.querySelector('[data-section="categories"]')
      const tournamentsSection = document.querySelector('[data-section="tournaments"]')

      const sections = [heroSection, featuredSection, categoriesSection, tournamentsSection].filter(Boolean)
      
      if (sections.length === 0) return

      // Create snap scroll for each section
      sections.forEach((section: any, index: number) => {
        if (!section) return

        // Skip hero section for fade in (it's already visible)
        if (index > 0) {
          // Fade in animation on scroll
          gsap.fromTo(
            section,
            {
              opacity: 0,
              y: 80,
            },
            {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 85%',
                end: 'top 60%',
                toggleActions: 'play none none none',
              },
            }
          )
        }

        // Snap to section on scroll
        window.ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          snap: {
            snapTo: 1 / (sections.length - 1),
            duration: { min: 0.3, max: 0.8 },
            delay: 0.1,
            ease: 'power2.inOut',
          },
        })
      })

      // Refresh on resize
      const handleResize = () => {
        window.ScrollTrigger.refresh()
      }
      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }

    const timeoutId = setTimeout(() => {
      initSectionScroll()
    }, 500)

    return () => {
      clearTimeout(timeoutId)
      if (window.ScrollTrigger) {
        window.ScrollTrigger.getAll().forEach((trigger: any) => {
          if (trigger.vars?.snap) {
            trigger.kill()
          }
        })
      }
    }
  }, [])
}

