import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { optimizeImageFile, getFileExtension, calculateSizeReduction } from '@/lib/image-optimization'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Valida tipo file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Ottimizza immagine prima del caricamento
    let optimizedImage: { buffer: Buffer; mimeType: string; originalSize: number; optimizedSize: number }
    try {
      optimizedImage = await optimizeImageFile(file, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 80,
        format: 'auto',
      })

      console.log(`📸 Image optimized: ${(optimizedImage.originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedImage.optimizedSize / 1024 / 1024).toFixed(2)}MB (${calculateSizeReduction(optimizedImage.originalSize, optimizedImage.optimizedSize)}% reduction)`)
    } catch (optimizeError: any) {
      console.error('Optimization error:', optimizeError)
      return NextResponse.json(
        { error: optimizeError.message || 'Failed to optimize image' },
        { status: 400 }
      )
    }

    // Generate unique filename with optimized extension
    const fileExt = getFileExtension(optimizedImage.mimeType)
    const fileName = `listings/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const bucketName = 'safetrade-images'

    // Convert Buffer to Blob for Supabase upload
    // Convert Buffer to Uint8Array first for proper TypeScript compatibility
    const uint8Array = new Uint8Array(optimizedImage.buffer)
    const optimizedBlob = new Blob([uint8Array], { type: optimizedImage.mimeType })

    // Upload optimized image to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, optimizedBlob, {
        cacheControl: '31536000', // 1 year cache (images are immutable)
        upsert: false,
        contentType: optimizedImage.mimeType,
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: publicUrl,
      path: data.path,
      originalSize: optimizedImage.originalSize,
      optimizedSize: optimizedImage.optimizedSize,
      sizeReduction: calculateSizeReduction(optimizedImage.originalSize, optimizedImage.optimizedSize),
      format: fileExt,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


