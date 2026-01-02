import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'portelli.mattiaa@gmail.com'
  
  console.log('🔍 Looking for user:', email)
  
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    console.error('❌ User not found!')
    return
  }

  console.log('✅ User found:', user.email, 'Current role:', user.role)

  // Keep user as ADMIN (ADMIN can access everything via requireRole)
  // But we'll create a shop so they can test merchant features
  const updatedUser = user.role === 'ADMIN' 
    ? user 
    : await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      })
  
  console.log('✅ User role:', updatedUser.role)

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

  console.log('\n🎉 Setup complete!')
  console.log('User:', updatedUser.email)
  console.log('Role:', updatedUser.role)
  console.log('Shop:', shop.name)
  console.log('Shop Approved:', shop.isApproved)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

