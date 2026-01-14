import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { cache } from 'react'
import { prisma } from '@/lib/db'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ChatWidget } from '@/components/contact/ChatWidget'
import Link from 'next/link'

// Cache this page for 60 seconds
export const revalidate = 60

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

// Use React.cache to deduplicate queries between generateMetadata and component
const getShopData = cache(async (slug: string) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { slug },
      include: {
        merchant: {
          select: {
            name: true,
            email: true,
            avatar: true,
          }
        },
        promotions: {
          where: {
            isActive: true,
            endDate: { gte: new Date() }
          },
          orderBy: { startDate: 'desc' },
          take: 1
        },
        tournaments: {
          where: {
            date: { gte: new Date() },
            status: { in: ['PUBLISHED', 'REGISTRATION_CLOSED'] }
          },
          orderBy: { date: 'asc' },
          take: 3
        },
      }
    })

    if (!shop) return null

    // Fetch listings separately
    const listings = await prisma.listingP2P.findMany({
      where: {
        userId: shop.merchantId,
        isActive: true,
        isApproved: true,
        isSold: false
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    })

    return { shop, listings }
  } catch (error) {
    console.error('Error fetching shop data:', error)
    return null
  }
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getShopData(slug)
  if (!data) return { title: 'Negozio non trovato' }

  return {
    title: `${data.shop.name} - SafeTrade`,
    description: data.shop.description || 'Visita il nostro negozio su SafeTrade',
  }
}

export default async function ShopPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getShopData(slug)

  if (!data) {
    notFound()
  }

  const { shop, listings } = data
  const activePromo = shop.promotions[0]

  // Parse opening hours
  let openingHours = null
  try {
    if (shop.openingHours) {
      openingHours = JSON.parse(shop.openingHours)
    }
  } catch (e) {
    console.error('Error parsing opening hours', e)
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-text-primary dark:text-white font-display">
      <Header />

      {/* Hero Section */}
      <div className="relative h-[300px] md:h-[400px]">
        {/* Cover Image */}
        <div className="absolute inset-0 z-0 text-white">
          {shop.coverImage ? (
            <Image
              src={shop.coverImage}
              alt="Cover"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-800 to-gray-900" />
          )}
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>

        {/* Floating Profile Card - Container */}
        <div className="container mx-auto px-4 h-full relative z-10">
          <div className="absolute -bottom-16 left-4 md:left-8 w-[calc(100%-2rem)] md:w-auto md:min-w-[500px] max-w-2xl">
            <Card className="glass-panel p-6 border-0 shadow-2xl backdrop-blur-xl bg-white/90 dark:bg-gray-900/90 rounded-2xl">
              <div className="flex items-start gap-4 md:gap-6">
                {/* Logo */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-md flex-shrink-0 bg-gray-100 dark:bg-gray-800 relative">
                  {shop.logo ? (
                    <Image
                      src={shop.logo}
                      alt="Logo"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-400">
                      {shop.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl md:text-3xl font-bold truncate">{shop.name}</h1>
                    {shop.isApproved && (
                      <span className="material-symbols-outlined text-blue-500 fill-current" title="Verified Merchant">verified</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1 text-yellow-500 font-bold">
                      <span className="material-symbols-outlined text-lg">star</span>
                      {shop.rating.toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{shop.ratingCount} Reviews</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-lg">location_on</span>
                      {shop.city || 'Italia'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {/* Tags - static for now or derived */}
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Pokemon</Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Magic</Badge>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <Button className="flex-1 bg-orange-600 hover:bg-orange-700 text-white rounded-full font-bold">
                  <span className="material-symbols-outlined mr-2">directions</span>
                  Ottieni Indicazioni
                </Button>
                <Button variant="outline" className="rounded-full border-gray-300 dark:border-gray-600">
                  <span className="material-symbols-outlined mr-2">call</span>
                  Contatta
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <span className="material-symbols-outlined">share</span>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-12">

            {/* Exclusive Offering Banner */}
            {activePromo && (
              <section>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-sm border border-orange-200 dark:border-orange-800/30">
                  <div>
                    <span className="text-orange-600 dark:text-orange-400 font-bold tracking-wider text-sm mb-2 block uppercase">
                      Offerta Esclusiva
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold mb-2">
                      {activePromo.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-lg">
                      {activePromo.description || `Approfitta dello sconto del ${activePromo.discountValue}${activePromo.discountType === 'PERCENTAGE' ? '%' : '€'} sui nostri prodotti selezionati.`}
                    </p>
                    <Button className="bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-full px-8">
                      Scopri di più
                      <span className="material-symbols-outlined ml-2 text-sm">arrow_forward</span>
                    </Button>
                  </div>
                  <div className="hidden md:flex items-center justify-center w-24 h-24 bg-orange-500 rounded-full text-white shadow-lg rotate-12">
                    <span className="material-symbols-outlined text-5xl">local_offer</span>
                  </div>
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500">trophy</span>
                  <h2 className="text-xl font-bold">Prossimi Eventi</h2>
                </div>
                <Link href="#" className="text-sm text-primary hover:underline">Vedi Calendario Completo</Link>
              </div>

              {shop.tournaments.length > 0 ? (
                <div className="space-y-4">
                  {shop.tournaments.map((tournament) => (
                    <Card key={tournament.id} className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                      <div className="flex flex-col items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex-shrink-0">
                        <span className="text-xs font-bold text-gray-500 uppercase">
                          {new Date(tournament.date).toLocaleDateString('it-IT', { month: 'short' })}
                        </span>
                        <span className="text-2xl font-bold">
                          {new Date(tournament.date).getDate()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">{tournament.game}</Badge>
                          <span className="text-sm text-gray-500">{tournament.time}</span>
                        </div>
                        <h3 className="font-bold text-lg">{tournament.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {tournament.entryFee ? `Iscrizione: €${tournament.entryFee}` : 'Gratuito'} • {tournament.maxParticipants} posti max
                        </p>
                      </div>
                      <Button variant="outline" className="rounded-full">Registrati</Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed">
                  <p className="text-gray-500">Nessun evento in programma al momento.</p>
                </div>
              )}
            </section>

            {/* Exclusive Collector Items */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">diamond</span>
                  <h2 className="text-xl font-bold">Articoli da Collezione</h2>
                </div>
                <Link href={`/search?seller=${shop.merchantId}`} className="text-sm text-primary hover:underline">
                  Vedi Tutti
                </Link>
              </div>

              {listings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {listings.map((item) => (
                    <Link key={item.id} href={`/listings/${item.id}`} className="group">
                      <Card className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors h-full">
                        <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {item.images[0] && (
                            <Image
                              src={item.images[0]}
                              alt={item.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          <Badge className="absolute top-1 right-1 text-[10px] bg-black/70 px-1 py-0 h-5">
                            {item.condition}
                          </Badge>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{item.game}</span>
                          </div>
                          <h3 className="font-bold text-lg mb-1 truncate group-hover:text-primary transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xl text-orange-600 dark:text-orange-400">
                              €{item.price?.toFixed(2)}
                            </span>
                            <Button size="sm" className="rounded-full bg-orange-600 hover:bg-orange-700 h-8 px-4">
                              Acquista
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-gray-500">Nessun articolo disponibile al momento.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar (Right) */}
          <div className="space-y-6">

            {/* Gallery Preview */}
            {shop.images.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-orange-500 text-sm">photo_library</span>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Galleria</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
                  <div className="col-span-2 h-40 bg-gray-200 dark:bg-gray-800 relative">
                    <Image src={shop.images[0]} fill className="object-cover" alt="Shop 1" />
                  </div>
                  {shop.images.slice(1, 3).map((img, i) => (
                    <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 relative">
                      <Image src={img} fill className="object-cover" alt={`Shop ${i + 2}`} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Opening Hours */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-orange-500">schedule</span>
                <h3 className="font-bold">Orari di Apertura</h3>
              </div>

              <div className="space-y-3 text-sm">
                {openingHours ? (
                  Object.entries(openingHours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="capitalize text-gray-600 dark:text-gray-400">{day}</span>
                      <span className={`font-medium ${hours.closed ? 'text-red-500' : ''}`}>
                        {hours.closed ? 'Chiuso' : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">Orari non disponibili</p>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between text-sm">
                <span className="text-gray-500">Stato attuale</span>
                <span className="text-green-500 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Aperto ora
                </span>
              </div>
            </Card>

            {/* Location Map */}
            <Card className="p-0 overflow-hidden relative group">
              <div className="h-48 bg-gray-200 dark:bg-gray-800 relative">
                {/* Mock Map Image/Frame */}
                <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Milan,Italy&zoom=13&size=400x200&sensor=false')] bg-cover bg-center opacity-50"></div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <Button variant="secondary" className="shadow-lg backdrop-blur-sm bg-white/80 dark:bg-black/50 hover:bg-white">
                    <span className="material-symbols-outlined mr-2">map</span>
                    Apri Mappa
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                <h4 className="font-bold text-sm mb-1">La nostra posizione</h4>
                <p className="text-sm text-gray-500 mb-2">
                  {shop.address}, {shop.city}
                </p>
                <Link href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.address} ${shop.city}`)}`} target="_blank" className="text-xs text-primary font-medium hover:underline flex items-center">
                  Vedi su Google Maps
                  <span className="material-symbols-outlined text-[14px] ml-1">open_in_new</span>
                </Link>
              </div>
            </Card>

            {/* Chat Widget */}
            <ChatWidget />

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
