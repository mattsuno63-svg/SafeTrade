'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QRScanner } from '@/components/qr/QRScanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { useToast } from '@/hooks/use-toast'

export default function MerchantVerifyScanPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const { toast } = useToast()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string>('')

  const handleScanSuccess = async (decodedText: string) => {
    try {
      setProcessing(true)
      setError('')

      // Parse QR data
      let qrData = decodedText
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(decodedText)
        if (parsed.verifyUrl) {
          qrData = parsed.verifyUrl
        } else if (parsed.qrCode) {
          qrData = parsed.qrCode
        }
      } catch {
        // Not JSON, use as is
      }

      // Send to scan endpoint
      const res = await fetch('/api/merchant/verify/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrData }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Errore nella scansione')
      }

      // Redirect based on type
      if (data.type === 'ESCROW') {
        router.push(data.redirectUrl || `/merchant/verify/${data.session?.qrCode || qrData}`)
      } else if (data.type === 'VAULT_SLOT') {
        router.push(data.redirectUrl || `/merchant/vault/scan?token=${data.slot?.qrToken || qrData}`)
      } else {
        router.push(data.redirectUrl || '/merchant')
      }

      toast({
        title: 'QR Code scansionato',
        description: 'Reindirizzamento in corso...',
      })
    } catch (err: any) {
      setError(err.message || 'Errore nella scansione del QR code')
      toast({
        title: 'Errore',
        description: err.message || 'Errore nella scansione del QR code',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || (user.role !== 'MERCHANT' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Accesso negato. Solo i merchant possono verificare le transazioni.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📱</span>
              Scanner QR Code - Verifica Transazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Scansiona il QR code fornito dall'acquirente o dal venditore per iniziare la verifica della transazione escrow.
            </p>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {processing && (
              <Alert className="mb-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Elaborazione QR code in corso...</AlertDescription>
              </Alert>
            )}

            <QRScanner
              onScanSuccess={handleScanSuccess}
              onScanError={(error) => {
                // Ignore common scanning errors
                if (!error.includes('NotFoundException')) {
                  console.error('Scan error:', error)
                }
              }}
              className="w-full"
            />

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">Come funziona:</h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>L'acquirente o venditore ti mostrerà il QR code dalla loro app</li>
                <li>Scansiona il QR code con la fotocamera</li>
                <li>Verrai reindirizzato alla pagina di verifica della transazione</li>
                <li>Completa la verifica e conferma il pagamento</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

