import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canPerformAction, canCompleteVerification } from '@/lib/escrow/state-machine'
import { transitionSessionStatus, createAuditEvent, parseUserRole } from '@/lib/escrow/session-utils'
import { optimizeImage } from '@/lib/image-optimization'
import { handleApiError } from '@/lib/api-error'

/**
 * POST /api/escrow/sessions/[sessionId]/verification
 * Merchant verification: avvia o completa verifica con foto
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await requireAuth()
    const { sessionId } = params

    // Verify user is merchant
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo il merchant può eseguire la verifica' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, photos, notes, status } = body

    // Get session
    const session = await prisma.escrowSession.findUnique({
      where: { id: sessionId },
      include: {
        verificationReport: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 })
    }

    // Verify merchant owns this session
    if (session.merchantId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorizzato a gestire questa sessione' },
        { status: 403 }
      )
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined
    const userRole = parseUserRole(user.role) || 'MERCHANT'

    // Handle different actions
    if (action === 'START') {
      // Start verification
      const canStart = canPerformAction(session.status, 'START_VERIFICATION', userRole)
      if (!canStart.valid) {
        return NextResponse.json(
          { error: canStart.reason || 'Impossibile avviare verifica' },
          { status: 400 }
        )
      }

      const result = await transitionSessionStatus(
        sessionId,
        'VERIFICATION_IN_PROGRESS',
        user.id,
        userRole,
        { ipAddress, userAgent }
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Errore nell\'avvio verifica' }, { status: 400 })
      }

      // Create or update verification report
      await prisma.verificationReport.upsert({
        where: { sessionId },
        create: {
          sessionId,
          status: 'IN_PROGRESS',
          verifiedById: user.id,
        },
        update: {
          status: 'IN_PROGRESS',
          verifiedById: user.id,
        },
      })

      await createAuditEvent(sessionId, 'VERIFICATION_STARTED', user.id, userRole, {
        oldStatus: session.status,
        newStatus: 'VERIFICATION_IN_PROGRESS',
        ipAddress,
        userAgent,
      })

      return NextResponse.json({ success: true, message: 'Verifica avviata' })
    }

    if (action === 'COMPLETE') {
      // Complete verification (PASSED or FAILED)
      if (!status || !['PASSED', 'FAILED'].includes(status)) {
        return NextResponse.json(
          { error: 'status deve essere PASSED o FAILED' },
          { status: 400 }
        )
      }

      // Validate photos (minimum 3 required for PASSED)
      const photoCount = Array.isArray(photos) ? photos.length : 0
      if (status === 'PASSED') {
        const photoValidation = canCompleteVerification(photoCount)
        if (!photoValidation.valid) {
          return NextResponse.json(
            { error: photoValidation.reason || 'Foto insufficienti' },
            { status: 400 }
          )
        }
      }

      // Validate status transition
      const canComplete = canPerformAction(session.status, status === 'PASSED' ? 'PASS_VERIFICATION' : 'FAIL_VERIFICATION', userRole)
      if (!canComplete.valid) {
        return NextResponse.json(
          { error: canComplete.reason || 'Impossibile completare verifica' },
          { status: 400 }
        )
      }

      // Process and upload photos if provided
      let uploadedPhotos: string[] = []
      let photosMetadata: any[] = []

      if (Array.isArray(photos) && photos.length > 0) {
        // TODO: Implement photo upload and optimization
        // For now, assume photos are already uploaded URLs
        uploadedPhotos = photos
      }

      const newStatus = status === 'PASSED' ? 'VERIFICATION_PASSED' : 'VERIFICATION_FAILED'

      const result = await transitionSessionStatus(
        sessionId,
        newStatus,
        user.id,
        userRole,
        { ipAddress, userAgent }
      )

      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Errore nel completamento verifica' }, { status: 400 })
      }

      // Update verification report
      await prisma.verificationReport.update({
        where: { sessionId },
        data: {
          status: status === 'PASSED' ? 'PASSED' : 'FAILED',
          verificationPhotos: uploadedPhotos,
          photosMetadata: photosMetadata.length > 0 ? photosMetadata : undefined,
          notes: notes || null,
          verifiedAt: new Date(),
          verifiedById: user.id,
        },
      })

      await createAuditEvent(sessionId, `VERIFICATION_${status}`, user.id, userRole, {
        oldStatus: session.status,
        newStatus,
        metadata: { photoCount, notes },
        ipAddress,
        userAgent,
      })

      return NextResponse.json({
        success: true,
        message: `Verifica ${status === 'PASSED' ? 'superata' : 'fallita'}`,
      })
    }

    return NextResponse.json(
      { error: 'action deve essere START o COMPLETE' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in verification:', error)
    return handleApiError(error, 'escrow-sessions-id-verification')
  }
}

