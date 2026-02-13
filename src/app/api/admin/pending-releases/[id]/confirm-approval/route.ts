import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createLedgerEntry } from '@/lib/merchant/ledger'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/pending-releases/[id]/confirm-approval
 * 
 * STEP 2 della doppia conferma:
 * - Verifica il token di conferma
 * - Esegue il rilascio fondi
 * - Crea audit log completo
 * - Notifica le parti coinvolte
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Accesso negato. Solo Admin e Moderator possono approvare rilasci.' },
        { status: 403 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { confirmation_token, notes } = body

    if (!confirmation_token) {
      return NextResponse.json(
        { error: 'Token di conferma mancante. Richiedi prima /initiate-approval' },
        { status: 400 }
      )
    }

    // Trova la pending release
    const pendingRelease = await prisma.pendingRelease.findUnique({
      where: { id },
      include: {
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: true,
      },
    })

    if (!pendingRelease) {
      return NextResponse.json(
        { error: 'Richiesta di rilascio non trovata' },
        { status: 404 }
      )
    }

    // Verifica status
    if (pendingRelease.status !== 'PENDING') {
      return NextResponse.json(
        { 
          error: `Questa richiesta è già stata processata (status: ${pendingRelease.status})`,
          currentStatus: pendingRelease.status 
        },
        { status: 400 }
      )
    }

    // Verifica token
    if (pendingRelease.confirmationToken !== confirmation_token) {
      return NextResponse.json(
        { error: 'Token di conferma non valido' },
        { status: 400 }
      )
    }

    // Verifica scadenza token
    if (!pendingRelease.tokenExpiresAt || pendingRelease.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Token di conferma scaduto. Richiedi un nuovo token con /initiate-approval' },
        { status: 400 }
      )
    }

    // Ottieni IP e user agent per audit
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Timestamp per audit (il primo click è approssimato: 5 minuti prima della scadenza del token)
    const firstClickAt = pendingRelease.tokenExpiresAt 
      ? new Date(pendingRelease.tokenExpiresAt.getTime() - 5 * 60 * 1000) 
      : pendingRelease.createdAt
    const confirmClickAt = new Date()

    // Esegui transazione atomica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Aggiorna pending release come APPROVED
      const updatedRelease = await tx.pendingRelease.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: confirmClickAt,
          approvalNotes: notes,
          confirmationToken: null, // Invalida il token
          tokenExpiresAt: null,
        },
      })

      // 2. Crea audit log
      const auditLog = await tx.financialAuditLog.create({
        data: {
          actionType: `${pendingRelease.type}_APPROVED`,
          pendingReleaseId: id,
          orderId: pendingRelease.orderId,
          amount: pendingRelease.amount,
          recipientId: pendingRelease.recipientId,
          performedById: user.id,
          performedByRole: user.role,
          ipAddress,
          userAgent,
          firstClickAt,
          confirmClickAt,
          notes: notes || `Approvato da ${user.name || user.email}`,
        },
      })

      // 3. Ottieni o crea wallet e aggiorna saldo
      const wallet = await getOrCreateWallet(tx, pendingRelease.recipientId)
      const balanceBefore = wallet.balance
      const balanceAfter = balanceBefore + pendingRelease.amount

      // 4. Aggiorna saldo wallet destinatario
      await tx.escrowWallet.update({
        where: { userId: pendingRelease.recipientId },
        data: {
          balance: balanceAfter,
        },
      })

      // 5. Crea transazione wallet per il destinatario (credito)
      await tx.escrowWalletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: pendingRelease.amount,
          type: getWalletTransactionType(pendingRelease.type),
          description: getTransactionDescription(pendingRelease),
          relatedTransactionId: pendingRelease.orderId,
          balanceBefore,
          balanceAfter,
        },
      })

      // 6. Crea notifica per il destinatario
      await tx.notification.create({
        data: {
          userId: pendingRelease.recipientId,
          type: 'funds_released',
          title: 'Fondi ricevuti! 💰',
          message: `Hai ricevuto €${pendingRelease.amount.toFixed(2)} nel tuo wallet SafeTrade.`,
          link: '/wallet',
        },
      })

      // 7. Aggiorna EscrowPayment se presente
      if (pendingRelease.orderId) {
        const escrowPayment = await tx.escrowPayment.findUnique({
          where: { transactionId: pendingRelease.orderId },
        })

        if (escrowPayment) {
          if (pendingRelease.type === 'RELEASE_TO_SELLER' && escrowPayment.status === 'HELD') {
            await tx.escrowPayment.update({
              where: { id: escrowPayment.id },
              data: {
                status: 'RELEASED',
                paymentReleasedAt: confirmClickAt,
              },
            })

            // Aggiorna escrow session
            const session = await tx.escrowSession.findUnique({
              where: { transactionId: pendingRelease.orderId },
            })

            if (session) {
              await tx.escrowSession.update({
                where: { id: session.id },
                data: { status: 'COMPLETED' },
              })
            }
          } else if ((pendingRelease.type === 'REFUND_FULL' || pendingRelease.type === 'REFUND_PARTIAL') && 
                     (escrowPayment.status === 'HELD' || escrowPayment.status === 'PENDING')) {
            await tx.escrowPayment.update({
              where: { id: escrowPayment.id },
              data: {
                status: 'REFUNDED',
                paymentRefundedAt: confirmClickAt,
              },
            })

            // Aggiorna escrow session
            const session = await tx.escrowSession.findUnique({
              where: { transactionId: pendingRelease.orderId },
            })

            if (session) {
              await tx.escrowSession.update({
                where: { id: session.id },
                data: { status: 'CANCELLED' },
              })
            }
          }
        }

        // 8. Se c'è un ordine, aggiornalo
        if (pendingRelease.type === 'RELEASE_TO_SELLER') {
          await tx.safeTradeTransaction.update({
            where: { id: pendingRelease.orderId },
            data: {
              status: 'COMPLETED',
              completedAt: confirmClickAt,
            },
          })
        }

        // 9. MERCHANT LEDGER: Crea voce registro commissioni per trade LOCAL completati
        if (pendingRelease.type === 'RELEASE_TO_SELLER' && pendingRelease.orderId) {
          try {
            // Ottieni la transazione con escrow session e shop
            const txn = await tx.safeTradeTransaction.findUnique({
              where: { id: pendingRelease.orderId },
              include: {
                escrowSession: {
                  select: {
                    totalAmount: true,
                    feePercentage: true,
                    feeAmount: true,
                    feePaidBy: true,
                    paymentMethod: true,
                  },
                },
                escrowPayment: {
                  select: {
                    paymentMethod: true,
                  },
                },
                shop: {
                  select: {
                    id: true,
                    platformFeeShare: true,
                  },
                },
              },
            })

            // Crea ledger entry solo per trade LOCAL con shop
            if (txn && txn.escrowType === 'LOCAL' && txn.shop && txn.escrowSession) {
              const session = txn.escrowSession
              const paymentMethod = txn.escrowPayment?.paymentMethod || session.paymentMethod || 'CASH'

              await createLedgerEntry(tx, {
                shopId: txn.shop.id,
                transactionId: txn.id,
                tradeAmount: session.totalAmount,
                feePercentage: session.feePercentage,
                feeAmount: session.feeAmount,
                feePaidBy: session.feePaidBy,
                platformFeeSharePercent: txn.shop.platformFeeShare,
                paymentMethod,
              })

              // Per trades ONLINE: accredita la quota merchant nel wallet del merchant
              if (paymentMethod === 'ONLINE') {
                const { calculateMerchantFeeSplit } = await import('@/lib/merchant/ledger')
                const split = calculateMerchantFeeSplit(session.feeAmount, txn.shop.platformFeeShare)

                if (split.merchantCut > 0) {
                  // Trova il merchantId del negozio
                  const shopFull = await tx.shop.findUnique({
                    where: { id: txn.shop.id },
                    select: { merchantId: true },
                  })

                  if (shopFull) {
                    const merchantWallet = await getOrCreateWallet(tx, shopFull.merchantId)
                    const mBalanceBefore = merchantWallet.balance
                    const mBalanceAfter = mBalanceBefore + split.merchantCut

                    await tx.escrowWallet.update({
                      where: { userId: shopFull.merchantId },
                      data: { balance: mBalanceAfter },
                    })

                    await tx.escrowWalletTransaction.create({
                      data: {
                        walletId: merchantWallet.id,
                        amount: split.merchantCut,
                        type: 'ESCROW_RELEASE',
                        description: `Commissione merchant - Trade #${txn.id.slice(0, 8)} (${paymentMethod})`,
                        relatedTransactionId: txn.id,
                        balanceBefore: mBalanceBefore,
                        balanceAfter: mBalanceAfter,
                      },
                    })
                  }
                }
              }
            }
          } catch (ledgerError) {
            // Non far fallire l'intera transazione per un errore nel ledger
            // Ma logga per debug
            console.error('[confirm-approval] Error creating ledger entry:', ledgerError)
          }
        }
      }

      return { updatedRelease, auditLog }
    })

    return NextResponse.json({
      success: true,
      status: 'APPROVED',
      message: `✅ Rilascio approvato! €${pendingRelease.amount.toFixed(2)} trasferiti a ${pendingRelease.recipient.name || pendingRelease.recipient.email}`,
      pending_release_id: result.updatedRelease.id,
      audit_log_id: result.auditLog.id,
      amount_released: pendingRelease.amount,
      recipient: {
        id: pendingRelease.recipient.id,
        name: pendingRelease.recipient.name,
        email: pendingRelease.recipient.email,
      },
      approved_by: {
        id: user.id,
        name: user.name,
        role: user.role,
      },
      approved_at: confirmClickAt.toISOString(),
    })
  } catch (error) {
    console.error('Error confirming approval:', error)
    return NextResponse.json(
      { error: 'Errore nella conferma dell\'approvazione' },
      { status: 500 }
    )
  }
}

// Helper: Ottieni o crea wallet per utente
async function getOrCreateWallet(tx: any, userId: string) {
  let wallet = await tx.escrowWallet.findUnique({
    where: { userId },
  })

  if (!wallet) {
    wallet = await tx.escrowWallet.create({
      data: {
        userId,
        balance: 0,
      },
    })
  }

  return wallet
}

// Helper: Tipo transazione wallet
function getWalletTransactionType(releaseType: string): 'ESCROW_RELEASE' | 'ESCROW_REFUND' | 'DEPOSIT' {
  switch (releaseType) {
    case 'RELEASE_TO_SELLER':
    case 'HUB_COMMISSION':
      return 'ESCROW_RELEASE'
    case 'REFUND_FULL':
    case 'REFUND_PARTIAL':
      return 'ESCROW_REFUND'
    case 'WITHDRAWAL':
      return 'DEPOSIT' // Prelievo è trattato come deposito nel wallet
    default:
      return 'ESCROW_RELEASE'
  }
}

// Helper: Descrizione transazione
function getTransactionDescription(pendingRelease: any): string {
  const typeLabels: Record<string, string> = {
    RELEASE_TO_SELLER: 'Pagamento vendita',
    REFUND_FULL: 'Rimborso completo',
    REFUND_PARTIAL: 'Rimborso parziale',
    HUB_COMMISSION: 'Commissione Hub',
    WITHDRAWAL: 'Prelievo',
  }

  const typeLabel = typeLabels[pendingRelease.type] || 'Transazione'
  
  if (pendingRelease.orderId) {
    return `${typeLabel} - Ordine #${pendingRelease.orderId.slice(0, 8)}`
  }
  
  return typeLabel
}

