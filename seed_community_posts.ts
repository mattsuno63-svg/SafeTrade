
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Fetching admin user...')
    const user = await prisma.user.findFirst()

    if (!user) {
        console.error('No user found to assign posts to. Please create a user first.')
        return
    }

    console.log(`Using user: ${user.name} (${user.id})`)

    // Define posts with Topic Slugs
    const posts = [
        {
            topicSlug: 'general',
            title: '👋 Benvenuti su SafeTrade: Linee Guida della Community',
            content: `Benvenuti nella community ufficiale di SafeTrade! 
Questo è lo spazio dove collezionisti, giocatori e venditori possono incontrarsi.

📜 **Linee Guida Generali:**
1. **Rispetto Reciproco**: Nessun insulto o linguaggio offensivo.
2. **Niente Spam**: Pubblicate i vostri annunci solo nella sezione Mercatino.
3. **Passione**: Condividete la vostra passione! Quando vi registrate, raccontateci cosa collezionate.

Speriamo che questo spazio diventi la vostra nuova casa per il collezionismo!`,
            isPinned: true
        },
        {
            topicSlug: 'grading',
            title: '🔍 Guida Base: Come valutare le condizioni delle tue carte',
            content: `Molti chiedono come distinguere un Near Mint da un Excellent. Ecco una mini-guida:

**MINT (M)**: La carta è perfetta. Nessun graffio, bordi perfetti, centratura ottima. Praticamente appena sbustata.
**NEAR MINT (NM)**: Quasi perfetta. Può avere micro-imperfezioni visibili solo controluce o un puntino bianco minimo sul bordo.
**EXCELLENT (EX)**: Leggera usura sui bordi o qualche graffio superficiale. La carta è bellissima ma chiaramente non "nuova".
**GOOD (GD)**: Usura evidente, pieghette, graffi. Giocabile (con bustine) ma non da collezione pura.
**POOR**: Carta rovinata, strappi, pieghe pesanti.

Postate qui sotto le foto delle vostre carte per chiedere un parere!`,
            isPinned: false
        },
        {
            topicSlug: 'pokemon',
            title: '🔥 Meta Discussion: Il dominio di Charizard nel formato attuale',
            content: `Cosa ne pensate dell'attuale meta competitivo? Sembra che i mazzi fuoco stiano tornando prepotentemente. 
Avete tech particolari che state testando per contrastarli?`,
            isPinned: false
        },
        {
            topicSlug: 'marketplace',
            title: 'Vendo Collezione Base Set (Alcune 1st Ed.)',
            content: `Ciao a tutti! 
Metto in vendita parte della mia collezione storica.
Ho diverse comuni e non comuni del Set Base, alcune Prima Edizione.

Scrivetemi in privato o guardate il mio shop per i dettagli. Accetto anche scambi con carte Magic di fascia alta.`,
            isPinned: false
        }
    ]

    console.log('Seeding posts...')

    for (const p of posts) {
        // Find Topic ID by slug
        const topic = await prisma.topic.findUnique({ where: { slug: p.topicSlug } })

        if (topic) {
            const createdPost = await prisma.post.create({
                data: {
                    title: p.title,
                    content: p.content,
                    topicId: topic.id,
                    authorId: user.id,
                    isPinned: p.isPinned,
                    views: Math.floor(Math.random() * 100) + 10
                }
            })
            console.log(`Created post: ${p.title}`)

            // Add a dummy comment
            await prisma.comment.create({
                data: {
                    content: 'Gran bel post, grazie per le info!',
                    postId: createdPost.id,
                    authorId: user.id
                }
            })
        } else {
            console.warn(`Topic ${p.topicSlug} not found. Skipping post.`)
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
