'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { FeaturedListingsGrid } from '@/components/marketplace/FeaturedListingsGrid'
import { AllListingsGrid } from '@/components/marketplace/AllListingsGrid'
import { AnimatedOrbs } from '@/components/marketplace/AnimatedOrbs'
import { DemoCardsSection } from '@/components/marketplace/DemoCardsSection'

export default function MarketplacePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background-light text-text-primary dark:bg-background-dark dark:text-white font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -right-[10%] h-[800px] w-[800px] rounded-full bg-primary/10 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[100px]"></div>
        <AnimatedOrbs count={6} />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Marketplace</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse thousands of collectible cards from verified sellers.
              </p>
            </div>

            {/* Categories */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Esplora Categorie</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <CategoryCard
                  title="Pokemon"
                  subtitle="TCG & Collectibles"
                  count="12k+ Items"
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuB_Wym8QnkannN3miSmw0TY8vPwanNYswBL0IF-OrWjLu8b-CVso0bddwe7adcS9aWjR6UekdqqsWKAZ83DAkTles8yO0UZU6HQFuJ0QHh2vvovIWkFDE33UM0-6kMX7zoO96mZbYjcYGCqzr30GWVeX8Yv0RmaNgYPF3wXpV5i-3UMVP002rzu6VOzuGjrp6dCJjIdlciJR_yZ1YNURVVp9dJu4uD5AbDSXPVIH2ofz6lLP3zKaM6897urEtG8GikanKu6q6RUc7LC"
                  icon="capture"
                  href="/listings?game=pokemon"
                  color="primary"
                />
                <CategoryCard
                  title="Magic"
                  subtitle="The Gathering"
                  count="8k+ Items"
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuDBAqCIWggDLuQm6KhfZmibzVeDrX0gxc2GbX2j6LS6MlhRgP5MLh-A_sTD7oum1UJ_4MBL7lVNEoOMlGFZkb7F-Zj8DjBNCZidtMZRCWbp9jA170PJIMeuF5tBLgP8KW9utuu95YHLhf4pPnlW4-omUHrR7tkrHWnOoOoNUYkxYrs7YVYiU0OxwI__JQoXwZdli8AmPOaySnQ8PLIfLYSU-HC9aWjljeFI3EBuh-FqTW4dM6LnbMrahJ4qmgYxy-VlOwMz0beln59x"
                  icon="auto_fix"
                  href="/listings?game=magic"
                  color="blue"
                />
                <CategoryCard
                  title="Yu-Gi-Oh!"
                  subtitle="Duel Monsters"
                  count="5k+ Items"
                  image="https://lh3.googleusercontent.com/aida-public/AB6AXuCfDIEQWBUG9QnhZpgMy7Z54oQalo6D0PionMFCWYa37nso-Xe5bCJk4YM2-CcgqIq_VrPl9ihSeRzWyxDFr3NOY6UkD4TqM8Wyb8Pc6ASpvzgBUiVnuuuTRyMyStYD4LxlzUjgQRlJUNzE0czt5O9_Wqvtr-RdAfoqOV_1FAYlLJ4l08wMb3DlZr7lGsgWShgl1_xLOhIKkw2GfwKdMh4cSDskMyhCuZ4b_D124g3wDHRZDjwV3iwe199w0wV4VuYbklhP723eixE-"
                  icon="style"
                  href="/listings?game=yugioh"
                  color="red"
                />
              </div>
            </div>

            {/* Demo Cards Section */}
            <DemoCardsSection />

            {/* Featured Listings - 3 in Vetrina */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">⭐ In Vetrina</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Carte premium selezionate per te
                  </p>
                </div>
                <a 
                  href="/featured-listings" 
                  className="text-sm font-bold text-primary hover:text-primary-dark transition-colors flex items-center gap-1 group"
                >
                  Tutte le carte in vetrina
                  <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </a>
              </div>
              <FeaturedListingsGrid />
            </div>

            {/* All Cards Section */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Tutte le Carte</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Esplora l'intero catalogo di carte disponibili
                </p>
              </div>
              <AllListingsGrid />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

