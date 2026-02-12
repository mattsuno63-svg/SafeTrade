'use client'

import Link from 'next/link'
import { useLocale } from '@/contexts/LocaleContext'

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="bg-white border-t border-slate-100 pt-32 pb-16 relative overflow-hidden mt-auto">
      <div className="absolute inset-0 etched-texture opacity-10 pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-24 relative z-10">
        {/* Brand */}
        <div className="col-span-1 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl font-bold">verified_user</span>
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-slate-800">SafeTrade</span>
          </div>
          <p className="text-slate-500 text-sm leading-loose max-w-xs font-medium">
            Lo standard di lusso per il collezionismo moderno. Un'esperienza costruita sulla fiducia e raffinata con l'estetica Liquid Glass.
          </p>
        </div>

        {/* Mercato */}
        <div>
          <h4 className="font-black mb-10 text-slate-900 uppercase tracking-[0.2em] text-[10px]">Mercato</h4>
          <ul className="space-y-6">
            <li>
              <Link href="/marketplace" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Annunci
              </Link>
            </li>
            <li>
              <Link href="/tournaments" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Hub Tornei
              </Link>
            </li>
            <li>
              <Link href="/sell" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Gradazione
              </Link>
            </li>
            <li>
              <Link href="/safevault" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                SafeVault
              </Link>
            </li>
          </ul>
        </div>

        {/* Risorse */}
        <div>
          <h4 className="font-black mb-10 text-slate-900 uppercase tracking-[0.2em] text-[10px]">Risorse</h4>
          <ul className="space-y-6">
            <li>
              <Link href="/faq" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Knowledge Base
              </Link>
            </li>
            <li>
              <Link href="/community" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Community
              </Link>
            </li>
            <li>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                API Status
              </a>
            </li>
          </ul>
        </div>

        {/* Contatti */}
        <div>
          <h4 className="font-black mb-10 text-slate-900 uppercase tracking-[0.2em] text-[10px]">Contatti</h4>
          <ul className="space-y-6">
            <li>
              <a href="mailto:support@safetrade.com" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Supporto
              </a>
            </li>
            <li>
              <a href="#" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Business
              </a>
            </li>
            <li>
              <Link href="/privacy" className="text-slate-400 hover:text-primary transition-colors text-[13px] font-bold uppercase tracking-widest">
                Compliance
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between pt-16 border-t border-slate-50 relative z-10">
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mb-6 md:mb-0">
          © {new Date().getFullYear()} SAFETRADE PREMIUM • EVOLUZIONE iOS 26.1
        </p>
        <div className="flex items-center gap-8">
          <a href="#" className="text-slate-300 hover:text-primary transition-colors">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"></path>
            </svg>
          </a>
          <a href="#" className="text-slate-300 hover:text-primary transition-colors">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  )
}

