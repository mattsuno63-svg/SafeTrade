import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateQRCodeDataURL, generateTransactionQRData } from '@/lib/qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Verify transaction exists
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    // Generate QR code data
    const qrData = generateTransactionQRData(id)
    const qrCodeDataURL = await generateQRCodeDataURL(qrData)

    return NextResponse.json({
      qrCode: qrCodeDataURL,
      transactionId: id,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

