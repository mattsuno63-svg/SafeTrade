import QRCode from 'qrcode'

/**
 * Generate QR code as data URL (for displaying in img tag)
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    const qrCodeSVG = await QRCode.toString(data, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      width: 300,
    })
    return qrCodeSVG
  } catch (error) {
    console.error('Error generating QR code SVG:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code for SafeTrade transaction
 */
export function generateTransactionQRData(transactionId: string): string {
  return JSON.stringify({
    type: 'safetrade',
    transactionId,
    timestamp: Date.now(),
  })
}

