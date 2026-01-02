'use client'

import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/LocaleContext'
import Link from 'next/link'

export default function SafeTradePage() {
  const { locale } = useLocale()
  const isItalian = locale === 'it'

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-orange-500/5 to-blue-500/5 text-text-primary dark:text-white font-display">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-blue-500/20 blur-[100px] animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[80px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-orange-500/20 backdrop-blur-xl border border-white/20 mb-8 shadow-2xl">
                <span className="material-symbols-outlined text-6xl text-primary">verified_user</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black mb-6 bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {isItalian ? 'SafeTrade' : 'SafeTrade'}
              </h1>
              <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto font-medium">
                {isItalian 
                  ? 'Transazioni sicure garantite da negozianti verificati'
                  : 'Secure transactions guaranteed by verified merchants'}
              </p>
            </div>

            {/* Main Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {/* Card 1: What is it */}
              <Card className="glass-panel p-8 border-2 border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-orange-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-primary">security</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">
                  {isItalian ? 'Cos\'è?' : 'What is it?'}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {isItalian 
                    ? 'Sistema escrow esclusivo per transazioni sicure tra collezionisti'
                    : 'Exclusive escrow system for secure transactions between collectors'}
                </p>
              </Card>

              {/* Card 2: Why use it */}
              <Card className="glass-panel p-8 border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-blue-500">shield</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">
                  {isItalian ? 'Perché usarlo?' : 'Why use it?'}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {isItalian 
                    ? 'Protezione totale per acquirente e venditore, zero rischi'
                    : 'Total protection for buyer and seller, zero risks'}
                </p>
              </Card>

              {/* Card 3: How it works */}
              <Card className="glass-panel p-8 border-2 border-green-500/30 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20 group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-4xl text-green-500">settings</span>
                </div>
                <h2 className="text-2xl font-bold mb-4">
                  {isItalian ? 'Come funziona?' : 'How it works?'}
                </h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {isItalian 
                    ? 'Scegli negoziante, prenota appuntamento, scambio sicuro'
                    : 'Choose merchant, book appointment, secure exchange'}
                </p>
              </Card>
            </div>

            {/* Process Steps - Visual */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">
                {isItalian ? 'Il Processo in 3 Passi' : 'The Process in 3 Steps'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Step 1 */}
                <div className="relative">
                  <div className="glass-panel p-8 border-2 border-primary/30 rounded-3xl text-center group hover:border-primary/50 transition-all">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl font-black text-white">1</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">
                      {isItalian ? 'Accordo' : 'Agreement'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {isItalian ? 'Acquirente e venditore si accordano' : 'Buyer and seller agree'}
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-primary to-blue-500"></div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="glass-panel p-8 border-2 border-blue-500/30 rounded-3xl text-center group hover:border-blue-500/50 transition-all">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl font-black text-white">2</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">
                      {isItalian ? 'Negoziante' : 'Merchant'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {isItalian ? 'Scegli negoziante verificato nella tua zona' : 'Choose verified merchant in your area'}
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-green-500"></div>
                </div>

                {/* Step 3 */}
                <div>
                  <div className="glass-panel p-8 border-2 border-green-500/30 rounded-3xl text-center group hover:border-green-500/50 transition-all">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg">
                      <span className="text-3xl font-black text-white">3</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3">
                      {isItalian ? 'Scambio' : 'Exchange'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {isItalian ? 'Verifica e completamento in presenza' : 'Verification and completion in person'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Benefits - Icon Grid */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-center mb-12">
                {isItalian ? 'Vantaggi Chiave' : 'Key Benefits'}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-2xl text-center border-2 border-transparent hover:border-primary/30 transition-all group">
                  <span className="material-symbols-outlined text-5xl text-primary mb-4 block group-hover:scale-110 transition-transform">verified</span>
                  <h3 className="font-bold text-sm mb-2">
                    {isItalian ? 'Verificato' : 'Verified'}
                  </h3>
                </div>
                <div className="glass-panel p-6 rounded-2xl text-center border-2 border-transparent hover:border-blue-500/30 transition-all group">
                  <span className="material-symbols-outlined text-5xl text-blue-500 mb-4 block group-hover:scale-110 transition-transform">lock</span>
                  <h3 className="font-bold text-sm mb-2">
                    {isItalian ? 'Sicuro' : 'Secure'}
                  </h3>
                </div>
                <div className="glass-panel p-6 rounded-2xl text-center border-2 border-transparent hover:border-green-500/30 transition-all group">
                  <span className="material-symbols-outlined text-5xl text-green-500 mb-4 block group-hover:scale-110 transition-transform">qr_code</span>
                  <h3 className="font-bold text-sm mb-2">
                    {isItalian ? 'Tracciabile' : 'Trackable'}
                  </h3>
                </div>
                <div className="glass-panel p-6 rounded-2xl text-center border-2 border-transparent hover:border-orange-500/30 transition-all group">
                  <span className="material-symbols-outlined text-5xl text-orange-500 mb-4 block group-hover:scale-110 transition-transform">location_on</span>
                  <h3 className="font-bold text-sm mb-2">
                    {isItalian ? 'Locale' : 'Local'}
                  </h3>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <Card className="glass-panel p-12 border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-orange-500/10 text-center">
              <h2 className="text-3xl font-bold mb-4">
                {isItalian ? 'Pronto per una transazione sicura?' : 'Ready for a secure transaction?'}
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
                {isItalian 
                  ? 'Inizia subito con SafeTrade'
                  : 'Get started with SafeTrade now'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/marketplace">
                  <Button size="lg" className="bg-primary hover:bg-primary-dark text-lg px-8 py-6">
                    {isItalian ? 'Vai al Marketplace' : 'Go to Marketplace'}
                  </Button>
                </Link>
                <Link href="/sell">
                  <Button size="lg" variant="outline" className="border-2 text-lg px-8 py-6">
                    {isItalian ? 'Vendi le Tue Carte' : 'Sell Your Cards'}
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
