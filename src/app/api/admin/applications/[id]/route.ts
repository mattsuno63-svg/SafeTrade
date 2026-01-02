import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { status, reviewNotes } = body

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the application
    const application = await prisma.merchantApplication.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update application
    const updated = await prisma.merchantApplication.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewedAt: new Date(),
      },
    })

    // If approved, update user role to MERCHANT and create shop
    if (status === 'APPROVED') {
      // Update user role to MERCHANT
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: 'MERCHANT' },
      })

      // Generate slug from shop name
      const generateSlug = (name: string): string => {
        return name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
          .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      }

      let slug = generateSlug(application.shopName)
      
      // Ensure slug is unique
      let slugExists = await prisma.shop.findUnique({ where: { slug } })
      let counter = 1
      while (slugExists) {
        slug = `${generateSlug(application.shopName)}-${counter}`
        slugExists = await prisma.shop.findUnique({ where: { slug } })
        counter++
      }

      // Create or update shop for the merchant (upsert to handle existing shops)
      await prisma.shop.upsert({
        where: { merchantId: application.userId },
        update: {
          name: application.shopName,
          slug,
          description: application.description || null,
          address: application.address || null,
          city: application.city || null,
          phone: application.phone || null,
          isApproved: true,
        },
        create: {
          name: application.shopName,
          slug,
          description: application.description || null,
          address: application.address || null,
          city: application.city || null,
          phone: application.phone || null,
          merchantId: application.userId,
          isApproved: true,
        },
      })

      // Confirm email in Supabase for merchant (bypass email verification)
      // Use Admin API to update user email confirmation status
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabaseAdmin = createClient(
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
            application.userId,
            {
              email_confirm: true,
            }
          )

          if (updateError) {
            console.error('Error confirming merchant email:', updateError)
            // Don't fail the approval if email confirmation fails
          } else {
            console.log('✅ Merchant email confirmed automatically')
          }
        } catch (error) {
          console.error('Error setting up Supabase Admin client:', error)
          // Don't fail the approval if email confirmation fails
        }
      } else {
        console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set - cannot auto-confirm merchant email')
      }

      // Notify user
      await prisma.notification.create({
        data: {
          userId: application.userId,
          type: 'MERCHANT_APPROVED',
          title: 'Application Approved! 🎉',
          message: `Congratulations! Your merchant application for "${application.shopName}" has been approved. You can now set up your shop.`,
          link: '/merchant/shop',
        },
      })
    } else {
      // Notify user of rejection
      await prisma.notification.create({
        data: {
          userId: application.userId,
          type: 'MERCHANT_REJECTED',
          title: 'Application Reviewed',
          message: `Your merchant application for "${application.shopName}" was not approved at this time.${reviewNotes ? ` Reason: ${reviewNotes}` : ''}`,
          link: '/merchant/apply',
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating application:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}

