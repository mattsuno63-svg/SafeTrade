import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// Get current user's merchant application
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const application = await prisma.merchantApplication.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json(application)
  } catch (error: any) {
    console.error('Error fetching application:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Submit a new merchant application
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const {
      shopName,
      companyName,
      vatNumber,
      taxCode,
      uniqueCode,
      description,
      address,
      city,
      province,
      postalCode,
      phone,
      email,
      website,
      legalForm,
    } = body

    // Validate required fields
    if (!shopName || !companyName || !vatNumber || !address || !city || !phone) {
      return NextResponse.json(
        { error: 'Shop name, company name, VAT number, address, city, and phone are required' },
        { status: 400 }
      )
    }

    // Check if user already has an application
    const existingApplication = await prisma.merchantApplication.findUnique({
      where: { userId: user.id },
    })

    if (existingApplication) {
      // If rejected, allow resubmission
      if (existingApplication.status === 'REJECTED') {
        const updated = await prisma.merchantApplication.update({
          where: { userId: user.id },
          data: {
            shopName,
            companyName,
            vatNumber,
            taxCode,
            uniqueCode,
            description,
            address,
            city,
            province,
            postalCode,
            phone,
            email,
            website,
            legalForm,
            status: 'PENDING',
            reviewNotes: null,
            reviewedAt: null,
          },
        })
        return NextResponse.json(updated)
      }
      
      return NextResponse.json(
        { error: 'You already have an active application' },
        { status: 400 }
      )
    }

    // Check if user is already a merchant
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (dbUser?.role === 'MERCHANT') {
      return NextResponse.json(
        { error: 'You are already a merchant' },
        { status: 400 }
      )
    }

    // Create new application
    const application = await prisma.merchantApplication.create({
      data: {
        userId: user.id,
        shopName,
        companyName,
        vatNumber,
        taxCode,
        uniqueCode,
        description,
        address,
        city,
        province,
        postalCode,
        phone,
        email,
        website,
        legalForm,
        status: 'PENDING',
      },
    })

    // Notify admins (in a real app, you'd send emails)
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'NEW_MERCHANT_APPLICATION',
          title: 'New Merchant Application',
          message: `${shopName} has applied to become a SafeTrade partner.`,
          link: '/admin/applications',
        },
      })
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error: any) {
    console.error('Error creating application:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


