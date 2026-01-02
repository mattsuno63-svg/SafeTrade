'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="border-t border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-black/50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-[20px]">playing_cards</span>
              </div>
              <h3 className="text-xl font-bold">SafeTrade</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Il marketplace sicuro per collezionisti di carte. Compra, vendi e scambia con fiducia.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold mb-4">Link Rapidi</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/marketplace" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/tournaments" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Tornei
                </Link>
              </li>
              <li>
                <Link href="/safetrade" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  SafeTrade
                </Link>
              </li>
              <li>
                <Link href="/sell" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Vendi Carte
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold mb-4">Supporto</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Community
                </Link>
              </li>
              <li>
                <a href="mailto:support@safetrade.com" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Contatti
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold mb-4">Legale</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Termini e Condizioni
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} SafeTrade. Tutti i diritti riservati.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">facebook</span>
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">photo_camera</span>
            </a>
            <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">chat</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

