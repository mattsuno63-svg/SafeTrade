'use client'

import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { TournamentCard } from '@/components/homepage/TournamentCard'
import { FeaturedSection } from '@/components/homepage/FeaturedSection'
import { HeroSection } from '@/components/homepage/HeroSection'

// SafeTrade Homepage - Liquid Glass Design iOS 26.1
export default function HomePage() {
  
  return (
    <div className="min-h-screen bg-background-light text-slate-900 selection:bg-primary/30 antialiased">
      {/* Grid Background */}
      <div className="fixed inset-0 grid-background-fade pointer-events-none z-0"></div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />

        <main className="flex-grow">
          {/* Hero Section */}
          <HeroSection />

          {/* Featured Section */}
          <FeaturedSection />

          {/* Categories Section */}
          <section data-section="categories" className="max-w-7xl mx-auto px-6 py-32 relative">
            <div className="flex items-end justify-between mb-16">
              <h2 className="text-4xl font-display font-black tracking-tighter">Esplora gli Universi</h2>
              <Link href="/marketplace" className="text-primary font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
                Tutte le Categorie
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                      <CategoryCard
                        title="Pokemon"
                        subtitle="Eccellenza TCG"
                        count=""
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuA3PdU7cx6XnZMsiV942Vum5vj3iNZ9noVzkZs5HHcFx5JvLlPfHFIMHPN5HlgYlS6MnLgmwu-B-_87NJvIgXr8cFFuuwaj19TwtlUEvo0lSUWwOZmG62hCOFDLefunQxzhvDWusnz_4znGvdYrWCGxU5XVvlydI2zU8l72ynj61xDuBslYap5TWkswR8p3ftD-7Mudfu6U_1JCeIWkgZweDzIM-FNMZULPNacLnAk3bZGAX5VtYLKGnS6sGHOcGaNPGnkdP5IjW-NI"
                        icon="capture"
                        href="/marketplace?game=pokemon"
                        color="primary"
                      />
                      <CategoryCard
                        title="One Piece"
                        subtitle="New World"
                        count=""
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuB3swlRftSVm_TS-s6jVm6iM8GA6IL22iG1H2AOsaFycpsfogYVa5oc0shHa9jZpRjOzop2MYsOAuCxrmZi7shaGvnittuUBlJPLE_A5AyCO4Tr3i2XwXGhSjZhL2_2K_y1UljdwzfeBdux4sS-hZqZZfj3il4CXksRNgF2TRC25i4KrO0Q_ytyvVaIAAla1yNZLSLLK6NugrNj4g6rSAA1XerGUc4jbfBq5cHdHMFkHJUqWavKKnemjWKjemuIc-jMcW5lbQwi5_mO"
                        icon="auto_fix"
                        href="/marketplace?game=onepiece"
                        color="blue"
                      />
                      <CategoryCard
                        title="Magic"
                        subtitle="The Gathering"
                        count=""
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuC0uet5EKpdQwwk1xg24NFMEdpB_7VgD6_wjL99iP3b6Thl8KkFSmxqUZ_GI119LIB3wzOK18e2O9y6cPat15rs03ruIjaBKcw_Ziebgh0FECbYhDQ4olQq9GS5Yo9M6qKtXyQuejDR__pr1uMFo5lmdJYkGoIzSOgusj0AujMhWbXc57M3O-277UubzX6RN1Ba0jE2-X8zUjshL5VfOkAsLjoWgV_-0si8QMjYGJql0kzR83jIoYUUwgzDYBMJjzyxgGvUJRi1nlzX"
                        icon="style"
                        href="/marketplace?game=magic"
                        color="blue"
                      />
                      <CategoryCard
                        title="Yu-Gi-Oh!"
                        subtitle="Duel Monsters"
                        count=""
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuD8nJ0SDOqEnkZCxA_r65EMTQQRw_LHtYMZRRH-E-egkZRv6ear_PBDexuh1ZuIUtkcgVcNDPButwLJ93CExbsrd7toczTeHFQ6G24Io-6E1XroI6GEN-LPHmGKW4QED1_dCHy5iqa8R13DaVlfgoVWH5S1SIEnx9fx6Xzrqg2bWpnkTB7EReSq0B6MDmK0RrZZXgS-KhPqlgWrq8mdyMIbreGvu7CdXxkPW6XkrodFOmjD7i-5yJ13xtBjrefuFqs4hwjlRes_dKLC"
                        icon="style"
                        href="/marketplace?game=yugioh"
                        color="red"
                      />
            </div>
          </section>

          {/* Tournaments Section */}
          <section data-section="tournaments" className="max-w-7xl mx-auto px-6 py-32 relative">
            <div className="flex items-end justify-between mb-16">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary font-bold">trophy</span>
                  <h2 className="text-4xl font-display font-black tracking-tighter">Tornei d'Elite</h2>
                </div>
                <p className="text-slate-500 font-medium ml-9">Competi ai massimi livelli nei circuiti ufficiali.</p>
              </div>
              <Link href="/tournaments" className="text-primary font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity">
                Calendario Completo
              </Link>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <TournamentCard
                        title="Grand Open: Legacy Masters"
                        game="PRO CIRCUIT • MAGIC"
                        date="12 Giu"
                        location="Milano, Italia"
                        players="256 Partecipanti"
                        status="open"
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuC0uet5EKpdQwwk1xg24NFMEdpB_7VgD6_wjL99iP3b6Thl8KkFSmxqUZ_GI119LIB3wzOK18e2O9y6cPat15rs03ruIjaBKcw_Ziebgh0FECbYhDQ4olQq9GS5Yo9M6qKtXyQuejDR__pr1uMFo5lmdJYkGoIzSOgusj0AujMhWbXc57M3O-277UubzX6RN1Ba0jE2-X8zUjshL5VfOkAsLjoWgV_-0si8QMjYGJql0kzR83jIoYUUwgzDYBMJjzyxgGvUJRi1nlzX"
                      />
                      <TournamentCard
                        title="Elite Invitational Series"
                        game="CHAMPIONSHIP • POKEMON"
                        date="28 Lug"
                        location="Roma, Italia"
                        players="€5.000 Montepremi"
                        status="open"
                        image="https://lh3.googleusercontent.com/aida-public/AB6AXuA3PdU7cx6XnZMsiV942Vum5vj3iNZ9noVzkZs5HHcFx5JvLlPfHFIMHPN5HlgYlS6MnLgmwu-B-_87NJvIgXr8cFFuuwaj19TwtlUEvo0lSUWwOZmG62hCOFDLefunQxzhvDWusnz_4znGvdYrWCGxU5XVvlydI2zU8l72ynj61xDuBslYap5TWkswR8p3ftD-7Mudfu6U_1JCeIWkgZweDzIM-FNMZULPNacLnAk3bZGAX5VtYLKGnS6sGHOcGaNPGnkdP5IjW-NI"
                      />
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </div>
  )
}
