'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'
import { CardGame, CardCondition } from '@prisma/client'

interface CardItem {
  id: string
  game: CardGame | ''
  name: string
  set: string
  condition: CardCondition | ''
  photos: string[]
  price: string // Prezzo suggerito (minimo 40€ per SafeVault)
}

export default function NewDepositPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  
  // Step 1: Info Generali
  const [notes, setNotes] = useState('')
  const [trackingIn, setTrackingIn] = useState('')
  
  // Step 2: Carte
  const [cards, setCards] = useState<CardItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewImages, setPreviewImages] = useState<Record<string, string[]>>({})
  
  // Step 3: Terms
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Redirect if not authenticated
  if (!userLoading && !user) {
    router.push('/login')
    return null
  }

  const handleImageUpload = async (cardId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const card = cards.find(c => c.id === cardId)
    if (!card) return

    if (card.photos.length + files.length > 5) {
      toast({
        title: 'Error',
        description: 'Massimo 5 immagini per carta',
        variant: 'destructive',
      })
      return
    }

    const newPreviews: string[] = []
    const validFiles: File[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: `${file.name} non è un'immagine`,
          variant: 'destructive',
        })
        continue
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: `${file.name} è troppo grande (max 5MB)`,
          variant: 'destructive',
        })
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      newPreviews.push(previewUrl)
      validFiles.push(file)
    }

    setPreviewImages(prev => ({
      ...prev,
      [cardId]: [...(prev[cardId] || []), ...newPreviews],
    }))

    setUploading(true)
    const newImages: string[] = []

    try {
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await res.json()
        newImages.push(data.url)
      }

      newPreviews.forEach(url => URL.revokeObjectURL(url))
      setPreviewImages(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || []).filter(url => !newPreviews.includes(url)),
      }))

      setCards(cards.map(c => 
        c.id === cardId 
          ? { ...c, photos: [...c.photos, ...newImages] }
          : c
      ))

      toast({
        title: 'Successo',
        description: `${newImages.length} immagine/i caricata/e con successo`,
      })
    } catch (error: any) {
      newPreviews.forEach(url => URL.revokeObjectURL(url))
      setPreviewImages(prev => ({
        ...prev,
        [cardId]: (prev[cardId] || []).filter(url => !newPreviews.includes(url)),
      }))
      toast({
        title: 'Errore Upload',
        description: error.message || 'Caricamento immagini fallito',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (cardId: string, index: number) => {
    setCards(cards.map(c => 
      c.id === cardId 
        ? { ...c, photos: c.photos.filter((_, i) => i !== index) }
        : c
    ))
  }

  const addCard = () => {
    const newCard: CardItem = {
      id: `card-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      game: '',
      name: '',
      set: '',
      condition: '',
      photos: [],
      price: '',
    }
    setCards([...cards, newCard])
  }

  const removeCard = (cardId: string) => {
    setCards(cards.filter(c => c.id !== cardId))
    // Clean up preview images
    if (previewImages[cardId]) {
      previewImages[cardId].forEach(url => URL.revokeObjectURL(url))
      setPreviewImages(prev => {
        const newPrev = { ...prev }
        delete newPrev[cardId]
        return newPrev
      })
    }
  }

  const updateCard = (cardId: string, field: keyof CardItem, value: any) => {
    setCards(cards.map(c => 
      c.id === cardId ? { ...c, [field]: value } : c
    ))
  }

  const validateStep1 = () => {
    // Step 1 has no required fields, always valid
    return true
  }

  const validateStep2 = () => {
    if (cards.length === 0) {
      toast({
        title: 'Error',
        description: 'Aggiungi almeno una carta',
        variant: 'destructive',
      })
      return false
    }

    for (const card of cards) {
      if (!card.name || !card.game || !card.condition) {
        toast({
          title: 'Error',
          description: 'Tutte le carte devono avere nome, gioco e condizione',
          variant: 'destructive',
        })
        return false
      }

      if (card.photos.length === 0) {
        toast({
          title: 'Error',
          description: `La carta "${card.name}" deve avere almeno una foto`,
          variant: 'destructive',
        })
        return false
      }

      // Validazione prezzo minimo 40€ per SafeVault
      if (card.price && parseFloat(card.price) < 40) {
        toast({
          title: 'Error',
          description: `La carta "${card.name}" deve avere un prezzo minimo di 40€ per SafeVault`,
          variant: 'destructive',
        })
        return false
      }
    }

    return true
  }

  const validateStep3 = () => {
    if (!termsAccepted) {
      toast({
        title: 'Error',
        description: 'Devi accettare i termini del servizio SafeVault',
        variant: 'destructive',
      })
      return false
    }
    return true
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2)
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep3()) return

    setSubmitting(true)

    try {
      const res = await fetch('/api/vault/deposits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          trackingIn: trackingIn || undefined,
          items: cards.map(card => ({
            game: card.game,
            name: card.name,
            set: card.set || undefined,
            conditionDeclared: card.condition,
            photos: card.photos,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create deposit')
      }

      toast({
        title: 'Successo',
        description: 'Deposito creato con successo!',
      })

      router.push(`/vault/deposits/${data.data.id}`)
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create deposit',
        variant: 'destructive',
      })
      setSubmitting(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div>Loading...</div>
        </main>
      </div>
    )
  }

  // Hub address (from env or default)
  const hubAddress = process.env.NEXT_PUBLIC_HUB_ADDRESS || 'Via Tindari 15, 97100 Ragusa, Italia'

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-[120px]"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Card className="glass-panel rounded-3xl p-8 sm:p-10">
              <CardHeader>
                <CardTitle className="text-3xl font-black">Crea Nuovo Deposito SafeVault</CardTitle>
                <CardDescription className="text-base">
                  Invia le tue carte all'hub SafeTrade per verifica professionale e vendita multicanale
                </CardDescription>
              </CardHeader>

              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                            currentStep >= step
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                          }`}
                        >
                          {currentStep > step ? (
                            <span className="material-symbols-outlined text-sm">check</span>
                          ) : (
                            step
                          )}
                        </div>
                        <span className="text-xs mt-2 text-center">
                          {step === 1 && 'Info Generali'}
                          {step === 2 && 'Aggiungi Carte'}
                          {step === 3 && 'Riepilogo'}
                        </span>
                      </div>
                      {step < 3 && (
                        <div
                          className={`h-1 flex-1 mx-2 transition-all ${
                            currentStep > step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <CardContent>
                {/* Step 1: Info Generali */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Informazioni Generali</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Fornisci informazioni opzionali sul tuo deposito
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Note Deposito (Opzionale)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Aggiungi note sul deposito, condizioni particolari, etc..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trackingIn">Tracking In (Opzionale)</Label>
                      <Input
                        id="trackingIn"
                        value={trackingIn}
                        onChange={(e) => setTrackingIn(e.target.value)}
                        placeholder="Se hai già spedito, inserisci il codice di tracking"
                        className="h-12"
                      />
                      <p className="text-xs text-gray-500">
                        Se hai già spedito il pacco, inserisci qui il codice di tracking
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Aggiungi Carte */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Aggiungi Carte</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Aggiungi le carte che vuoi depositare. Ogni carta deve avere almeno una foto.
                      </p>
                    </div>

                    {cards.map((card, index) => (
                      <Card key={card.id} className="p-6 border-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-lg">Carta {index + 1}</h4>
                          {cards.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCard(card.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              Rimuovi
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`game-${card.id}`}>Gioco *</Label>
                            <Select
                              value={card.game}
                              onValueChange={(value) => updateCard(card.id, 'game', value as CardGame)}
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Seleziona gioco" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="POKEMON">Pokemon</SelectItem>
                                <SelectItem value="MAGIC">Magic: The Gathering</SelectItem>
                                <SelectItem value="YUGIOH">Yu-Gi-Oh!</SelectItem>
                                <SelectItem value="ONEPIECE">One Piece</SelectItem>
                                <SelectItem value="DIGIMON">Digimon</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`name-${card.id}`}>Nome Carta *</Label>
                            <Input
                              id={`name-${card.id}`}
                              value={card.name}
                              onChange={(e) => updateCard(card.id, 'name', e.target.value)}
                              placeholder="e.g., Charizard VMAX"
                              required
                              className="h-12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`set-${card.id}`}>Set (Opzionale)</Label>
                            <Input
                              id={`set-${card.id}`}
                              value={card.set}
                              onChange={(e) => updateCard(card.id, 'set', e.target.value)}
                              placeholder="e.g., Champion's Path"
                              className="h-12"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`condition-${card.id}`}>Condizione *</Label>
                            <Select
                              value={card.condition}
                              onValueChange={(value) => updateCard(card.id, 'condition', value as CardCondition)}
                            >
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Seleziona condizione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MINT">Mint</SelectItem>
                                <SelectItem value="NEAR_MINT">Near Mint</SelectItem>
                                <SelectItem value="EXCELLENT">Excellent</SelectItem>
                                <SelectItem value="GOOD">Good</SelectItem>
                                <SelectItem value="PLAYED">Played</SelectItem>
                                <SelectItem value="POOR">Poor</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`price-${card.id}`}>
                              Prezzo Suggerito (€) *
                              <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                                (Minimo 40€ per SafeVault)
                              </span>
                            </Label>
                            <Input
                              id={`price-${card.id}`}
                              type="number"
                              step="0.01"
                              min="40"
                              value={card.price}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value && parseFloat(value) < 40) {
                                  toast({
                                    title: 'Prezzo troppo basso',
                                    description: 'SafeVault richiede un prezzo minimo di 40€',
                                    variant: 'destructive',
                                  })
                                }
                                updateCard(card.id, 'price', value)
                              }}
                              placeholder="40.00 (minimo)"
                              required
                              className="h-12"
                            />
                            {card.price && parseFloat(card.price) < 40 && (
                              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                                ⚠️ Il prezzo deve essere almeno 40€ per SafeVault
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Images Upload */}
                        <div className="mt-4 space-y-2">
                          <Label>Foto Carta * (1-5 immagini)</Label>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {card.photos.map((url, imgIndex) => (
                              <div key={imgIndex} className="relative group">
                                <img
                                  src={url}
                                  alt={`${card.name} ${imgIndex + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border-2 border-primary/20"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(card.id, imgIndex)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            ))}
                            {(previewImages[card.id] || []).map((url, imgIndex) => (
                              <div key={`preview-${imgIndex}`} className="relative">
                                <img
                                  src={url}
                                  alt={`Preview ${imgIndex + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border-2 border-yellow-500/50 opacity-75"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                              </div>
                            ))}
                            {card.photos.length + (previewImages[card.id]?.length || 0) < 5 && (
                              <label className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary transition-colors bg-gray-50 dark:bg-gray-800/50">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => handleImageUpload(card.id, e)}
                                  disabled={uploading}
                                  className="hidden"
                                />
                                <div className="text-center">
                                  <span className="material-symbols-outlined text-2xl text-gray-400">add_photo_alternate</span>
                                  <p className="text-xs text-gray-500 mt-1">Aggiungi</p>
                                </div>
                              </label>
                            )}
                          </div>
                          {card.photos.length === 0 && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              ⚠️ Almeno una foto è obbligatoria
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCard}
                      className="w-full"
                    >
                      <span className="material-symbols-outlined mr-2">add</span>
                      Aggiungi Altra Carta
                    </Button>
                  </div>
                )}

                {/* Step 3: Riepilogo */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold mb-4">Riepilogo</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Verifica le informazioni e completa il deposito
                      </p>
                    </div>

                    {/* Lista Carte */}
                    <div className="space-y-4">
                      <h4 className="font-bold">Carte da Depositare ({cards.length})</h4>
                      {cards.map((card, index) => (
                        <Card key={card.id} className="p-4">
                          <div className="flex items-start gap-4">
                            {card.photos[0] && (
                              <img
                                src={card.photos[0]}
                                alt={card.name}
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <h5 className="font-bold">{card.name}</h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {card.game} {card.set && `• ${card.set}`} • {card.condition}
                              </p>
                              {card.price && (
                                <p className="text-sm font-semibold text-primary mt-1">
                                  Prezzo suggerito: €{parseFloat(card.price).toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Indirizzo Hub */}
                    <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-500">location_on</span>
                        Indirizzo Hub SafeTrade
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {hubAddress}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Spedisci le tue carte a questo indirizzo. Includi il codice deposito nella causale di spedizione.
                      </p>
                    </Card>

                    {/* Istruzioni */}
                    <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
                      <h4 className="font-bold mb-3">Istruzioni per la Spedizione</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <li>Imballa le carte in modo sicuro (top loader o protezioni simili)</li>
                        <li>Includi il codice deposito nella causale di spedizione</li>
                        <li>Usa un corriere tracciabile (consigliato)</li>
                        <li>Inserisci il codice di tracking qui sopra dopo la spedizione</li>
                        <li>Riceverai una notifica quando il deposito sarà ricevuto</li>
                      </ol>
                    </Card>

                    {/* Terms */}
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                          className="mt-1"
                          required
                        />
                        <span className="text-sm text-purple-800 dark:text-purple-200">
                          Ho letto e accetto i <a href="/terms/vault" target="_blank" className="underline hover:text-purple-600">termini del servizio SafeVault</a> *
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1}
                  >
                    <span className="material-symbols-outlined mr-2">arrow_back</span>
                    Indietro
                  </Button>
                  
                  {currentStep < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-primary hover:bg-primary-dark"
                    >
                      Avanti
                      <span className="material-symbols-outlined ml-2">arrow_forward</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-primary hover:bg-primary-dark"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creazione...
                        </>
                      ) : (
                        <>
                          Crea Deposito
                          <span className="material-symbols-outlined ml-2">check</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

