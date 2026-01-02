import { createClient } from './supabase/client'

const BUCKET_NAME = 'safetrade-images'

/**
 * Upload image to Supabase Storage with optimization
 * Returns public URL
 */
export async function uploadImage(
  file: File,
  folder: string = 'listings'
): Promise<string> {
  const supabase = createClient()
  
  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  
  // Upload file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  files: File[],
  folder: string = 'listings'
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, folder))
  return Promise.all(uploadPromises)
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImage(filePath: string): Promise<void> {
  const supabase = createClient()
  
  // Extract path from URL
  const path = filePath.split(`${BUCKET_NAME}/`)[1]
  
  if (!path) {
    throw new Error('Invalid file path')
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Get optimized image URL
 * Note: Supabase Storage doesn't have built-in transformations,
 * but you can use Next.js Image component for optimization
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number
): string {
  // For now, return original URL
  // In production, you might want to use a CDN or image optimization service
  return url
}

