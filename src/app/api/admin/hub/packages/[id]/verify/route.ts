import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, HubPackageStatus, CardCondition } from '@prisma/client'
import { optimizeImageFile, getFileExtension } from '@/lib/image-optimization'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/hub/packages/[id]/verify
 * Hub Staff completa verifica con foto e note
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)

    // SECURITY: Only HUB_STAFF and ADMIN can verify
    if (user.role !== 'HUB_STAFF' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo HUB_STAFF e ADMIN possono verificare i pacchi' },
        { status: 403 }
      )
    }

    // SECURITY: Parse form data safely
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Errore nel parsing dei dati del form' },
        { status: 400 }
      )
    }

    const photos = formData.getAll('photos') as File[]
    const notes = formData.get('notes') as string | null
    const result = formData.get('result') as 'PASSED' | 'FAILED'
    const conditionVerified = formData.get('conditionVerified') as string | null
    const priceFinalStr = formData.get('priceFinal') as string | null
    const priceFinal = priceFinalStr ? parseFloat(priceFinalStr) : null

    // SECURITY: Validate priceFinal if provided
    if (priceFinal !== null && (isNaN(priceFinal) || priceFinal < 0 || priceFinal > 100000)) {
      return NextResponse.json(
        { error: 'Prezzo finale non valido. Deve essere tra 0 e 100,000' },
        { status: 400 }
      )
    }

    // SECURITY: Validate result
    if (result !== 'PASSED' && result !== 'FAILED') {
      return NextResponse.json(
        { error: 'result deve essere PASSED o FAILED' },
        { status: 400 }
      )
    }

    // SECURITY: Minimum 3 photos required
    if (!photos || photos.length < 3) {
      return NextResponse.json(
        { error: 'Minimo 3 foto obbligatorie per la verifica' },
        { status: 400 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: true,
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify status is correct
    if (transaction.status !== SafeTradeStatus.VERIFICATION_IN_PROGRESS) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}` },
        { status: 400 }
      )
    }

    // SECURITY: Verify packageStatus is correct
    if (transaction.packageStatus !== HubPackageStatus.VERIFICATION_IN_PROGRESS) {
      return NextResponse.json(
        { error: `Stato pacco non valido. Stato attuale: ${transaction.packageStatus}` },
        { status: 400 }
      )
    }

    // Upload and optimize photos
    const photoPaths: string[] = []
    const photosMetadata: any[] = []
    const supabase = await createClient()

    for (const photo of photos) {
      try {
        // Optimize image (resize + compression)
        const optimizedImage = await optimizeImageFile(photo, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 80,
          format: 'auto',
        })

        // Generate unique filename
        const fileExt = getFileExtension(optimizedImage.mimeType)
        const fileName = `verified-escrow/${id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = 'safetrade-images'

        // Convert Buffer to Blob for Supabase upload
        const uint8Array = new Uint8Array(optimizedImage.buffer)
        const optimizedBlob = new Blob([uint8Array], { type: optimizedImage.mimeType })

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, optimizedBlob, {
            cacheControl: '31536000',
            upsert: false,
            contentType: optimizedImage.mimeType,
          })

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(uploadData.path)

        photoPaths.push(publicUrl)
        photosMetadata.push({
          originalName: photo.name,
          originalSize: photo.size,
          optimizedSize: optimizedImage.optimizedSize,
          uploadedAt: new Date().toISOString(),
        })
      } catch (error: any) {
        console.error('Error uploading photo:', error)
        return NextResponse.json(
          { error: `Errore nel caricamento della foto: ${photo.name}. ${error.message}` },
          { status: 500 }
        )
      }
    }

    const now = new Date()

    // Update transaction based on result
    if (result === 'PASSED') {
      const updatedTransaction = await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          packageStatus: HubPackageStatus.VERIFICATION_PASSED,
          status: SafeTradeStatus.VERIFICATION_PASSED,
          packageVerifiedAt: now,
          verificationPhotos: photoPaths,
          verificationNotes: notes || null,
          conditionVerified: conditionVerified as CardCondition || null,
          priceFinal: priceFinal || null,
        },
      })

      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: transaction.userBId, // Seller
            type: 'TRANSACTION_UPDATED',
            title: '✅ Verifica Completata',
            message: `La verifica della carta è stata completata con successo. Il pacco verrà rispedito all'acquirente.`,
            link: `/transaction/${id}/status`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: transaction.userAId, // Buyer
            type: 'TRANSACTION_UPDATED',
            title: '✅ Verifica Completata',
            message: `La verifica della carta è stata completata con successo. Il pacco verrà rispedito a breve.`,
            link: `/transaction/${id}/status`,
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        transaction: updatedTransaction,
        photosMetadata,
      })
    } else {
      // VERIFICATION_FAILED
      const updatedTransaction = await prisma.safeTradeTransaction.update({
        where: { id },
        data: {
          packageStatus: HubPackageStatus.VERIFICATION_FAILED,
          status: SafeTradeStatus.VERIFICATION_FAILED,
          packageVerifiedAt: now,
          verificationPhotos: photoPaths,
          verificationNotes: notes || null,
        },
      })

      // Create PendingRelease for refund
      await prisma.pendingRelease.create({
        data: {
          orderId: id,
          type: 'REFUND_FULL',
          amount: transaction.escrowPayment?.amount || 0,
          recipientId: transaction.userAId, // Buyer gets refund
          recipientType: 'BUYER',
          reason: `Verifica fallita: ${notes || 'Carta non conforme alla descrizione'}`,
          triggeredBy: 'VERIFICATION_FAILED',
          triggeredAt: now,
        },
      })

      // Create notifications
      await Promise.all([
        prisma.notification.create({
          data: {
            userId: transaction.userBId, // Seller
            type: 'TRANSACTION_UPDATED',
            title: '❌ Verifica Fallita',
            message: `La verifica della carta è fallita. Il pacco verrà restituito. Motivo: ${notes || 'Non specificato'}`,
            link: `/transaction/${id}/status`,
          },
        }),
        prisma.notification.create({
          data: {
            userId: transaction.userAId, // Buyer
            type: 'TRANSACTION_UPDATED',
            title: '❌ Verifica Fallita',
            message: `La verifica della carta è fallita. Il rimborso è stato richiesto.`,
            link: `/transaction/${id}/status`,
          },
        }),
        // Admin notification for refund approval
        prisma.adminNotification.create({
          data: {
            type: 'PENDING_RELEASE',
            referenceType: 'PENDING_RELEASE',
            referenceId: id,
            title: `Rimborso Richiesto - Verifica Fallita`,
            message: `Verifica fallita per transazione ${id.slice(0, 8)}. Rimborso di €${(transaction.escrowPayment?.amount || 0).toFixed(2)} richiesto.`,
            priority: 'HIGH',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        }),
      ])

      return NextResponse.json({
        success: true,
        transaction: updatedTransaction,
        photosMetadata,
        refundRequested: true,
      })
    }
  } catch (error: any) {
    console.error('Error verifying package:', error)
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    )
  }
}

