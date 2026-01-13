'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Camera, X } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
  onClose?: () => void
  fps?: number
  qrbox?: { width: number; height: number }
  aspectRatio?: number
  className?: string
}

export function QRScanner({
  onScanSuccess,
  onScanError,
  onClose,
  fps = 10,
  qrbox = { width: 250, height: 250 },
  aspectRatio = 1.0,
  className = '',
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string>('')
  const [cameraId, setCameraId] = useState<string | null>(null)
  const scannerId = 'qr-scanner'

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null
          })
          .catch(() => {
            scannerRef.current = null
          })
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError('')
      setScanning(true)

      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras()
      if (cameras.length === 0) {
        throw new Error('Nessuna fotocamera trovata')
      }

      // Use back camera if available, otherwise use first camera
      const preferredCamera = cameras.find((cam) => cam.label.toLowerCase().includes('back')) || cameras[0]
      setCameraId(preferredCamera.id)

      await html5QrCode.start(
        preferredCamera.id,
        {
          fps,
          qrbox,
          aspectRatio,
        },
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText)
          // Stop scanning after successful scan
          stopScanning()
        },
        (errorMessage) => {
          // Error callback - ignore if it's just "not found" errors
          if (!errorMessage.includes('NotFoundException')) {
            if (onScanError) {
              onScanError(errorMessage)
            }
          }
        }
      )
    } catch (err: any) {
      setError(err.message || 'Errore nell\'avvio dello scanner')
      setScanning(false)
      if (onScanError) {
        onScanError(err.message || 'Errore nell\'avvio dello scanner')
      }
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        // Ignore errors when stopping
      }
      scannerRef.current = null
      setScanning(false)
      setCameraId(null)
    }
  }

  const handleClose = () => {
    stopScanning()
    if (onClose) {
      onClose()
    }
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Scanner QR Code</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="relative">
          <div
            id={scannerId}
            className="w-full rounded-lg overflow-hidden bg-black"
            style={{ minHeight: '300px' }}
          ></div>

          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <Button onClick={startScanning} className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Avvia Scanner
              </Button>
            </div>
          )}

          {scanning && (
            <div className="absolute top-4 right-4">
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Scansione attiva
              </div>
            </div>
          )}
        </div>

        {scanning && (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={stopScanning} className="flex items-center gap-2">
              <X className="h-4 w-4" />
              Ferma Scanner
            </Button>
          </div>
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          Posiziona il QR code all'interno del riquadro per scansionarlo
        </p>
      </CardContent>
    </Card>
  )
}

