'use client'

import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card className="glass-panel p-8">
            <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
            <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-2xl font-bold mb-4">1. Raccolta Dati</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Raccogliamo i seguenti dati quando utilizzi SafeTrade:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Informazioni di account (email, nome, password)</li>
                  <li>Informazioni di profilo (avatar, preferenze)</li>
                  <li>Dati di transazione (per facilitare SafeTrade)</li>
                  <li>Dati di utilizzo (per migliorare il servizio)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">2. Utilizzo Dati</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Utilizziamo i tuoi dati per:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Fornire e migliorare il servizio SafeTrade</li>
                  <li>Facilitare transazioni e comunicazioni</li>
                  <li>Inviare notifiche importanti</li>
                  <li>Rispettare obblighi legali</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">3. Condivisione Dati</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Non vendiamo i tuoi dati personali. Condividiamo dati solo con:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Negozi verificati (per completare transazioni SafeTrade)</li>
                  <li>Fornitori di servizi (hosting, pagamenti)</li>
                  <li>Autorità legali (se richiesto dalla legge)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">4. Sicurezza</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Implementiamo misure di sicurezza appropriate per proteggere i tuoi dati personali, inclusi crittografia, autenticazione e controlli di accesso.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold mb-4">5. I Tuoi Diritti</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Hai il diritto di:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Accedere ai tuoi dati personali</li>
                  <li>Correggere dati inesatti</li>
                  <li>Richiedere la cancellazione dei dati</li>
                  <li>Opporti al trattamento dei dati</li>
                </ul>
              </section>

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">
                  Per domande sulla privacy, contatta: privacy@safetrade.com
                </p>
                <p className="text-sm text-gray-500 mt-2">
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

