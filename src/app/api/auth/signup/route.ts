import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { checkRateLimit, RATE_LIMITS, getClientIp, getRateLimitKeyByIp, setRateLimitHeaders } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-error'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(8, 'La password deve avere almeno 8 caratteri')
    .regex(/[A-Z]/, 'La password deve contenere almeno una lettera maiuscola')
    .regex(/[0-9]/, 'La password deve contenere almeno un numero')
    .regex(/[^A-Za-z0-9]/, 'La password deve contenere almeno un carattere speciale'),
  name: z.string().optional(),
  role: z.enum(['USER', 'MERCHANT']).default('USER'),
  city: z.string().min(1, 'La città è obbligatoria'),
  province: z.string().optional().nullable(),
  maxDistance: z.number().int().min(10).max(200).default(50).optional(),
  merchantData: z.object({
    shopName: z.string(),
    companyName: z.string(),
    vatNumber: z.string(),
    taxCode: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? null : val), z.string().optional().nullable()),
    uniqueCode: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? null : val), z.string().optional().nullable()),
    description: z.string().optional().nullable(),
    address: z.string(),
    city: z.string(),
    province: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    phone: z.string(),
    // Empty/whitespace → null so optional email/url don't fail validation
    email: z.preprocess(
      (val) => { const s = typeof val === 'string' ? val.trim() : val; return s === '' || s === undefined ? null : s; },
      z.union([z.string().email(), z.null()]).optional(),
    ),
    website: z.preprocess(
      (val) => {
        const s = typeof val === 'string' ? val.trim() : val
        if (s === '' || s === undefined) return null
        const url = /^https?:\/\//i.test(s as string) ? s : `https://${s}`
        return url
      },
      z.union([z.string().url(), z.null()]).optional(),
    ),
    legalForm: z.preprocess((val) => (typeof val === 'string' && val.trim() === '' ? null : val), z.string().optional().nullable()),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    // ── Rate limit per IP (TEMPORANEAMENTE DISABILITATO) ──
    // const rateLimitKey = getRateLimitKeyByIp(ip, 'SIGNUP')
    // const rateResult = await checkRateLimit(rateLimitKey, RATE_LIMITS.SIGNUP)
    // if (!rateResult.allowed) {
    //   const res = NextResponse.json(
    //     { error: 'Troppi tentativi di registrazione. Riprova più tardi.' },
    //     { status: 429 },
    //   )
    //   setRateLimitHeaders(res.headers, rateResult)
    //   return res
    // }

    const body = await request.json()
    const parsed = signupSchema.parse(body)
    const { email, password, name, role, merchantData } = parsed

    const supabase = await createClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      // Messaggio GENERICO — non rivelare se l'email esiste già
      // Supabase potrebbe restituire "User already registered" ma noi non lo esponiamo
      console.error('[signup] Supabase auth error:', authError.message)
      return NextResponse.json(
        { error: 'Registrazione non riuscita. Controlla i dati inseriti.' },
        { status: 400 },
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Registrazione non riuscita' },
        { status: 500 },
      )
    }

    const finalRole = role === 'MERCHANT' ? 'USER' : (role as UserRole)
    const { city, province, maxDistance } = parsed
    const cityTrimmed = typeof city === 'string' ? city.trim() : ''
    if (!cityTrimmed) {
      return NextResponse.json(
        { error: 'La città è obbligatoria per usare i filtri zona nel marketplace.' },
        { status: 400 },
      )
    }

    // Create user in Prisma database
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        passwordHash: '', // Supabase handles password
        name: name || null,
        role: finalRole,
        city: cityTrimmed,
        province: province?.trim() || null,
        maxDistance: maxDistance ?? 50,
      },
    })

    // If merchant registration, create MerchantApplication
    if (role === 'MERCHANT' && merchantData) {
      if (!merchantData.shopName || !merchantData.companyName || !merchantData.vatNumber ||
          !merchantData.address || !merchantData.city || !merchantData.phone) {
        return NextResponse.json(
          { error: 'Campi obbligatori mancanti per la registrazione commerciante' },
          { status: 400 },
        )
      }

      const application = await prisma.merchantApplication.create({
        data: {
          userId: user.id,
          shopName: merchantData.shopName,
          companyName: merchantData.companyName,
          vatNumber: merchantData.vatNumber,
          taxCode: merchantData.taxCode,
          uniqueCode: merchantData.uniqueCode,
          description: merchantData.description,
          address: merchantData.address,
          city: merchantData.city,
          province: merchantData.province,
          postalCode: merchantData.postalCode,
          phone: merchantData.phone,
          email: merchantData.email,
          website: merchantData.website,
          legalForm: merchantData.legalForm,
          status: 'PENDING',
        },
      })

      // Auto-confirm email for merchants
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabaseAdmin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            },
          )

          await supabaseAdmin.auth.admin.updateUserById(
            authData.user.id,
            { email_confirm: true },
          )
        } catch (err) {
          // Non bloccare il signup se la conferma email fallisce
          console.error('[signup] Auto-confirm email error:', err)
        }
      }

      // Notify admins
      try {
        await prisma.adminNotification.create({
          data: {
            type: 'MERCHANT_APPLICATION',
            referenceType: 'MERCHANT_APPLICATION',
            referenceId: application.id,
            title: 'Nuova Richiesta Commerciante',
            message: `${merchantData.shopName} ha richiesto di diventare un partner SafeTrade.`,
            priority: 'NORMAL',
            targetRoles: ['ADMIN', 'MODERATOR'],
          },
        })
      } catch (notifError) {
        console.error('[signup] Notification error:', notifError)
        // Fallback: notifica utenti admin
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN' },
          select: { id: true },
        })

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'NEW_MERCHANT_APPLICATION',
              title: 'Nuova Richiesta Commerciante',
              message: `${merchantData.shopName} ha richiesto di diventare un partner SafeTrade.`,
              link: '/admin/applications',
            },
          })
        }
      }
    }

    const res = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        merchantApplication: role === 'MERCHANT' ? { status: 'PENDING' } : undefined,
      },
      { status: 201 },
    )
    // setRateLimitHeaders(res.headers, rateResult) // rate limit disabilitato
    return res
  } catch (error: unknown) {
    return handleApiError(error, '/auth/signup')
  }
}
