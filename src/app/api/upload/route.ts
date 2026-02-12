import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeImageFile, getFileExtension, calculateSizeReduction } from '@/lib/image-optimization'
import { checkRateLimit, RATE_LIMITS, getRateLimitKey, setRateLimitHeaders } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

/** Dimensione massima file: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Estensioni consentite */
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

/** MIME types consentiti */
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

/**
 * Valida il tipo reale del file leggendo i magic bytes (file signature).
 * NON fidarsi del Content-Type header che viene dal client.
 */
function detectImageType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer)

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
    return 'image/png'
  }
  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif'
  }
  // WebP: 52 49 46 46 xx xx xx xx 57 45 42 50 (RIFF....WEBP)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 },
      )
    }

    // ── Rate limit per utente ──
    const rateLimitKey = getRateLimitKey(user.id, 'UPLOAD')
    const rateResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.UPLOAD)

    if (!rateResult.allowed) {
      const res = NextResponse.json(
        { error: 'Troppi upload. Riprova più tardi.' },
        { status: 429 },
      )
      setRateLimitHeaders(res.headers, rateResult)
      return res
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Nessun file fornito' },
        { status: 400 },
      )
    }

    // ── Controllo dimensione ──
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Il file supera il limite di ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    // ── Controllo MIME type dichiarato ──
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Tipo file non consentito. Formati accettati: JPG, PNG, WebP, GIF' },
        { status: 400 },
      )
    }

    // ── Controllo magic bytes (verifica reale del contenuto) ──
    const fileBuffer = await file.arrayBuffer()
    const detectedType = detectImageType(fileBuffer)

    if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType)) {
      return NextResponse.json(
        { error: 'Il contenuto del file non corrisponde a un\'immagine valida' },
        { status: 400 },
      )
    }

    // ── Ottimizzazione ──
    let optimizedImage: { buffer: Buffer; mimeType: string; originalSize: number; optimizedSize: number }
    try {
      optimizedImage = await optimizeImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 80,
        format: 'auto',
      })
    } catch {
      return NextResponse.json(
        { error: 'Impossibile elaborare l\'immagine' },
        { status: 400 },
      )
    }

    // ── Filename sicuro con crypto.randomUUID ──
    const fileExt = getFileExtension(optimizedImage.mimeType)

    if (!ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json(
        { error: 'Estensione file non consentita' },
        { status: 400 },
      )
    }

    const fileName = `listings/${randomUUID()}.${fileExt}`
    const bucketName = 'safetrade-images'

    const uint8Array = new Uint8Array(optimizedImage.buffer)
    const optimizedBlob = new Blob([uint8Array], { type: optimizedImage.mimeType })

    // Upload
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, optimizedBlob, {
        cacheControl: '31536000',
        upsert: false,
        contentType: optimizedImage.mimeType,
      })

    if (error) {
      console.error('[upload] Storage error:', error.message)
      return NextResponse.json(
        { error: 'Errore durante il caricamento' },
        { status: 500 },
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    const res = NextResponse.json({
      url: publicUrl,
      path: data.path,
      originalSize: optimizedImage.originalSize,
      optimizedSize: optimizedImage.optimizedSize,
      sizeReduction: calculateSizeReduction(optimizedImage.originalSize, optimizedImage.optimizedSize),
      format: fileExt,
    })
    setRateLimitHeaders(res.headers, rateResult)
    return res
  } catch (error: unknown) {
    return handleApiError(error, '/upload')
  }
}
