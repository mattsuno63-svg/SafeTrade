import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { z } from 'zod'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  role: z.enum(['USER', 'MERCHANT']).default('USER'),
  merchantData: z.object({
    shopName: z.string(),
    companyName: z.string(),
    vatNumber: z.string(),
    taxCode: z.string().optional().nullable(),
    uniqueCode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    address: z.string(),
    city: z.string(),
    province: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    phone: z.string(),
    email: z.string().email().optional().nullable(),
    website: z.string().url().optional().nullable(),
    legalForm: z.string().optional().nullable(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // If merchant registration, create as USER first (will be upgraded after approval)
    // If merchant, create user as USER and create MerchantApplication
    const finalRole = role === 'MERCHANT' ? 'USER' : (role as UserRole)

    // Create user in Prisma database
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        email,
        passwordHash: '', // Supabase handles password
        name: name || null,
        role: finalRole,
      },
    })

    // If merchant registration, create MerchantApplication
    if (role === 'MERCHANT' && merchantData) {
      // Validate required merchant fields
      if (!merchantData.shopName || !merchantData.companyName || !merchantData.vatNumber || 
          !merchantData.address || !merchantData.city || !merchantData.phone) {
        return NextResponse.json(
          { error: 'Missing required merchant fields' },
          { status: 400 }
        )
      }

      // Create merchant application
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

      // Auto-confirm email for merchants (bypass email verification)
      // Since admin will manually approve them, we can skip email verification
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
            }
          )

          // Update user to confirm email
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            authData.user.id,
            {
              email_confirm: true,
            }
          )

          if (updateError) {
            console.error('Error confirming merchant email during signup:', updateError)
            // Don't fail signup if email confirmation fails
          } else {
            console.log('✅ Merchant email confirmed automatically during signup')
          }
        } catch (error) {
          console.error('Error setting up Supabase Admin client during signup:', error)
          // Don't fail signup if email confirmation fails
        }
      } else {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - cannot auto-confirm merchant email')
      }

      // Notify admins
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
            link: `/admin/applications`,
          },
        })
      }
    }

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        merchantApplication: role === 'MERCHANT' ? { status: 'PENDING' } : undefined,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    
    // Check for database connection errors
    if (error?.message?.includes('Tenant or user not found') || 
        error?.message?.includes("Can't reach database server")) {
      return NextResponse.json(
        { 
          error: 'Database connection failed. Please check that your Supabase project is active and the DATABASE_URL is correct.',
          details: 'The database server cannot be reached. This usually means the Supabase project is paused or the connection string is incorrect.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}


