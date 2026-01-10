// Import dinamico di Sharp solo a runtime per evitare problemi durante il build
// Sharp è una libreria nativa che può causare problemi durante il build time

// Configurazione ottimizzazione
const MAX_WIDTH = 1200
const MAX_HEIGHT = 1200
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB max file size
const WEBP_QUALITY = 80 // Qualità WebP (0-100)
const JPEG_QUALITY = 85 // Qualità JPEG (0-100)

// Dynamic import function per Sharp
async function getSharp() {
  // Import dinamico solo quando necessario (runtime)
  const sharp = (await import('sharp')).default
  return sharp
}

interface OptimizeOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png' | 'auto'
  maxFileSize?: number
}

/**
 * Ottimizza un'immagine usando Sharp
 * Ridimensiona, converte a WebP quando possibile, e comprime
 */
export async function optimizeImage(
  input: Buffer | Uint8Array,
  options: OptimizeOptions = {}
): Promise<Buffer> {
  const {
    maxWidth = MAX_WIDTH,
    maxHeight = MAX_HEIGHT,
    quality = WEBP_QUALITY,
    format = 'auto',
    maxFileSize = MAX_FILE_SIZE,
  } = options

  // Import dinamico di Sharp solo a runtime
  const sharp = await getSharp()
  let image = sharp(input)
  const metadata = await image.metadata()

  // Verifica dimensioni originali
  if (metadata.width && metadata.height) {
    // Se l'immagine è già più piccola delle dimensioni massime, non ridimensionare troppo
    // ma comunque ottimizzare la compressione
    const shouldResize =
      metadata.width > maxWidth || metadata.height > maxHeight

    if (shouldResize) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    }
  }

  // Determina formato output
  let outputFormat: 'webp' | 'jpeg' | 'png' = 'jpeg'
  
  if (format === 'auto') {
    // Usa WebP se supportato (più efficiente), altrimenti JPEG
    // Mantieni PNG solo per immagini con trasparenza
    if (metadata.hasAlpha) {
      outputFormat = 'png'
      image = image.png({ quality, compressionLevel: 9 })
    } else {
      // Preferisci WebP per dimensioni minori
      outputFormat = 'webp'
      image = image.webp({ quality })
    }
  } else {
    outputFormat = format
    switch (format) {
      case 'webp':
        image = image.webp({ quality })
        break
      case 'jpeg':
        image = image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        break
      case 'png':
        image = image.png({ quality, compressionLevel: 9 })
        break
    }
  }

  // Ottimizza l'immagine
  let optimizedBuffer = await image.toBuffer()

  // Se il file ottimizzato è ancora troppo grande, aumenta la compressione
  let attempts = 0
  let currentQuality = quality
  
  while (optimizedBuffer.length > maxFileSize && attempts < 3 && currentQuality > 40) {
    currentQuality -= 10
    attempts++
    
    // Re-import Sharp per creare una nuova istanza
    const sharp = await getSharp()
    image = sharp(input)
    if (metadata.width && metadata.height) {
      const shouldResize =
        metadata.width > maxWidth || metadata.height > maxHeight
      if (shouldResize) {
        image = image.resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
    }

    switch (outputFormat) {
      case 'webp':
        optimizedBuffer = await image.webp({ quality: currentQuality }).toBuffer()
        break
      case 'jpeg':
        optimizedBuffer = await image.jpeg({ quality: currentQuality - 5, mozjpeg: true }).toBuffer()
        break
      case 'png':
        optimizedBuffer = await image.png({ quality: currentQuality, compressionLevel: 9 }).toBuffer()
        break
    }
  }

  return optimizedBuffer
}

/**
 * Converte un File in Buffer ottimizzato
 */
export async function optimizeImageFile(
  file: File,
  options: OptimizeOptions = {}
): Promise<{ buffer: Buffer; mimeType: string; originalSize: number; optimizedSize: number }> {
  // Valida tipo file
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Valida dimensione file originale
  if (file.size > 20 * 1024 * 1024) { // 20MB max originale
    throw new Error('File size must be less than 20MB')
  }

  // Leggi file come ArrayBuffer e converti in Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const originalSize = buffer.length

  // Ottimizza
  const optimizedBuffer = await optimizeImage(buffer, options)

  // Determina MIME type per output
  let mimeType = 'image/jpeg'
  if (options.format === 'webp' || (options.format === 'auto' && !file.type.includes('png'))) {
    mimeType = 'image/webp'
  } else if (options.format === 'png' || file.type === 'image/png') {
    mimeType = 'image/png'
  }

  return {
    buffer: optimizedBuffer,
    mimeType,
    originalSize,
    optimizedSize: optimizedBuffer.length,
  }
}

/**
 * Ottiene estensione file basata sul MIME type
 */
export function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/webp':
      return 'webp'
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg'
    case 'image/png':
      return 'png'
    default:
      return 'jpg'
  }
}

/**
 * Calcola percentuale di riduzione dimensione
 */
export function calculateSizeReduction(originalSize: number, optimizedSize: number): number {
  if (originalSize === 0) return 0
  return Math.round(((originalSize - optimizedSize) / originalSize) * 100)
}

