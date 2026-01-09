import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Tipo di report
type ReportType = 'LISTING' | 'USER' | 'SHOP' | 'TRANSACTION' | 'COMMUNITY'
type ReportStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'ALL'
    const type = searchParams.get('type') || 'ALL'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Per ora generiamo dati mock per la demo
    // In produzione, questi dati verrebbero da una tabella Report nel DB
    const mockReports = [
      {
        id: 'rpt_1',
        type: 'LISTING' as ReportType,
        status: 'PENDING' as ReportStatus,
        reason: 'Prezzo sospetto - troppo basso rispetto al mercato',
        description: 'Il listing sembra una truffa, il prezzo è del 90% inferiore al valore di mercato',
        reportedItemId: 'listing_123',
        reportedItemTitle: 'Charizard Base Set PSA 10',
        reporterId: 'user_456',
        reporterName: 'Mario Rossi',
        reportedUserId: 'user_789',
        reportedUserName: 'Suspicious Seller',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'rpt_2',
        type: 'USER' as ReportType,
        status: 'INVESTIGATING' as ReportStatus,
        reason: 'Comportamento inappropriato',
        description: 'L\'utente ha inviato messaggi offensivi dopo una trattativa fallita',
        reportedItemId: 'user_abc',
        reportedItemTitle: null,
        reporterId: 'user_def',
        reporterName: 'Luigi Verdi',
        reportedUserId: 'user_abc',
        reportedUserName: 'BadUser123',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'rpt_3',
        type: 'COMMUNITY' as ReportType,
        status: 'RESOLVED' as ReportStatus,
        reason: 'Spam/Promozione',
        description: 'Post contenente link promozionali non autorizzati',
        reportedItemId: 'post_xyz',
        reportedItemTitle: 'Post nel forum Pokemon TCG',
        reporterId: 'user_ghi',
        reporterName: 'Anna Bianchi',
        reportedUserId: 'user_jkl',
        reportedUserName: 'SpammerPro',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        resolvedBy: 'Admin',
        resolution: 'Post rimosso, utente avvertito',
      },
    ]

    // Filtra i report mock
    let filteredReports = mockReports
    if (status !== 'ALL') {
      filteredReports = filteredReports.filter(r => r.status === status)
    }
    if (type !== 'ALL') {
      filteredReports = filteredReports.filter(r => r.type === type)
    }

    // Statistiche
    const stats = {
      total: mockReports.length,
      pending: mockReports.filter(r => r.status === 'PENDING').length,
      investigating: mockReports.filter(r => r.status === 'INVESTIGATING').length,
      resolved: mockReports.filter(r => r.status === 'RESOLVED').length,
      dismissed: mockReports.filter(r => r.status === 'DISMISSED').length,
    }

    return NextResponse.json({
      reports: filteredReports,
      stats,
      pagination: {
        total: filteredReports.length,
        pages: Math.ceil(filteredReports.length / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

// In futuro: POST per creare report, PATCH per aggiornare status

