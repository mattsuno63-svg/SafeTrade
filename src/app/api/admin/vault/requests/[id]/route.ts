import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createVaultAuditLog } from '@/lib/vault/audit'
import { generateSlotQRToken } from '@/lib/vault/qr-generator'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/vault/requests/[id]
 * Approva o rifiuta una richiesta teca Vault
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = 'then' in params ? await params : params
    const { id } = resolvedParams
    const body = await request.json()
    const { status, adminNotes } = body

    // Verifica che l'utente sia admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'HUB_STAFF') {
      return NextResponse.json(
        { error: 'Accesso admin richiesto' },
        { status: 403 }
      )
    }

    // Valida status
    if (!['APPROVED', 'REJECTED', 'PAID'].includes(status)) {
      return NextResponse.json(
        { error: 'Status non valido. Usa APPROVED, REJECTED o PAID' },
        { status: 400 }
      )
    }

    // Recupera la richiesta
    const vaultRequest = await prisma.vaultCaseRequest.findUnique({
      where: { id },
      include: {
        shop: true,
        requestedByUser: true,
      },
    })

    if (!vaultRequest) {
      return NextResponse.json(
        { error: 'Richiesta non trovata' },
        { status: 404 }
      )
    }

    // Se si sta confermando il pagamento, la richiesta deve essere APPROVED con paymentStatus PENDING
    if (status === 'PAID') {
      if (vaultRequest.status !== 'APPROVED' || vaultRequest.paymentStatus !== 'PENDING') {
        return NextResponse.json(
          { error: 'La richiesta deve essere APPROVED con pagamento PENDING per confermare il pagamento' },
          { status: 400 }
        )
      }
    } else if (vaultRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Questa richiesta è già stata processata' },
        { status: 400 }
      )
    }

    // Aggiorna la richiesta
    const updateData: any = {
      adminNotes: adminNotes || null,
    }

    if (status === 'APPROVED') {
      updateData.status = 'APPROVED'
      updateData.approvedAt = new Date()
    } else if (status === 'REJECTED') {
      updateData.status = 'REJECTED'
      updateData.rejectedAt = new Date()
    } else if (status === 'PAID') {
      updateData.status = 'PAID'
      updateData.paymentStatus = 'PAID'
      updateData.paidAt = new Date()
    }

    const updated = await prisma.vaultCaseRequest.update({
      where: { id },
      data: updateData,
    })

    // Invia notifiche al merchant
    if (status === 'APPROVED') {
      await prisma.notification.create({
        data: {
          userId: vaultRequest.requestedBy,
          type: 'VAULT_CASE_APPROVED',
          title: 'Richiesta Teca Vault Approvata! 🎉',
          message: `La tua richiesta per una teca Vault per "${vaultRequest.shop.name}" è stata approvata. Puoi ora procedere con il pagamento.`,
          link: '/merchant/vault/requests',
        },
      })
    } else if (status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: vaultRequest.requestedBy,
          type: 'VAULT_CASE_REJECTED',
          title: 'Richiesta Teca Vault Rifiutata',
          message: `La tua richiesta per una teca Vault per "${vaultRequest.shop.name}" non è stata approvata.${adminNotes ? ` Motivo: ${adminNotes}` : ''}`,
          link: '/merchant/vault/requests',
        },
      })
    } else if (status === 'PAID') {
      // Crea e autorizza la teca per lo shop
      try {
        // Crea nuova teca con 30 slot
        const newCase = await prisma.vaultCase.create({
          data: {
            shopId: vaultRequest.shopId,
            authorizedShopId: vaultRequest.shopId,
            status: 'IN_SHOP_ACTIVE',
            label: `Teca ${vaultRequest.shop.name}`,
            slots: {
              create: Array.from({ length: 30 }, (_, i) => {
                const slotNum = i + 1
                const slotCode = `S${String(slotNum).padStart(2, '0')}`
                return {
                  slotCode,
                  qrToken: '', // Will be set after
                  status: 'FREE',
                }
              }),
            },
          },
          include: {
            slots: true,
          },
        })

        // Generate QR tokens for all slots
        if (newCase.slots && newCase.slots.length > 0) {
          await Promise.all(
            newCase.slots.map(async (slot) => {
              const qrToken = generateSlotQRToken(newCase.id, slot.slotCode)
              await prisma.vaultCaseSlot.update({
                where: { id: slot.id },
                data: { qrToken },
              })
            })
          )
        }

        // Update shop to authorize vault case
        await prisma.shop.update({
          where: { id: vaultRequest.shopId },
          data: {
            vaultCaseAuthorized: true,
          },
        })

        // Update request status to COMPLETED
        await prisma.vaultCaseRequest.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        })

        // Audit log
        await createVaultAuditLog({
          actionType: 'CASE_CREATED',
          performedBy: user,
          caseId: newCase.id,
          newValue: { shopId: vaultRequest.shopId, authorized: true },
          notes: `Teca creata e autorizzata per negozio ${vaultRequest.shop.name} dopo conferma pagamento`,
        })

        // Notifica merchant
        await prisma.notification.create({
          data: {
            userId: vaultRequest.requestedBy,
            type: 'VAULT_CASE_PAID',
            title: 'Pagamento Confermato e Teca Attiva! ✅',
            message: `Il pagamento per la teca Vault di "${vaultRequest.shop.name}" è stato confermato. La tua teca è stata creata e autorizzata. Puoi ora iniziare a utilizzarla!`,
            link: '/merchant/vault/requests',
          },
        })
      } catch (caseError: any) {
        console.error('Error creating vault case:', caseError)
        // Non fallire la conferma pagamento se la creazione teca fallisce
        // L'admin può creare la teca manualmente
        await prisma.notification.create({
          data: {
            userId: vaultRequest.requestedBy,
            type: 'VAULT_CASE_PAID',
            title: 'Pagamento Confermato! ✅',
            message: `Il pagamento per la teca Vault di "${vaultRequest.shop.name}" è stato confermato. La teca sarà preparata a breve.`,
            link: '/merchant/vault/requests',
          },
        })
      }
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error: any) {
    console.error('Error updating vault request:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

