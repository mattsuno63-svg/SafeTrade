import { ReactNode } from 'react'

// Evita che Next pre-renderizzi le pagine admin a build time (nessuna sessione → API 401).
// Le pagine admin usano API che richiedono auth; senza questo il build Vercel fallisce con "Unauthorized".
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
