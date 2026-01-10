import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { TournamentCard } from '@/components/homepage/TournamentCard'
import { FeaturedSection } from '@/components/homepage/FeaturedSection'

// SafeTrade Homepage - Updated for Vercel deployment
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display antialiased">
      {/* Ambient Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px] dark:bg-primary/5"></div>
        <div className="absolute top-[40%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-400/10 blur-[100px] dark:bg-blue-900/10"></div>
        <div className="absolute bottom-[-10%] left-[30%] h-[500px] w-[500px] rounded-full bg-purple-400/10 blur-[100px] dark:bg-purple-900/10"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-grow">
          {/* Hero Section */}
          <section className="relative pt-16 pb-16 md:pt-24 md:pb-20 overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col items-center text-center">
                {/* Badge */}
                <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary backdrop-blur-md">
                  <span className="mr-2 flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  New: Verified Grading Service
                </div>

                {/* Main Heading */}
                <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight text-text-primary dark:text-white sm:text-7xl mb-6 leading-tight">
                  Collect with <br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-primary to-orange-600 bg-clip-text text-transparent">
                    Passion & Trust
                  </span>
                </h1>

                {/* Description */}
                <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-300 mb-10 leading-relaxed">
                  The premium marketplace for Pokemon, Magic, and Yu-Gi-Oh cards.
                  Experience the safest way to buy, sell, and trade your favorite collectibles with 100% authenticity guaranteed.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Button 
                    size="lg"
                    className="h-14 px-8 rounded-full bg-primary text-lg font-bold text-white shadow-xl shadow-primary/30 hover:bg-primary-dark hover:shadow-primary/50 hover:-translate-y-0.5 transition-all w-full sm:w-auto flex items-center justify-center gap-2"
                  >
                    Start Collecting
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 rounded-full bg-white/50 backdrop-blur-xl border border-white/60 text-lg font-bold text-text-primary shadow-lg hover:bg-white/80 hover:border-white transition-all w-full sm:w-auto dark:bg-white/10 dark:border-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    List a Card
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Featured Section */}
          <FeaturedSection />

          {/* Categories Section */}
          <section className="py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-text-primary dark:text-white">Explore Categories</h2>
                <a href="/marketplace" className="text-sm font-bold text-primary hover:text-primary-dark hidden sm:block">
                  View All
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CategoryCard
                  title="Pokemon"
                  subtitle="TCG & Collectibles"
                  count="12k+ Items"
                  image="https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&q=80"
                  icon="capture"
                  href="/marketplace?game=pokemon"
                  color="primary"
                />
                <CategoryCard
                  title="Magic"
                  subtitle="The Gathering"
                  count="8k+ Items"
                  image="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80"
                  icon="auto_fix"
                  href="/marketplace?game=magic"
                  color="blue"
                />
                <CategoryCard
                  title="Yu-Gi-Oh!"
                  subtitle="Duel Monsters"
                  count="5k+ Items"
                  image="https://images.unsplash.com/photo-1560419015-7c427e8ae5ba?w=800&q=80"
                  icon="style"
                  href="/marketplace?game=yugioh"
                  color="red"
                />
              </div>
            </div>
          </section>

          {/* Tournaments Section */}
          <section className="py-12 relative">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    Live Events
                  </div>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-text-primary dark:text-white">
                    Upcoming Tournaments
                  </h2>
                  <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
                    Join official tournaments and local meetups near you.
                  </p>
                </div>
                <a href="/tournaments" className="group flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark">
                  View Full Calendar
                  <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: '18px' }}>arrow_forward</span>
                </a>
              </div>
              <div className="mb-8 flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-text-primary px-5 text-sm font-medium text-white shadow-md transition dark:bg-white dark:text-black">
                  All Games
                </button>
                <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/60 px-5 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                  Pokemon TCG
                </button>
                <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/60 px-5 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                  Magic: The Gathering
                </button>
                <button className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/60 px-5 text-sm font-medium text-text-primary shadow-sm backdrop-blur-md transition hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                  Yu-Gi-Oh!
                </button>
              </div>
              <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-6 overflow-x-auto pb-12 pt-4 hide-scrollbar snap-x snap-mandatory">
                  <TournamentCard
                    title="Sunday Standard Showdown"
                    game="Pokemon TCG"
                    date="Oct 24, 14:00"
                    location="Milan, IT • GameStore"
                    players="32/64 Players"
                    status="open"
                    image="https://lh3.googleusercontent.com/aida-public/AB6AXuB_Wym8QnkannN3miSmw0TY8vPwanNYswBL0IF-OrWjLu8b-CVso0bddwe7adcS9aWjR6UekdqqsWKAZ83DAkTles8yO0UZU6HQFuJ0QHh2vvovIWkFDE33UM0-6kMX7zoO96mZbYjcYGCqzr30GWVeX8Yv0RmaNgYPF3wXpV5i-3UMVP002rzu6VOzuGjrp6dCJjIdlciJR_yZ1YNURVVp9dJu4uD5AbDSXPVIH2ofz6lLP3zKaM6897urEtG8GikanKu6q6RUc7LC"
                  />
                  <TournamentCard
                    title="Friday Night Magic"
                    game="Magic: The Gathering"
                    date="Oct 22, 19:00"
                    location="Rome, IT • CardShop"
                    players="16/32 Players"
                    status="open"
                    image="https://lh3.googleusercontent.com/aida-public/AB6AXuDBAqCIWggDLuQm6KhfZmibzVeDrX0gxc2GbX2j6LS6MlhRgP5MLh-A_sTD7oum1UJ_4MBL7lVNEoOMlGFZkb7F-Zj8DjBNCZidtMZRCWbp9jA170PJIMeuF5tBLgP8KW9utuu95YHLhf4pPnlW4-omUHrR7tkrHWnOoOoNUYkxYrs7YVYiU0OxwI__JQoXwZdli8AmPOaySnQ8PLIfLYSU-HC9aWjljeFI3EBuh-FqTW4dM6LnbMrahJ4qmgYxy-VlOwMz0beln59x"
                  />
                  <TournamentCard
                    title="Yu-Gi-Oh Regional"
                    game="Yu-Gi-Oh!"
                    date="Oct 28, 10:00"
                    location="Turin, IT • Arena"
                    players="64/64 Players"
                    status="full"
                    image="https://lh3.googleusercontent.com/aida-public/AB6AXuCfDIEQWBUG9QnhZpgMy7Z54oQalo6D0PionMFCWYa37nso-Xe5bCJk4YM2-CcgqIq_VrPl9ihSeRzWyxDFr3NOY6UkD4TqM8Wyb8Pc6ASpvzgBUiVnuuuTRyMyStYD4LxlzUjgQRlJUNzE0czt5O9_Wqvtr-RdAfoqOV_1FAYlLJ4l08wMb3DlZr7lGsgWShgl1_xLOhIKkw2GfwKdMh4cSDskMyhCuZ4b_D124g3wDHRZDjwV3iwe199w0wV4VuYbklhP723eixE-"
                  />
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  )
}
