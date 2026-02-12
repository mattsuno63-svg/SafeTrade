import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'portelli.mattiaa@gmail.com'

async function main() {
  console.log('🔒 Impostazione admin: solo', ADMIN_EMAIL)

  // 1. Rimuovi ADMIN da tutti tranne il tuo account
  const demoted = await prisma.user.updateMany({
    where: {
      role: 'ADMIN',
      email: { not: ADMIN_EMAIL },
    },
    data: { role: 'USER' },
  })
  if (demoted.count > 0) {
    console.log('⚠️ Ruolo ADMIN rimosso da', demoted.count, 'altro/i utente/i')
  }

  // 2. Trova il tuo utente
  const user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  })

  if (!user) {
    console.error('❌ Utente non trovato:', ADMIN_EMAIL)
    console.error('   Registrati prima con questa email, poi riesegui lo script.')
    return
  }

  console.log('✅ Utente trovato:', user.email, '— ruolo attuale:', user.role)

  const updatedUser = user.role === 'ADMIN'
    ? user
    : await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: { role: 'ADMIN' },
      })

  console.log('✅ Ruolo finale:', updatedUser.role)

  // Check if shop exists
  let shop = await prisma.shop.findUnique({
    where: { merchantId: user.id },
  })

  if (!shop) {
    // Create shop for the user
    shop = await prisma.shop.create({
      data: {
        name: 'Admin Shop',
        description: 'Shop for admin testing purposes',
        address: 'Via Admin 1',
        city: 'Milano',
        phone: '+39 123 456 7890',
        merchantId: user.id,
        isApproved: true, // Auto-approved for admin
      },
    })
    console.log('✅ Shop created:', shop.name)
  } else {
    console.log('✅ Shop already exists:', shop.name)
    // Update shop to be approved
    shop = await prisma.shop.update({
      where: { id: shop.id },
      data: { isApproved: true },
    })
    console.log('✅ Shop approved')
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
  console.log('\n🎉 Setup completato!')
  console.log('Admin nel DB:', adminCount, '(solo', ADMIN_EMAIL, ')')
  console.log('User:', updatedUser.email, '| Role:', updatedUser.role)
  console.log('Shop:', shop.name, '| Approved:', shop.isApproved)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

