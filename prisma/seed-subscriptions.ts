import { PrismaClient, SubscriptionTier } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding subscription plans...')

  // Create subscription plans
  const plans = [
    {
      name: 'FREE',
      tier: SubscriptionTier.FREE,
      description: 'Piano gratuito per iniziare',
      priceMonthly: 0,
      priceYearly: 0,
      earlyAccessHours: 0,
      maxAlerts: 3,
      prioritySafeTrade: false,
      instantNotifications: false,
      premiumCommunity: false,
      bulkListingTools: false,
      priorityMonthlyLimit: 0,
    },
    {
      name: 'PREMIUM',
      tier: SubscriptionTier.PREMIUM,
      description: 'Per collezionisti seri e scalper - Early Access 24h, notifiche istantanee, community premium',
      priceMonthly: 9.99,
      priceYearly: 99.99, // 2 mesi gratis
      earlyAccessHours: 24,
      maxAlerts: 20,
      prioritySafeTrade: true,
      instantNotifications: true,
      premiumCommunity: true,
      bulkListingTools: false,
      priorityMonthlyLimit: 5, // 5 priority SafeTrades gratis al mese
    },
    {
      name: 'PRO',
      tier: SubscriptionTier.PRO,
      description: 'Per professionisti - Tutto Premium + Alert illimitati, SMS, bulk tools, priority illimitata',
      priceMonthly: 19.99,
      priceYearly: 199.99, // 2 mesi gratis
      earlyAccessHours: 48, // 48h head start
      maxAlerts: -1, // Unlimited (-1)
      prioritySafeTrade: true,
      instantNotifications: true,
      premiumCommunity: true,
      bulkListingTools: true,
      priorityMonthlyLimit: -1, // Unlimited (-1)
    },
  ]

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    })
    console.log(`✅ Plan "${plan.name}" created/updated`)
  }

  // Create premium community topics
  const premiumTopics = [
    {
      slug: 'insider-intel',
      name: '💎 Insider Intel',
      description: 'Drop alerts anticipati, restock tips, informazioni esclusive per membri Premium',
      icon: 'diamond',
      isPremiumOnly: true,
      requiredTier: 'PREMIUM',
    },
    {
      slug: 'high-value-trades',
      name: '💰 High Value Trades',
      description: 'Discussioni su carte €500+ - Solo per PRO members',
      icon: 'payments',
      isPremiumOnly: true,
      requiredTier: 'PRO',
    },
    {
      slug: 'market-analysis',
      name: '📊 Market Analysis',
      description: 'Grafici, previsioni e analisi di mercato',
      icon: 'analytics',
      isPremiumOnly: true,
      requiredTier: 'PREMIUM',
    },
  ]

  for (const topic of premiumTopics) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      update: topic,
      create: topic,
    })
    console.log(`✅ Premium topic "${topic.name}" created/updated`)
  }

  // Create badges for subscription tiers
  const badges = [
    {
      name: 'Premium Member',
      description: 'Membro Premium attivo',
      icon: 'workspace_premium',
      color: '#FFD700', // Gold
    },
    {
      name: 'PRO Member',
      description: 'Membro PRO attivo',
      icon: 'verified',
      color: '#9B59B6', // Purple
    },
    {
      name: 'Founder',
      description: 'Tra i primi 100 membri Premium',
      icon: 'military_tech',
      color: '#E74C3C', // Red
    },
    {
      name: 'Trusted Member',
      description: 'Karma > 100 - Membro affidabile della community',
      icon: 'verified_user',
      color: '#27AE60', // Green
    },
    {
      name: 'Community Leader',
      description: 'Karma > 500 - Leader della community',
      icon: 'shield',
      color: '#3498DB', // Blue
    },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { name: badge.name },
      update: badge,
      create: badge,
    })
    console.log(`✅ Badge "${badge.name}" created/updated`)
  }

  console.log('\n🎉 Subscription seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

