import { PrismaClient, UserRole, CardGame, CardCondition, ListingType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@safetrade.it' },
    update: {},
    create: {
      email: 'admin@safetrade.it',
      passwordHash: '$2a$10$placeholder', // In production, use proper hashing
      name: 'Admin SafeTrade',
      role: UserRole.ADMIN,
      city: 'Milano',
    },
  })

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'collezionista1@test.it' },
    update: {},
    create: {
      email: 'collezionista1@test.it',
      passwordHash: '$2a$10$placeholder',
      name: 'Mario Rossi',
      role: UserRole.USER,
      city: 'Roma',
    },
  })

  const user2 = await prisma.user.upsert({
    where: { email: 'collezionista2@test.it' },
    update: {},
    create: {
      email: 'collezionista2@test.it',
      passwordHash: '$2a$10$placeholder',
      name: 'Luigi Verdi',
      role: UserRole.USER,
      city: 'Napoli',
    },
  })

  // Create merchant
  const merchant = await prisma.user.upsert({
    where: { email: 'negozio@test.it' },
    update: {},
    create: {
      email: 'negozio@test.it',
      passwordHash: '$2a$10$placeholder',
      name: 'Game Store Milano',
      role: UserRole.MERCHANT,
      city: 'Milano',
    },
  })

  // Create shop
  const shop = await prisma.shop.upsert({
    where: { merchantId: merchant.id },
    update: {},
    create: {
      name: 'Game Store Milano',
      description: 'Il tuo negozio di fiducia per carte collezionabili a Milano',
      address: 'Via Roma 123',
      city: 'Milano',
      postalCode: '20100',
      phone: '+39 02 1234567',
      rating: 4.8,
      ratingCount: 42,
      merchantId: merchant.id,
      apiKey: `sk_test_${Math.random().toString(36).substring(7)}`,
    },
  })

  // Create products for shop
  const products = [
    {
      title: 'Pikachu VMAX - Champions Path',
      description: 'Carta rara Pikachu VMAX in condizioni Near Mint',
      price: 45.99,
      condition: CardCondition.NEAR_MINT,
      game: CardGame.POKEMON,
      set: 'Champions Path',
      cardNumber: '20/73',
      rarity: 'Ultra Rare',
      language: 'IT',
      images: [],
      stock: 2,
      shopId: shop.id,
    },
    {
      title: 'Charizard GX - Hidden Fates',
      description: 'Charizard GX in condizioni Excellent',
      price: 89.50,
      condition: CardCondition.EXCELLENT,
      game: CardGame.POKEMON,
      set: 'Hidden Fates',
      cardNumber: '9/68',
      rarity: 'Secret Rare',
      language: 'EN',
      images: [],
      stock: 1,
      shopId: shop.id,
    },
    {
      title: 'Black Lotus - Alpha',
      description: 'Leggendaria Black Lotus in condizioni Played',
      price: 15000.00,
      condition: CardCondition.PLAYED,
      game: CardGame.MAGIC,
      set: 'Alpha',
      rarity: 'Rare',
      language: 'EN',
      images: [],
      stock: 1,
      shopId: shop.id,
    },
  ]

  for (const product of products) {
    await prisma.product.create({
      data: product,
    })
  }

  // Create P2P listings
  const listings = [
    {
      title: 'Blastoise Base Set - Cerca Pikachu',
      description: 'Blastoise Base Set in ottime condizioni, cerco Pikachu Base Set o altre carte interessanti',
      type: ListingType.TRADE,
      condition: CardCondition.NEAR_MINT,
      game: CardGame.POKEMON,
      set: 'Base Set',
      cardNumber: '2/102',
      rarity: 'Rare',
      language: 'IT',
      images: [],
      wants: 'Pikachu Base Set, Charizard Base Set, o altre carte rare Pokemon',
      userId: user1.id,
    },
    {
      title: 'Blue Eyes White Dragon - Yu-Gi-Oh',
      description: 'Vendo o scambio Blue Eyes White Dragon',
      type: ListingType.BOTH,
      price: 25.00,
      condition: CardCondition.EXCELLENT,
      game: CardGame.YUGIOH,
      set: 'Legend of Blue Eyes',
      cardNumber: '001',
      rarity: 'Ultra Rare',
      language: 'IT',
      images: [],
      userId: user2.id,
    },
  ]

  for (const listing of listings) {
    await prisma.listingP2P.create({
      data: listing,
    })
  }

  console.log('✅ Seeding completed!')
  console.log(`   - Created ${await prisma.user.count()} users`)
  console.log(`   - Created ${await prisma.shop.count()} shops`)
  console.log(`   - Created ${await prisma.product.count()} products`)
  console.log(`   - Created ${await prisma.listingP2P.count()} listings`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })

