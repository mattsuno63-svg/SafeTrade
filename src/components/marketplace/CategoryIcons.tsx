'use client'

/**
 * Icone SVG custom per le categorie del marketplace
 * Tutte le icone hanno dimensioni uniformi (w-10 h-10) per coerenza visiva
 */

interface CategoryIconProps {
  className?: string
}

export function PokemonIcon({ className = 'w-10 h-10' }: CategoryIconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="relative w-full h-full rounded-full border-2 border-white/40 overflow-hidden flex flex-col">
        <div className="h-1/2 bg-red-500/80 backdrop-blur-sm border-b-2 border-white/30"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-white/60"></div>
      </div>
    </div>
  )
}

export function OnePieceIcon({ className = 'w-10 h-10' }: CategoryIconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Skull shape */}
        <path
          d="M50 20 Q35 20 30 35 Q30 45 35 50 Q30 60 30 70 Q30 80 40 85 Q45 90 50 90 Q55 90 60 85 Q70 80 70 70 Q70 60 65 50 Q70 45 70 35 Q65 20 50 20 Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Eye sockets */}
        <circle cx="40" cy="45" r="6" fill="black" />
        <circle cx="60" cy="45" r="6" fill="black" />
        {/* Crossbones */}
        <line x1="25" y1="25" x2="40" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <line x1="60" y1="40" x2="75" y2="25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <line x1="25" y1="75" x2="40" y2="60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
        <line x1="60" y1="60" x2="75" y2="75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  )
}

export function MagicIcon({ className = 'w-10 h-10' }: CategoryIconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
        {/* Magic: The Gathering Official Logo - Red Flame/Crown Symbol */}
        {/* Base curve (fiamma inferiore) */}
        <path
          d="M 15 75 Q 25 80 35 75 Q 45 80 55 75 Q 65 80 75 75 Q 85 80 85 75"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          opacity="0.5"
        />
        {/* Fiamma centrale alta (spike principale) */}
        <path
          d="M 50 75 L 50 20 L 48 28 L 50 20 L 52 28 Z"
          fill="currentColor"
          opacity="0.95"
        />
        {/* Fiamme laterali sinistre */}
        <path
          d="M 35 75 L 35 40 L 33 48 L 35 40 L 37 48 Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M 25 75 L 25 55 L 23 62 L 25 55 L 27 62 Z"
          fill="currentColor"
          opacity="0.95"
        />
        {/* Fiamme laterali destre */}
        <path
          d="M 65 75 L 65 40 L 63 48 L 65 40 L 67 48 Z"
          fill="currentColor"
          opacity="0.95"
        />
        <path
          d="M 75 75 L 75 55 L 73 62 L 75 55 L 77 62 Z"
          fill="currentColor"
          opacity="0.95"
        />
        {/* Fiamme intermedie più piccole */}
        <path
          d="M 42 75 L 42 58 L 41 63 L 42 58 L 43 63 Z"
          fill="currentColor"
          opacity="0.85"
        />
        <path
          d="M 58 75 L 58 58 L 57 63 L 58 58 L 59 63 Z"
          fill="currentColor"
          opacity="0.85"
        />
        {/* Dettagli decorativi superiori (corona) */}
        <path
          d="M 48 22 L 50 18 L 52 22 L 50 25 Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M 45 25 L 47 22 L 49 25 Z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M 51 25 L 53 22 L 55 25 Z"
          fill="currentColor"
          opacity="0.7"
        />
      </svg>
    </div>
  )
}

export function YugiohIcon({ className = 'w-10 h-10' }: CategoryIconProps) {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
        {/* Millennium Puzzle - Triangolo stilizzato con occhio */}
        {/* Triangolo principale */}
        <path
          d="M 50 15 L 20 75 L 80 75 Z"
          fill="currentColor"
          opacity="0.95"
          stroke="currentColor"
          strokeWidth="1"
        />
        {/* Linee interne del puzzle */}
        <path
          d="M 50 15 L 50 60"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.6"
        />
        <path
          d="M 35 45 L 65 45"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Occhio di Horus stilizzato al centro */}
        <circle
          cx="50"
          cy="50"
          r="8"
          fill="black"
          opacity="0.8"
        />
        <circle
          cx="50"
          cy="50"
          r="4"
          fill="currentColor"
          opacity="0.9"
        />
        {/* Dettagli decorativi ai lati */}
        <path
          d="M 30 70 L 35 65 L 40 70 Z"
          fill="currentColor"
          opacity="0.7"
        />
        <path
          d="M 70 70 L 65 65 L 60 70 Z"
          fill="currentColor"
          opacity="0.7"
        />
        {/* Linee decorative superiori */}
        <path
          d="M 45 25 L 50 20 L 55 25"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.8"
        />
      </svg>
    </div>
  )
}

