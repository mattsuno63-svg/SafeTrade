'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="glass-panel p-8">
            <h1 className="text-4xl font-bold mb-6">Termini e Condizioni</h1>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-2xl font-bold mb-4">1. Accettazione dei Termini</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Utilizzando SafeTrade, accetti di rispettare questi Termini e Condizioni. Se non accetti questi termini, non utilizzare il servizio.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">2. Utilizzo del Servizio</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  SafeTrade è una piattaforma che facilita la compravendita e lo scambio di carte collezionabili. Gli utenti sono responsabili di:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Fornire informazioni accurate sui prodotti</li>
                  <li>Rispettare le leggi locali e nazionali</li>
                  <li>Non utilizzare il servizio per attività illegali</li>
                  <li>Mantenere la sicurezza del proprio account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">3. SafeTrade e Escrow</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  SafeTrade offre un servizio di escrow attraverso negozi verificati. Le transazioni vengono completate presso negozi partner verificati che garantiscono l'autenticità e la sicurezza della transazione.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">4. Responsabilità</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  SafeTrade agisce come intermediario. Non siamo responsabili per la qualità, autenticità o conformità dei prodotti venduti dagli utenti. I negozi verificati sono responsabili della verifica delle transazioni SafeTrade.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">5. Modifiche ai Termini</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche entreranno in vigore immediatamente dopo la pubblicazione.
                </p>
              </section>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">
                  Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

