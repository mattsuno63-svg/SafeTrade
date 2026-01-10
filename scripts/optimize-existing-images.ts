/**
 * Script per ottimizzare immagini esistenti su Supabase Storage
 * 
 * USAGE:
 *   tsx scripts/optimize-existing-images.ts [bucket] [folder]
 * 
 * ESEMPIO:
 *   tsx scripts/optimize-existing-images.ts safetrade-images listings
 * 
 * ATTENZIONE: Questo script:
 * - Scarica immagini esistenti
 * - Le ottimizza
 * - Le ricarica con nuovo nome
 * - NON elimina le originali (fai manualmente dopo verifica)
 */

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { optimizeImage, getFileExtension } from '../src/lib/image-optimization'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface OptimizationResult {
  originalPath: string
  optimizedPath: string
  originalSize: number
  optimizedSize: number
  reduction: number
  success: boolean
  error?: string
}

async function optimizeExistingImages(bucket: string, folder: string = '') {
  console.log(`🚀 Starting optimization for bucket: ${bucket}, folder: ${folder || 'root'}`)

  // Lista tutte le immagini nel bucket/folder
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'asc' },
    })

  if (listError) {
    console.error('❌ Error listing files:', listError)
    return
  }

  if (!files || files.length === 0) {
    console.log('ℹ️  No files found')
    return
  }

  console.log(`📁 Found ${files.length} files`)

  // Filtra solo immagini
  const imageFiles = files.filter(
    (f) =>
      f.name.match(/\.(jpg|jpeg|png|webp)$/i) &&
      !f.name.includes('-optimized') // Skip già ottimizzate
  )

  console.log(`🖼️  Found ${imageFiles.length} images to optimize\n`)

  const results: OptimizationResult[] = []
  let processed = 0

  for (const file of imageFiles) {
    processed++
    const filePath = folder ? `${folder}/${file.name}` : file.name
    console.log(`[${processed}/${imageFiles.length}] Processing: ${filePath}`)

    try {
      // Download originale
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(filePath)

      if (downloadError || !fileData) {
        results.push({
          originalPath: filePath,
          optimizedPath: '',
          originalSize: file.metadata?.size || 0,
          optimizedSize: 0,
          reduction: 0,
          success: false,
          error: downloadError?.message || 'Download failed',
        })
        console.log(`  ❌ Download failed: ${downloadError?.message}`)
        continue
      }

      const buffer = Buffer.from(await fileData.arrayBuffer())
      const originalSize = buffer.length

      // Ottimizza
      const optimizedBuffer = await optimizeImage(buffer, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 80,
        format: 'auto',
      })

      const optimizedSize = optimizedBuffer.length
      const reduction = Math.round(((originalSize - optimizedSize) / originalSize) * 100)

      // Se riduzione < 10%, skip (probabilmente già ottimizzata)
      if (reduction < 10) {
        console.log(`  ⏭️  Skipped (only ${reduction}% reduction)`)
        results.push({
          originalPath: filePath,
          optimizedPath: filePath,
          originalSize,
          optimizedSize,
          reduction,
          success: false,
          error: 'Reduction too small',
        })
        continue
      }

      // Determina nuovo nome file
      const extension = getFileExtension('image/webp') // Assume WebP per ottimizzate
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      const optimizedPath = folder
        ? `${folder}/${nameWithoutExt}-optimized.${extension}`
        : `${nameWithoutExt}-optimized.${extension}`

      // Upload ottimizzata
      const blob = new Blob([optimizedBuffer], { type: 'image/webp' })
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(optimizedPath, blob, {
          cacheControl: '31536000',
          contentType: 'image/webp',
        })

      if (uploadError) {
        results.push({
          originalPath: filePath,
          optimizedPath: '',
          originalSize,
          optimizedSize,
          reduction,
          success: false,
          error: uploadError.message,
        })
        console.log(`  ❌ Upload failed: ${uploadError.message}`)
        continue
      }

      results.push({
        originalPath: filePath,
        optimizedPath,
        originalSize,
        optimizedSize,
        reduction,
        success: true,
      })

      console.log(
        `  ✅ Optimized: ${(originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimizedSize / 1024 / 1024).toFixed(2)}MB (${reduction}% reduction)`
      )
    } catch (error: any) {
      results.push({
        originalPath: filePath,
        optimizedPath: '',
        originalSize: file.metadata?.size || 0,
        optimizedSize: 0,
        reduction: 0,
        success: false,
        error: error.message,
      })
      console.log(`  ❌ Error: ${error.message}`)
    }

    // Rate limiting: pausa ogni 10 immagini
    if (processed % 10 === 0) {
      console.log('⏸️  Pausing 2 seconds...\n')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }

  // Report finale
  console.log('\n' + '='.repeat(60))
  console.log('📊 OPTIMIZATION REPORT')
  console.log('='.repeat(60))

  const successful = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  console.log(`✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)

  if (successful.length > 0) {
    const totalOriginalSize = successful.reduce((sum, r) => sum + r.originalSize, 0)
    const totalOptimizedSize = successful.reduce((sum, r) => sum + r.optimizedSize, 0)
    const avgReduction =
      successful.reduce((sum, r) => sum + r.reduction, 0) / successful.length

    console.log(`\n📦 Storage Saved:`)
    console.log(`  Original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Optimized: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Saved: ${((totalOriginalSize - totalOptimizedSize) / 1024 / 1024).toFixed(2)} MB`)
    console.log(`  Average reduction: ${avgReduction.toFixed(1)}%`)
  }

  if (failed.length > 0) {
    console.log(`\n❌ Failed files:`)
    failed.forEach((r) => {
      console.log(`  - ${r.originalPath}: ${r.error}`)
    })
  }

  console.log('\n⚠️  IMPORTANT:')
  console.log('  - Optimized images have been uploaded with "-optimized" suffix')
  console.log('  - Original images have NOT been deleted')
  console.log('  - Review optimized images manually before deleting originals')
  console.log('  - Update database references to use optimized paths')
}

// Main
const bucket = process.argv[2] || 'safetrade-images'
const folder = process.argv[3] || 'listings'

optimizeExistingImages(bucket, folder)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })

