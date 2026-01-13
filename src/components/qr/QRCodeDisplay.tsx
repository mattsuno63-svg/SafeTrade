'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Download, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface QRCodeDisplayProps {
  qrData: string // Data URL or SVG string
  qrCode?: string // Optional: human-readable code
  title?: string
  description?: string
  onDownload?: () => void
  className?: string
}

export function QRCodeDisplay({
  qrData,
  qrCode,
  title = 'QR Code',
  description,
  onDownload,
  className = '',
}: QRCodeDisplayProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
      return
    }

    try {
      const link = document.createElement('a')
      link.href = qrData
      link.download = `qr-code-${qrCode || Date.now()}.${qrData.startsWith('data:image/svg') ? 'svg' : 'png'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'QR Code scaricato',
        description: 'Il QR code è stato scaricato con successo',
      })
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile scaricare il QR code',
        variant: 'destructive',
      })
    }
  }

  const handleCopy = async () => {
    try {
      if (qrCode) {
        await navigator.clipboard.writeText(qrCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        toast({
          title: 'Codice copiato',
          description: 'Il codice QR è stato copiato negli appunti',
        })
      }
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Impossibile copiare il codice',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {title && <h3 className="text-lg font-bold mb-2">{title}</h3>}
        {description && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{description}</p>}

        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
            {qrData.startsWith('data:image/svg') ? (
              <div
                className="w-64 h-64"
                dangerouslySetInnerHTML={{ __html: qrData.replace('data:image/svg+xml;charset=utf-8,', '') }}
              />
            ) : (
              <img src={qrData} alt="QR Code" className="w-64 h-64" />
            )}
          </div>

          {qrCode && (
            <div className="w-full">
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <code className="flex-1 text-sm font-mono text-center">{qrCode}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button onClick={handleDownload} className="flex-1 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Scarica QR Code
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

