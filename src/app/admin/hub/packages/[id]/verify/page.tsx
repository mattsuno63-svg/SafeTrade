'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/use-user'

export default function VerifyPackagePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const { user, loading: userLoading } = useUser()
  const packageId = params.id as string

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<'PASSED' | 'FAILED' | ''>('')
  const [conditionVerified, setConditionVerified] = useState('')
  const [priceFinal, setPriceFinal] = useState('')
  const [loading, setLoading] = useState(false)
  const [transaction, setTransaction] = useState<any>(null)

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/transactions/${packageId}`)
        if (res.ok) {
          const data = await res.json()
          setTransaction(data)
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      }
    }

    if (packageId) {
      fetchTransaction()
    }
  }, [packageId])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (files.length + photos.length < 3) {
      toast({
        title: 'Errore',
        description: 'Devi caricare almeno 3 foto',
        variant: 'destructive',
      })
      return
    }

    const newPhotos = [...photos, ...files]
    setPhotos(newPhotos)

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPhotoPreviews([...photoPreviews, ...newPreviews])
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (photos.length < 3) {
      toast({
        title: 'Errore',
        description: 'Minimo 3 foto obbligatorie per la verifica',
        variant: 'destructive',
      })
      return
    }

    if (!result) {
      toast({
        title: 'Errore',
        description: 'Seleziona il risultato della verifica',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      photos.forEach(photo => {
        formData.append('photos', photo)
      })
      formData.append('notes', notes)
      formData.append('result', result)
      if (conditionVerified) formData.append('conditionVerified', conditionVerified)
      if (priceFinal) formData.append('priceFinal', priceFinal)

      const res = await fetch(`/api/admin/hub/packages/${packageId}/verify`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Errore nella verifica')
      }

      const data = await res.json()

      toast({
        title: '✅ Verifica Completata',
        description: result === 'PASSED' 
          ? 'La verifica è stata completata con successo.'
          : 'La verifica è fallita. Il rimborso è stato richiesto.',
      })

      router.push('/admin/hub/packages')
    } catch (error: any) {
      console.error('Error verifying package:', error)
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile completare la verifica',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      <main className="flex-1 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mb-4"
            >
              ← Indietro
            </Button>
            <h1 className="text-3xl font-bold mb-2">Verifica Pacco</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Transazione #{packageId?.slice(0, 8)}
            </p>
          </div>

          {/* Form */}
          <Card className="glass-panel p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Photos Upload */}
              <div className="space-y-2">
                <Label htmlFor="photos">Foto Verifica * (Minimo 3)</Label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                  <input
                    id="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="photos"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-4xl text-gray-400">
                      photo_camera
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Clicca per caricare foto (minimo 3)
                    </span>
                    <span className="text-xs text-gray-500">
                      {photos.length} foto caricate
                    </span>
                  </label>
                </div>

                {/* Photo Previews */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Note Verifica</Label>
                <Textarea
                  id="notes"
                  placeholder="Inserisci note sulla verifica (condizione carta, eventuali difetti, ecc.)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Condition Verified */}
              <div className="space-y-2">
                <Label htmlFor="conditionVerified">Condizione Verificata</Label>
                <Select value={conditionVerified} onValueChange={setConditionVerified}>
                  <SelectTrigger>
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

              {/* Price Final */}
              <div className="space-y-2">
                <Label htmlFor="priceFinal">Prezzo Finale (se diverso da listing)</Label>
                <input
                  id="priceFinal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={priceFinal}
                  onChange={(e) => setPriceFinal(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>

              {/* Result */}
              <div className="space-y-2">
                <Label htmlFor="result">Risultato Verifica *</Label>
                <Select value={result} onValueChange={(v) => setResult(v as 'PASSED' | 'FAILED')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona risultato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PASSED">✅ Verifica OK</SelectItem>
                    <SelectItem value="FAILED">❌ Verifica Fallita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={loading}
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 ${
                    result === 'FAILED'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={loading || photos.length < 3 || !result}
                >
                  {loading ? 'Verifica in corso...' : 'Completa Verifica'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}


