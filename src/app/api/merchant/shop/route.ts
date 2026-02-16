import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    let shop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Se il negozio ha un nome ma nessuno slug (es. creato prima del campo slug), generalo e salvalo
    if (shop.name && !shop.slug) {
      let slug = generateSlug(shop.name)
      let slugExists = await prisma.shop.findUnique({ where: { slug } })
      let counter = 1
      while (slugExists && slugExists.id !== shop.id) {
        slug = `${generateSlug(shop.name)}-${counter}`
        slugExists = await prisma.shop.findUnique({ where: { slug } })
        counter++
      }
      shop = await prisma.shop.update({
        where: { id: shop.id },
        data: { slug },
      })
    }

    return NextResponse.json(shop)
  } catch (error: any) {
    console.error('Error fetching shop:', error)
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

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { 
      name, 
      description, 
      address, 
      city, 
      postalCode, 
      phone,
      email,
      website,
      openingHours,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      youtubeUrl,
      tiktokUrl,
      images,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Shop name is required' },
        { status: 400 }
      )
    }

    // Check if shop already exists
    const existingShop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (existingShop) {
      return NextResponse.json(
        { error: 'Shop already exists. Use PATCH to update.' },
        { status: 400 }
      )
    }

    let slug = generateSlug(name)
    
    // Ensure slug is unique
    let slugExists = await prisma.shop.findUnique({ where: { slug } })
    let counter = 1
    while (slugExists) {
      slug = `${generateSlug(name)}-${counter}`
      slugExists = await prisma.shop.findUnique({ where: { slug } })
      counter++
    }

    // Create shop
    const shop = await prisma.shop.create({
      data: {
        name,
        slug,
        description: description || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        openingHours: openingHours || null,
        facebookUrl: facebookUrl || null,
        instagramUrl: instagramUrl || null,
        twitterUrl: twitterUrl || null,
        youtubeUrl: youtubeUrl || null,
        tiktokUrl: tiktokUrl || null,
        logo: images && images[0] ? images[0] : null,
        coverImage: images && images[1] ? images[1] : null,
        images: images && images.length > 2 ? images.slice(2) : [],
        merchantId: user.id,
        isApproved: false, // Requires admin approval
      },
    })

    return NextResponse.json(shop, { status: 201 })
  } catch (error: any) {
    console.error('Error creating shop:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { 
      name, 
      description, 
      address, 
      city, 
      postalCode, 
      phone,
      email,
      website,
      openingHours,
      facebookUrl,
      instagramUrl,
      twitterUrl,
      youtubeUrl,
      tiktokUrl,
      images,
    } = body

    // Get existing shop
    const existingShop = await prisma.shop.findUnique({
      where: { merchantId: user.id },
    })

    if (!existingShop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Aggiorna slug se è mancante o se è cambiato il nome
    let slug = existingShop.slug
    const nameToUse = name ?? existingShop.name
    if (nameToUse) {
      const needsNewSlug = !existingShop.slug || (name && name !== existingShop.name)
      if (needsNewSlug) {
        slug = generateSlug(nameToUse)
        let slugExists = await prisma.shop.findUnique({ where: { slug } })
        let counter = 1
        while (slugExists && slugExists.id !== existingShop.id) {
          slug = `${generateSlug(nameToUse)}-${counter}`
          slugExists = await prisma.shop.findUnique({ where: { slug } })
          counter++
        }
      }
    }

    // Update shop
    const updateData: any = {
      ...(name !== undefined && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description: description || null }),
      ...(address !== undefined && { address: address || null }),
      ...(city !== undefined && { city: city || null }),
      ...(postalCode !== undefined && { postalCode: postalCode || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(website !== undefined && { website: website || null }),
      ...(openingHours !== undefined && { openingHours: openingHours || null }),
      ...(facebookUrl !== undefined && { facebookUrl: facebookUrl || null }),
      ...(instagramUrl !== undefined && { instagramUrl: instagramUrl || null }),
      ...(twitterUrl !== undefined && { twitterUrl: twitterUrl || null }),
      ...(youtubeUrl !== undefined && { youtubeUrl: youtubeUrl || null }),
      ...(tiktokUrl !== undefined && { tiktokUrl: tiktokUrl || null }),
    }
    
    // Handle images: first is logo, second is cover, rest are gallery
    if (images !== undefined && Array.isArray(images)) {
      updateData.logo = images[0] || null
      updateData.coverImage = images[1] || null
      updateData.images = images.length > 2 ? images.slice(2) : []
    }
    
    const shop = await prisma.shop.update({
      where: { id: existingShop.id },
      data: updateData,
    })

    return NextResponse.json(shop)
  } catch (error: any) {
    console.error('Error updating shop:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

