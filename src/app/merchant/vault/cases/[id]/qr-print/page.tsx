'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Download, Printer, QrCode, CheckCircle2, XCircle } from 'lucide-react'
import { useUser } from '@/hooks/use-user'
import { escapeHtml } from '@/lib/api-error'
import Image from 'next/image'

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_APP_URL || ''
}

interface QRCodeData {
  slotId: string
  slotCode: string
  qrToken: string
  qrData: string // Base64 data URL
  status: 'FREE' | 'OCCUPIED'
}

interface CaseData {
  caseId: string
  caseLabel: string | null
  qrCodes: QRCodeData[]
}

export default function VaultCaseQRPrintPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)

  const fetchQRBatch = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/vault/cases/${params.id}/qr-batch`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Errore nel caricamento QR codes')
      }
      const data = await res.json()
      setCaseData(data)
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login')
      return
    }

    if (params.id) {
      fetchQRBatch()
    }
  }, [params.id, user, userLoading, router, fetchQRBatch])

  const downloadSingleQR = async (qr: QRCodeData) => {
    try {
      setDownloading(qr.slotId)
      const link = document.createElement('a')
      link.href = qr.qrData
      link.download = `QR_${qr.slotCode}_${caseData?.caseLabel || 'Teca'}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Error downloading QR:', err)
    } finally {
      setDownloading(null)
    }
  }

  const downloadBatchPDF = async () => {
    try {
      setPrinting(true)
      // Create a new window for printing
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Impossibile aprire la finestra di stampa. Verifica che i popup non siano bloccati.')
        return
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Codes Teca - ${escapeHtml(caseData?.caseLabel || 'Teca')}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 10mm;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                padding: 20px;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                margin-bottom: 20px;
              }
              .qr-label {
                border: 1px solid #ddd;
                padding: 15px;
                text-align: center;
                page-break-inside: avoid;
              }
              .qr-label h3 {
                margin: 0 0 10px 0;
                font-size: 18px;
                font-weight: bold;
              }
              .qr-label img {
                width: 150px;
                height: 150px;
                margin: 10px 0;
              }
              .qr-label p {
                margin: 5px 0;
                font-size: 12px;
                color: #666;
                word-break: break-all;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #000;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
              }
              .header p {
                margin: 5px 0;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SafeTrade Vault - QR Codes</h1>
              <p>Teca: ${escapeHtml(caseData?.caseLabel || 'N/A')}</p>
              <p>Generato il: ${new Date().toLocaleDateString('it-IT')}</p>
            </div>
            <div class="qr-grid">
              ${caseData?.qrCodes.map(qr => `
                <div class="qr-label">
                  <h3>${escapeHtml(qr.slotCode)}</h3>
                  <img src="${escapeHtml(qr.qrData)}" alt="QR Code ${escapeHtml(qr.slotCode)}" />
                  <p><strong>Status:</strong> ${escapeHtml(qr.status)}</p>
                  <p style="font-size: 10px; margin-top: 10px;">${escapeHtml(getBaseUrl())}/scan/${escapeHtml(qr.qrToken)}</p>
                </div>
              `).join('') || ''}
            </div>
          </body>
        </html>
      `)

      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
        setPrinting(false)
      }, 500)
    } catch (err) {
      console.error('Error printing:', err)
      setPrinting(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push(`/merchant/vault/cases/${params.id}`)} className="mt-4">
            Torna alla Teca
          </Button>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Nessun dato disponibile</h2>
          <Button onClick={() => router.push(`/merchant/vault/cases/${params.id}`)}>
            Torna alla Teca
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/merchant/vault/cases/${params.id}`)}
            className="mb-4"
          >
            ← Torna alla Teca
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                QR Codes - {caseData.caseLabel || `Teca ${caseData.caseId.slice(-4)}`}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Genera e stampa QR codes per tutti i 30 slot della teca
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                onClick={downloadBatchPDF}
                disabled={printing}
                className="bg-primary text-white"
              >
                {printing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Preparazione...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Stampa Tutti
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Totale Slot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{caseData.qrCodes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Slot Liberi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {caseData.qrCodes.filter(qr => qr.status === 'FREE').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Slot Occupati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {caseData.qrCodes.filter(qr => qr.status === 'OCCUPIED').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">QR Generati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {caseData.qrCodes.length}/30
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {caseData.qrCodes.map((qr) => (
            <Card key={qr.slotId} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">{qr.slotCode}</CardTitle>
                  <Badge variant={qr.status === 'OCCUPIED' ? 'default' : 'secondary'}>
                    {qr.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* QR Code Preview */}
                <div className="flex justify-center bg-white p-4 rounded-lg">
                  <Image
                    src={qr.qrData}
                    alt={`QR Code ${qr.slotCode}`}
                    width={200}
                    height={200}
                    className="w-full h-auto max-w-[200px]"
                  />
                </div>

                {/* URL */}
                <div className="text-xs text-gray-500 dark:text-gray-400 break-all">
                  <p className="font-semibold mb-1">Scan URL:</p>
                  <p className="font-mono">{`${getBaseUrl()}/scan/${qr.qrToken}`}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSingleQR(qr)}
                    disabled={downloading === qr.slotId}
                    className="flex-1"
                  >
                    {downloading === qr.slotId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-1" />
                        PNG
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = `${getBaseUrl()}/scan/${qr.qrToken}`
                      navigator.clipboard.writeText(url)
                      // You could add a toast here
                    }}
                    className="flex-1"
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Alert */}
        <Alert className="mt-8">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Come usare:</strong> Stampa i QR codes e attaccali agli slot corrispondenti nella teca fisica.
            I clienti potranno scansionare i QR per vedere le informazioni delle carte.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}

