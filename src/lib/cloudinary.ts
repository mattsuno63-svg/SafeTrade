import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * Upload image to Cloudinary with optimization
 * Returns optimized URL
 */
export async function uploadImage(
  file: File | Buffer,
  folder: string = 'safetrade'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [
          {
            width: 1200,
            height: 1200,
            crop: 'limit',
            quality: 'auto:good',
            format: 'auto', // Auto-format (WebP when supported)
          },
        ],
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result?.secure_url || '')
        }
      }
    )

    if (file instanceof File) {
      file.arrayBuffer().then((buffer) => {
        uploadStream.end(Buffer.from(buffer))
      })
    } else {
      uploadStream.end(file)
    }
  })
}

/**
 * Upload multiple images
 */
export async function uploadImages(
  files: File[],
  folder: string = 'safetrade'
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadImage(file, folder))
  return Promise.all(uploadPromises)
}

/**
 * Get optimized image URL from Cloudinary
 */
export function getOptimizedImageUrl(
  publicId: string,
  width?: number,
  height?: number
): string {
  const transformations: string[] = []
  
  if (width) transformations.push(`w_${width}`)
  if (height) transformations.push(`h_${height}`)
  
  transformations.push('q_auto:good', 'f_auto')
  
  return cloudinary.url(publicId, {
    transformation: transformations,
  })
}

/**
 * Delete image from Cloudinary
 */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

