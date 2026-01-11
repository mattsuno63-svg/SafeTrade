import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { CategoryCard } from '@/components/homepage/CategoryCard'
import { TournamentCard } from '@/components/homepage/TournamentCard'
import { FeaturedSection } from '@/components/homepage/FeaturedSection'

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
          <header className="relative w-screen h-screen min-h-screen overflow-hidden flex items-center justify-center">
            {/* Hero Grid Background */}
            <div className="absolute inset-0 hero-grid-fade grid-background-fade pointer-events-none z-0"></div>
            
            {/* Ecosystem Vault Background */}
            <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none">
              <div className="ecosystem-vault scale-100 opacity-80 relative overflow-hidden flex items-center justify-center border-white/60">
                {/* Energy Cores */}
                <div className="energy-core bg-primary -translate-x-48 -translate-y-32 shadow-glow-orange scale-150"></div>
                <div className="energy-core bg-blue-500 translate-x-48 translate-y-16 scale-125"></div>
                <div className="energy-core bg-purple-500 -translate-x-16 translate-y-48 scale-110"></div>
                <div className="energy-core bg-emerald-400 translate-x-32 -translate-y-48 scale-100"></div>
                
                {/* Geometric Shapes */}
                <div className="absolute w-80 h-80 border-[3px] border-primary/30 rounded-[30%] rotate-[15deg] backdrop-blur-xl flex items-center justify-center">
                  <div className="w-64 h-64 border border-white/40 rounded-[20%] rotate-[10deg] flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary/40 text-9xl opacity-20">shield</span>
                  </div>
                </div>
                
                {/* Decorative Glass Panes */}
                <div className="absolute w-16 h-16 bg-white/20 backdrop-blur-md border border-white/50 -translate-x-64 translate-y-32 rotate-45"></div>
                <div className="absolute w-12 h-12 bg-primary/10 backdrop-blur-sm border border-primary/30 translate-x-72 -translate-y-16 -rotate-12"></div>
                
                {/* Dotted Pattern */}
                <svg className="absolute w-full h-full opacity-40" viewBox="0 0 100 100">
                  <circle cx="25" cy="25" fill="#FF6B35" r="0.6"></circle>
                  <circle cx="75" cy="15" fill="#3B82F6" r="0.8"></circle>
                  <circle cx="35" cy="85" fill="#8B5CF6" r="0.7"></circle>
                  <circle cx="65" cy="45" fill="#FF6B35" r="1.2"></circle>
                  <circle cx="15" cy="65" fill="#10B981" r="0.5"></circle>
                  <circle cx="85" cy="75" fill="#F59E0B" r="0.9"></circle>
                </svg>
              </div>
              
              {/* Etched Glass Panes */}
              <div className="etched-pane w-[600px] h-[400px] -top-32 -left-32 rotate-[-12deg] rounded-4xl z-[1] shadow-holo-gold border-r-white/70 border-t-white/70">
                <div className="absolute inset-0 etched-texture opacity-30"></div>
                <div className="absolute top-4 right-4 text-[8px] font-black text-white/20 tracking-[0.4em] uppercase">SafeTrade Micro-Etching V2</div>
              </div>
              <div className="etched-pane w-[500px] h-[700px] top-1/2 -right-32 -translate-y-1/2 rotate-[8deg] rounded-4xl z-[1] shadow-holo-cyan border-l-white/70 border-b-white/70">
                <div className="absolute inset-0 etched-texture opacity-25"></div>
              </div>
            </div>

            {/* Hero Content */}
            <div className="max-w-5xl mx-auto text-center relative z-20">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 bg-white/80 px-6 py-2.5 rounded-full border border-white/50 mb-12 backdrop-blur-xl shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(255,107,53,0.8)]"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Standard di Scambio Verificati</span>
              </div>

              {/* Main Heading */}
              <h1 className="text-7xl md:text-[110px] font-display font-black tracking-tighter mb-12 leading-[0.85] text-slate-900">
                Colleziona con<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-orange-400">Passione e Fiducia</span>
              </h1>

              {/* Description */}
              <p className="text-lg md:text-xl text-slate-500 mb-16 max-w-2xl mx-auto font-medium leading-relaxed tracking-tight">
                L'ecosistema definitivo per i professionisti del TCG. 
                Sicurezza di grado militare fusa con l'eleganza Liquid Glass dell'era iOS 26.1.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/marketplace">
                  <Button className="w-full sm:w-auto px-14 py-6 bg-primary text-white font-black rounded-2xl shadow-liquid hover:shadow-liquid-hover hover:-translate-y-1.5 transition-all flex items-center justify-center gap-3 group">
                    Entra nel Mercato
                    <span className="material-symbols-outlined font-bold group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </Button>
                </Link>
                <Link href="/sell">
                  <Button variant="outline" className="w-full sm:w-auto px-14 py-6 bg-white/40 backdrop-blur-3xl text-slate-900 font-black rounded-2xl border border-white/80 hover:bg-white/90 transition-all">
                    Invia per Gradazione
                  </Button>
                </Link>
              </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-4 opacity-40">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Scorri</span>
              <div className="w-6 h-10 border-2 border-slate-300 rounded-full flex justify-center p-1.5">
                <div className="w-1 h-2 bg-primary rounded-full"></div>
              </div>
            </div>
          </header>

          {/* Featured Section */}
          <FeaturedSection />

          {/* Categories Section */}
          <section className="max-w-7xl mx-auto px-6 py-32 relative">
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
          <section className="max-w-7xl mx-auto px-6 py-32 relative">
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
