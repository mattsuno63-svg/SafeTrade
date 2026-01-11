import { PrismaClient, DisputeType, DisputeStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Cercando transazioni esistenti...')

  // Trova una transazione che possa avere una disputa
  // (status CONFIRMED o COMPLETED, con escrow payment)
  const transaction = await prisma.safeTradeTransaction.findFirst({
    where: {
      status: {
        in: ['CONFIRMED', 'COMPLETED']
      },
      escrowPayment: {
        isNot: null
      },
      disputes: {
        none: {
          status: {
            in: ['OPEN', 'SELLER_RESPONSE', 'IN_MEDIATION', 'ESCALATED']
          }
        }
      }
    },
    include: {
      userA: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      userB: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      escrowPayment: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  if (!transaction) {
    console.log('❌ Nessuna transazione trovata per creare una disputa di test.')
    console.log('💡 Suggerimento: Crea prima una transazione completata o in progress.')
    return
  }

  console.log(`✅ Transazione trovata: ${transaction.id}`)
  console.log(`   - Buyer: ${transaction.userA.name || transaction.userA.email}`)
  console.log(`   - Seller: ${transaction.userB.name || transaction.userB.email}`)
  console.log(`   - Status: ${transaction.status}`)

  // Crea una disputa di test come buyer (userA)
  const sellerResponseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 ore

  const dispute = await prisma.dispute.create({
    data: {
      transactionId: transaction.id,
      type: 'DAMAGED_CARDS' as DisputeType,
      status: 'OPEN' as DisputeStatus,
      title: 'Disputa di Test - Carte Danneggiate',
      description: 'Questa è una disputa di test creata per verificare il sistema. Le carte sono arrivate danneggiate durante il trasporto.',
      openedById: transaction.userAId, // Buyer apre la disputa
      photos: [],
      sellerResponseDeadline,
      openedAt: new Date()
    },
    include: {
      openedBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      transaction: {
        select: {
          id: true,
          status: true
        }
      }
    }
  })

  console.log('\n✅ Disputa di test creata con successo!')
  console.log(`   - ID: ${dispute.id}`)
  console.log(`   - Tipo: ${dispute.type}`)
  console.log(`   - Stato: ${dispute.status}`)
  console.log(`   - Aperta da: ${dispute.openedBy.name || dispute.openedBy.email}`)
  console.log(`   - Deadline risposta seller: ${sellerResponseDeadline.toLocaleString('it-IT')}`)
  console.log(`\n🔗 URL disputa: /disputes/${dispute.id}`)
  console.log(`🔗 URL admin disputes: /admin/disputes`)

  // Crea notifica admin
  await prisma.adminNotification.create({
    data: {
      type: 'DISPUTE_OPENED',
      referenceType: 'DISPUTE',
      referenceId: dispute.id,
      title: '⚠️ Nuova disputa aperta (TEST)',
      message: `Disputa #${dispute.id.slice(0, 8)} - ${dispute.title}. Tipo: ${dispute.type}. Aperta da ${dispute.openedBy.name || dispute.openedBy.email}.`,
      targetRoles: ['ADMIN', 'MODERATOR'],
      priority: 'HIGH'
    }
  })

  console.log('\n✅ Notifica admin creata!')
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

