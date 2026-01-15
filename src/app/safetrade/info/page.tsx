'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EscrowAnimation } from '@/components/safetrade/EscrowAnimation'
import Link from 'next/link'

export default function SafeTradeInfoPage() {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
            <Header />

            <main>
                {/* Hero Section */}
                <section className="relative py-20 overflow-hidden">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-primary/20 blur-[100px]"></div>
                        <div className="absolute bottom-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[100px]"></div>
                    </div>

                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                            Il modo più sicuro per scambiare carte
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                            Cos'è SafeTrade?
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-10">
                            Un sistema rivoluzionario che garantisce sicurezza totale per acquirenti e venditori grazie ai nostri SafeTrade Points certificati.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/register">
                                <Button size="lg" className="bg-primary hover:bg-primary-dark text-lg px-8">
                                    Inizia Subito
                                </Button>
                            </Link>
                            <Link href="/marketplace">
                                <Button size="lg" variant="outline" className="text-lg px-8">
                                    Sfoglia Annunci
                                </Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How it works */}
                <section className="py-20 bg-white/50 dark:bg-black/20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Come Funziona</h2>
                            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                                Dimentica le truffe e le spedizioni rischiose. Con SafeTrade, ogni scambio è verificato di persona.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="relative">
                                <div className="absolute top-0 left-4 text-9xl font-bold text-gray-100 dark:text-gray-800 -z-10 select-none">1</div>
                                <Card className="glass-panel p-6 h-full border-t-4 border-t-primary">
                                    <span className="material-symbols-outlined text-5xl text-primary mb-4">handshake</span>
                                    <h3 className="text-xl font-bold mb-2">Accordo</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Acquirente e venditore si accordano sul prezzo tramite la nostra chat sicura.
                                    </p>
                                </Card>
                            </div>

                            <div className="relative">
                                <div className="absolute top-0 left-4 text-9xl font-bold text-gray-100 dark:text-gray-800 -z-10 select-none">2</div>
                                <Card className="glass-panel p-6 h-full border-t-4 border-t-blue-500">
                                    <span className="material-symbols-outlined text-5xl text-blue-500 mb-4">account_balance_wallet</span>
                                    <h3 className="text-xl font-bold mb-2">Deposito Escrow</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        L'acquirente versa i fondi nel sistema Escrow di SafeTrade. I soldi sono al sicuro.
                                    </p>
                                </Card>
                            </div>

                            <div className="relative">
                                <div className="absolute top-0 left-4 text-9xl font-bold text-gray-100 dark:text-gray-800 -z-10 select-none">3</div>
                                <Card className="glass-panel p-6 h-full border-t-4 border-t-purple-500">
                                    <span className="material-symbols-outlined text-5xl text-purple-500 mb-4">verified_user</span>
                                    <h3 className="text-xl font-bold mb-2">Verifica al Point</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Le parti si incontrano in un SafeTrade Point (negozio partner). Il negoziante verifica l'autenticità.
                                    </p>
                                </Card>
                            </div>

                            <div className="relative">
                                <div className="absolute top-0 left-4 text-9xl font-bold text-gray-100 dark:text-gray-800 -z-10 select-none">4</div>
                                <Card className="glass-panel p-6 h-full border-t-4 border-t-green-500">
                                    <span className="material-symbols-outlined text-5xl text-green-500 mb-4">check_circle</span>
                                    <h3 className="text-xl font-bold mb-2">Scambio Completato</h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Se tutto è ok, la carta viene consegnata e i fondi vengono rilasciati istantaneamente al venditore.
                                    </p>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits Section */}
                <section className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6">Perché scegliere SafeTrade?</h2>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="bg-primary/20 p-3 rounded-xl h-fit">
                                            <span className="material-symbols-outlined text-primary text-2xl">security</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-1">Zero Truffe</h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Grazie alla verifica fisica da parte di esperti, non riceverai mai una carta falsa o rovinata.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="bg-blue-500/20 p-3 rounded-xl h-fit">
                                            <span className="material-symbols-outlined text-blue-500 text-2xl">savings</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-1">Pagamenti Protetti</h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Il sistema Escrow garantisce che i soldi vengano trasferiti solo a transazione conclusa positivamente.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="bg-green-500/20 p-3 rounded-xl h-fit flex items-center justify-center">
                                            {/* Network di Negozi Icon - Edifici collegati */}
                                            <svg viewBox="0 0 100 100" className="w-8 h-8 text-green-500" fill="currentColor">
                                                {/* Edificio sinistro */}
                                                <rect x="10" y="40" width="20" height="50" fill="currentColor" opacity="0.9" />
                                                <rect x="12" y="50" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="22" y="50" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="12" y="65" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="22" y="65" width="6" height="8" fill="white" opacity="0.8" />
                                                
                                                {/* Edificio centrale */}
                                                <rect x="40" y="30" width="20" height="60" fill="currentColor" opacity="0.9" />
                                                <rect x="42" y="40" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="52" y="40" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="42" y="55" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="52" y="55" width="6" height="8" fill="white" opacity="0.8" />
                                                
                                                {/* Edificio destro */}
                                                <rect x="70" y="45" width="20" height="45" fill="currentColor" opacity="0.9" />
                                                <rect x="72" y="55" width="6" height="8" fill="white" opacity="0.8" />
                                                <rect x="82" y="55" width="6" height="8" fill="white" opacity="0.8" />
                                                
                                                {/* Linee di connessione (rete) */}
                                                <line x1="30" y1="65" x2="40" y2="60" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                                                <line x1="60" y1="60" x2="70" y2="67" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                                                
                                                {/* Punti di connessione */}
                                                <circle cx="30" cy="65" r="2" fill="currentColor" opacity="0.8" />
                                                <circle cx="40" cy="60" r="2" fill="currentColor" opacity="0.8" />
                                                <circle cx="60" cy="60" r="2" fill="currentColor" opacity="0.8" />
                                                <circle cx="70" cy="67" r="2" fill="currentColor" opacity="0.8" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold mb-1">Network di Negozi</h3>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                Una rete capillare di negozi specializzati pronti ad assisterti e valutare le tue carte.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-blue-500/30 blur-[60px] rounded-full"></div>
                                <Card className="glass-panel p-8 relative z-10">
                                    <div className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                            <div>
                                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                                                <div className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="h-8 w-20 bg-green-500/20 rounded-full"></div>
                                    </div>
                                    <div className="space-y-4 mb-8">
                                        <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded"></div>
                                        <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-800 rounded"></div>
                                    </div>
                                    <EscrowAnimation />
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-20 bg-primary text-white text-center">
                    <div className="container mx-auto px-4">
                        <h2 className="text-4xl font-bold mb-6">Pronto a scambiare in sicurezza?</h2>
                        <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
                            Unisciti a migliaia di collezionisti che usano già SafeTrade per i loro scambi.
                        </p>
                        <Link href="/register">
                            <Button size="lg" className="bg-white text-primary hover:bg-gray-100 text-lg px-8 rounded-full">
                                Crea Account Gratuito
                            </Button>
                        </Link>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}
