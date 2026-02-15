/**
 * One-off: add handleApiError import and replace catch blocks that expose error.message.
 * Run: node scripts/fix-api-error-leakage.mjs
 */
import fs from 'fs'
import path from 'path'

const API_ROOT = path.join(process.cwd(), 'src', 'app', 'api')

const files = [
  'vault/deposits/[id]/mark-shipped/route.ts',
  'vault/deposits/[id]/route.ts',
  'vault/deposits/[id]/review/route.ts',
  'vault/deposits/[id]/receive/route.ts',
  'vault/deposits/route.ts',
  'vault/merchant/items/[id]/move-slot/route.ts',
  'vault/merchant/assign-item-to-slot/route.ts',
  'vault/merchant/items/[id]/list-online/route.ts',
  'vault/merchant/orders/[id]/fulfill/route.ts',
  'vault/merchant/inventory/route.ts',
  'vault/merchant/orders/route.ts',
  'vault/merchant/available-items/route.ts',
  'vault/merchant/sales/route.ts',
  'vault/merchant/scan-slot/route.ts',
  'vault/payouts/batches/route.ts',
  'vault/payouts/batches/[id]/pay/route.ts',
  'vault/payouts/route.ts',
  'vault/items/assign/route.ts',
  'vault/orders/[id]/pay/route.ts',
  'vault/orders/route.ts',
  'vault/requests/route.ts',
  'vault/cases/[id]/route.ts',
  'vault/cases/[id]/slots/[slotId]/qr/route.ts',
  'vault/cases/[id]/qr-batch/route.ts',
  'merchant/verify/scan/route.ts',
  'merchant/verify/[qrCode]/route.ts',
  'escrow/payments/route.ts',
  'escrow/sessions/[sessionId]/verification/route.ts',
  'escrow/sessions/[sessionId]/extend/route.ts',
  'escrow/sessions/[sessionId]/close/route.ts',
  'escrow/sessions/[sessionId]/checkin/route.ts',
  'escrow/sessions/[sessionId]/qr/route.ts',
  'transactions/[id]/verified-escrow/generate-label/route.ts',
  'auth/logout/route.ts',
  'listings/featured/route.ts',
  'user/profile/route.ts',
  'community/posts/[id]/route.ts',
  'admin/shops/[id]/authorize-vault-case/route.ts',
]

function tagFromPath(p) {
  return path.dirname(p).replace(/\[.*?\]/g, 'id').replace(/\//g, '-').replace(/^api-/, '') || 'route'
}

for (const rel of files) {
  const full = path.join(API_ROOT, rel)
  if (!fs.existsSync(full)) {
    console.warn('Skip (not found):', full)
    continue
  }
  let content = fs.readFileSync(full, 'utf8')
  const tag = tagFromPath(rel)

  if (!content.includes('handleApiError')) {
    const re = /\nimport\s+.+?\s+from\s+['"][^'"]+['"]/g
    let match
    let insertAt = 0
    while ((match = re.exec(content)) !== null) insertAt = match.index + match[0].length
    const importLine = "\nimport { handleApiError } from '@/lib/api-error'"
    content = content.slice(0, insertAt) + importLine + content.slice(insertAt)
  }

  // Replace return NextResponse.json({ error: error.message || '...' }, { status: 500 }) with return handleApiError(error, tag)
  content = content.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*error\.message\s*\|\|\s*['"][^'"]*['"]\s*\}\s*,\s*\{\s*status:\s*500\s*\}\s*\)/g,
    () => `return handleApiError(error, '${tag}')`
  )
  // Also 400 variant (escrow/payments)
  content = content.replace(
    /return NextResponse\.json\(\s*\{\s*error:\s*error\.message\s*\|\|\s*['"][^'"]*['"]\s*\}\s*,\s*\{\s*status:\s*400\s*\}\s*\)/g,
    () => `return handleApiError(error, '${tag}')`
  )

  content = content.replace(/} catch \(error: any\) \{/g, '} catch (error) {')

  fs.writeFileSync(full, content)
  console.log('Updated:', rel)
}

console.log('Done.')
