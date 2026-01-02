'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'Cos\'è SafeTrade?',
    answer: 'SafeTrade è un sistema di escrow che garantisce transazioni sicure tra collezionisti. Le transazioni vengono completate presso negozi verificati che verificano l\'autenticità delle carte prima del completamento.',
  },
  {
    question: 'Come funziona SafeTrade?',
    answer: '1. Acquirente e venditore concordano una transazione\n2. Selezionano un negozio verificato\n3. Prenotano un appuntamento\n4. Si incontrano al negozio\n5. Il negozio verifica le carte\n6. La transazione viene completata in sicurezza',
  },
  {
    question: 'Quanto costa SafeTrade?',
    answer: 'SafeTrade è gratuito per gli utenti. I negozi verificati possono applicare una piccola commissione per il servizio di verifica.',
  },
  {
    question: 'Come divento un negozio verificato?',
    answer: 'Compila il form di registrazione come merchant, fornisci tutti i documenti richiesti (P.IVA, dati aziendali) e attendi l\'approvazione da parte dell\'amministratore.',
  },
  {
    question: 'Come posso vendere le mie carte?',
    answer: 'Registrati come utente, vai su "Vendi Carte", crea un annuncio con foto e dettagli della carta. Dopo l\'approvazione dell\'admin, il tuo annuncio sarà visibile nel marketplace.',
  },
  {
    question: 'Le carte sono garantite autentiche?',
    answer: 'Sì, quando usi SafeTrade, il negozio verificato controlla l\'autenticità delle carte prima di completare la transazione. Questo garantisce che entrambe le parti ricevano ciò che hanno concordato.',
  },
  {
    question: 'Cosa succede se una carta non è autentica?',
    answer: 'Se il negozio verificato identifica una carta come non autentica durante la verifica SafeTrade, la transazione viene annullata e i fondi vengono restituiti all\'acquirente.',
  },
  {
    question: 'Posso organizzare tornei?',
    answer: 'Sì, se sei un merchant verificato puoi creare e gestire tornei attraverso la dashboard del tuo negozio.',
  },
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Domande Frequenti</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Trova risposte alle domande più comuni su SafeTrade
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="glass-panel overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h3 className="font-bold text-lg pr-4">{faq.question}</h3>
                  <span className={`material-symbols-outlined transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}>
                    expand_more
                  </span>
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <Card className="glass-panel p-6 mt-8 text-center">
            <h3 className="font-bold text-lg mb-2">Non trovi la risposta?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Contattaci e ti risponderemo il prima possibile
            </p>
            <Button asChild className="bg-primary hover:bg-primary-dark">
              <a href="mailto:support@safetrade.com">Contatta Supporto</a>
            </Button>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}

