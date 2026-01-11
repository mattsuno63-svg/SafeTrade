import { PrismaClient, DisputeType, DisputeStatus, SafeTradeStatus, EscrowPaymentStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Creando transazione e disputa di test...')

  try {
    // 1. Trova o crea utenti di test
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, email: true }
    })

    if (!admin) {
      console.log('❌ Nessun admin trovato nel database.')
      return
    }

    console.log(`✅ Admin trovato: ${admin.name || admin.email} (${admin.id})`)

    // Trova un altro utente o crea un utente di test
    let buyer = await prisma.user.findFirst({
      where: {
        id: { not: admin.id },
        role: 'USER'
      },
      select: { id: true, name: true, email: true }
    })

    if (!buyer) {
      console.log('📝 Creando utente buyer di test...')
      buyer = await prisma.user.create({
        data: {
          email: `test-buyer-${Date.now()}@test.com`,
          passwordHash: '$2a$10$test',
          name: 'Test Buyer',
          role: 'USER'
        },
        select: { id: true, name: true, email: true }
      })
      console.log(`✅ Buyer creato: ${buyer.email}`)
    }

    let seller = await prisma.user.findFirst({
      where: {
        id: { not: admin.id },
        id: { not: buyer.id },
        role: 'MERCHANT'
      },
      select: { id: true, name: true, email: true }
    })

    if (!seller) {
      console.log('📝 Creando utente seller di test...')
      seller = await prisma.user.create({
        data: {
          email: `test-seller-${Date.now()}@test.com`,
          passwordHash: '$2a$10$test',
          name: 'Test Seller',
          role: 'MERCHANT'
        },
        select: { id: true, name: true, email: true }
      })
      console.log(`✅ Seller creato: ${seller.email}`)
    }

    // 2. Crea o trova una transazione di test
    let transaction = await prisma.safeTradeTransaction.findFirst({
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
          select: { id: true, name: true, email: true }
        },
        userB: {
          select: { id: true, name: true, email: true }
        },
        escrowPayment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!transaction) {
      console.log('📝 Creando transazione di test...')
      
      // Crea transazione
      transaction = await prisma.safeTradeTransaction.create({
        data: {
          userAId: buyer.id, // Buyer
          userBId: seller.id, // Seller
          status: 'CONFIRMED' as SafeTradeStatus,
          scheduledDate: new Date(),
          notes: 'Transazione di test per disputa demo'
        },
        include: {
          userA: {
            select: { id: true, name: true, email: true }
          },
          userB: {
            select: { id: true, name: true, email: true }
          },
          escrowPayment: true
        }
      })

      console.log(`✅ Transazione creata: ${transaction.id}`)

      // Crea escrow payment
      const escrowPayment = await prisma.escrowPayment.create({
        data: {
          transactionId: transaction.id,
          amount: 100.00,
          status: 'HELD' as EscrowPaymentStatus,
          paymentHeldAt: new Date()
        }
      })

      console.log(`✅ Escrow payment creato: ${escrowPayment.id} (€${escrowPayment.amount})`)

      // Rileggiamo la transazione con escrow payment
      transaction = await prisma.safeTradeTransaction.findUnique({
        where: { id: transaction.id },
        include: {
          userA: {
            select: { id: true, name: true, email: true }
          },
          userB: {
            select: { id: true, name: true, email: true }
          },
          escrowPayment: true
        }
      })!

      console.log(`✅ Transazione completa: ${transaction.id}`)
    } else {
      console.log(`✅ Transazione esistente trovata: ${transaction.id}`)
    }

    console.log(`   - Buyer: ${transaction.userA.name || transaction.userA.email}`)
    console.log(`   - Seller: ${transaction.userB.name || transaction.userB.email}`)
    console.log(`   - Status: ${transaction.status}`)

    // 3. Crea una disputa di test come buyer (userA)
    const sellerResponseDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 ore

    const dispute = await prisma.dispute.create({
      data: {
        transactionId: transaction.id,
        type: 'DAMAGED_CARDS' as DisputeType,
        status: 'OPEN' as DisputeStatus,
        title: 'Disputa Demo - Carte Danneggiate',
        description: 'Questa è una disputa di test creata per verificare il sistema. Le carte sono arrivate danneggiate durante il trasporto. Questa è una descrizione di esempio per testare il sistema di dispute.',
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
    console.log(`   - Titolo: ${dispute.title}`)
    console.log(`   - Aperta da: ${dispute.openedBy.name || dispute.openedBy.email}`)
    console.log(`   - Deadline risposta seller: ${sellerResponseDeadline.toLocaleString('it-IT')}`)
    console.log(`\n🔗 URL disputa: /disputes/${dispute.id}`)
    console.log(`🔗 URL admin disputes: /admin/disputes`)

    // 4. Crea notifica admin
    await prisma.adminNotification.create({
      data: {
        type: 'DISPUTE_OPENED',
        referenceType: 'DISPUTE',
        referenceId: dispute.id,
        title: '⚠️ Nuova disputa aperta (DEMO)',
        message: `Disputa #${dispute.id.slice(0, 8)} - ${dispute.title}. Tipo: ${dispute.type}. Aperta da ${dispute.openedBy.name || dispute.openedBy.email}.`,
        targetRoles: ['ADMIN', 'MODERATOR'],
        priority: 'HIGH'
      }
    })

    console.log('\n✅ Notifica admin creata!')
    console.log('\n✨ Test completato con successo!')

  } catch (error) {
    console.error('❌ Errore:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

