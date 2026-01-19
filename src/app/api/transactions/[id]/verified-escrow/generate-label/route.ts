import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { SafeTradeStatus, ShippingLabelStatus } from '@prisma/client'
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { generateShippingLabel, downloadLabelPdf, validateSendcloudConfig } from '@/lib/shipping/sendcloud'

/**
 * POST /api/transactions/[id]/verified-escrow/generate-label
 * Seller genera etichetta di spedizione per Verified Escrow usando Sendcloud
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const { id } = await Promise.resolve(params)
    const body = await request.json()
    const {
      weight,
      weightUnit,
      dimensions,
      courier,
      service,
      sellerAddress, // Indirizzo seller fornito dal form (se necessario)
    } = body
    
    // Debug: log per vedere cosa arriva
    console.log('[GENERATE-LABEL] Body received:', JSON.stringify({ weight, sellerAddress }, null, 2))

    // SECURITY: Rate limiting
    const rateLimitKey = getRateLimitKey(user.id, 'MESSAGE_SEND') // Reuse message rate limit
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.MESSAGE_SEND)
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Troppe richieste. Riprova tra qualche minuto.',
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        { status: 429 }
      )
    }

    // SECURITY: Validate Sendcloud configuration
    const configValidation = validateSendcloudConfig()
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          error: 'Configurazione Sendcloud non valida',
          details: configValidation.errors,
        },
        { status: 500 }
      )
    }

    // Get transaction
    const transaction = await prisma.safeTradeTransaction.findUnique({
      where: { id },
      include: {
        userA: { select: { id: true, name: true, email: true } },
        userB: { select: { id: true, name: true, email: true } },
        escrowPayment: { select: { id: true, amount: true, status: true } },
        proposal: {
          include: {
            listing: { select: { id: true, title: true } },
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transazione non trovata' },
        { status: 404 }
      )
    }

    // SECURITY: Only seller can generate label
    if (transaction.userBId !== user.id) {
      return NextResponse.json(
        { error: 'Solo il venditore può generare l\'etichetta di spedizione' },
        { status: 403 }
      )
    }

    // SECURITY: Verify escrowType is VERIFIED
    if (transaction.escrowType !== 'VERIFIED') {
      return NextResponse.json(
        { error: 'Questa transazione non è Verified Escrow' },
        { status: 400 }
      )
    }

    // SECURITY: Verify status is correct (must be PENDING_ESCROW_SETUP - initial state)
    if (transaction.status !== SafeTradeStatus.PENDING_ESCROW_SETUP) {
      return NextResponse.json(
        { error: `Stato transazione non valido. Stato attuale: ${transaction.status}. Stato richiesto: PENDING_ESCROW_SETUP` },
        { status: 400 }
      )
    }

    // SECURITY: Check if label already exists (prevent duplicates)
    const existingLabel = await prisma.shippingLabel.findUnique({
      where: { transactionId: id },
    })

    if (existingLabel) {
      return NextResponse.json(
        { error: 'Etichetta di spedizione già generata per questa transazione' },
        { status: 400 }
      )
    }

    // SECURITY: Validate weight
    const actualWeight = weight || 0.5 // Default 0.5kg
    if (actualWeight <= 0 || actualWeight > 30) {
      return NextResponse.json(
        { error: 'Peso pacco non valido. Deve essere tra 0.1 e 30 kg' },
        { status: 400 }
      )
    }

    // SECURITY: Verify escrowPayment exists and is HELD (funds must be in escrow before shipping)
    if (!transaction.escrowPayment) {
      return NextResponse.json(
        { error: 'Pagamento non trovato. La transazione non può procedere.' },
        { status: 400 }
      )
    }

    if (transaction.escrowPayment.status !== 'HELD') {
      return NextResponse.json(
        { error: `Pagamento non in stato HELD. Stato attuale: ${transaction.escrowPayment.status}. I fondi devono essere in escrow prima della spedizione.` },
        { status: 400 }
      )
    }

    // Get hub address from env (destinazione)
    // IMPORTANTE: process.env viene caricato all'avvio del server Next.js
    // Se le variabili sono state aggiunte dopo l'avvio, RIAVVIA IL SERVER!
    const hubAddress = {
      name: (process.env.SENDCLOUD_HUB_NAME || 'SafeTrade Hub').trim(),
      street1: (process.env.SENDCLOUD_HUB_STREET1 || '').trim(),
      city: (process.env.SENDCLOUD_HUB_CITY || '').trim(),
      state: (process.env.SENDCLOUD_HUB_STATE || '').trim(),
      zip: (process.env.SENDCLOUD_HUB_ZIP || '').trim(),
      country: (process.env.SENDCLOUD_HUB_COUNTRY || 'IT').trim().toUpperCase(),
      phone: (process.env.SENDCLOUD_HUB_PHONE || '').trim(),
      email: (process.env.SENDCLOUD_HUB_EMAIL || 'hub@safetrade.it').trim(),
    }
    
    // DEBUG: Log dettagliato per vedere cosa arriva da process.env
    console.log('[GENERATE-LABEL] Raw env vars:', {
      SENDCLOUD_HUB_STREET1: process.env.SENDCLOUD_HUB_STREET1,
      SENDCLOUD_HUB_CITY: process.env.SENDCLOUD_HUB_CITY,
      SENDCLOUD_HUB_ZIP: process.env.SENDCLOUD_HUB_ZIP,
      SENDCLOUD_HUB_COUNTRY: process.env.SENDCLOUD_HUB_COUNTRY,
    })
    console.log('[GENERATE-LABEL] Processed hubAddress:', hubAddress)
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/60853c97-34bc-4463-ba9b-b186bb8ceacd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-label/route.ts:150',message:'Hub address from env - RAW and PROCESSED',data:{hubAddress,raw_env_street1:process.env.SENDCLOUD_HUB_STREET1,raw_env_city:process.env.SENDCLOUD_HUB_CITY,raw_env_zip:process.env.SENDCLOUD_HUB_ZIP,raw_env_country:process.env.SENDCLOUD_HUB_COUNTRY,all_env_keys:Object.keys(process.env).filter(k=>k.includes('SENDCLOUD')).slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-3',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    // VALIDAZIONE: Verifica che l'indirizzo hub sia completo
    if (!hubAddress.street1 || !hubAddress.city || !hubAddress.zip) {
      console.error('[GENERATE-LABEL] Hub address incomplete:', {
        hubAddress,
        rawEnv: {
          street1: process.env.SENDCLOUD_HUB_STREET1,
          city: process.env.SENDCLOUD_HUB_CITY,
          zip: process.env.SENDCLOUD_HUB_ZIP,
        },
        allSendcloudEnvVars: Object.keys(process.env).filter(k => k.startsWith('SENDCLOUD')),
      })
      return NextResponse.json(
        {
          error: `Indirizzo hub SafeTrade non configurato correttamente. 
            Verifica che le variabili SENDCLOUD_HUB_STREET1, SENDCLOUD_HUB_CITY, SENDCLOUD_HUB_ZIP siano presenti nel file .env
            e che il server sia stato riavviato dopo averle aggiunte.
            Valori trovati: street1="${hubAddress.street1}", city="${hubAddress.city}", zip="${hubAddress.zip}"`,
        },
        { status: 500 }
      )
    }

    // Get seller (userB) address
    const seller = transaction.userB
    
    // Debug: log per vedere cosa arriva
    console.log('[GENERATE-LABEL] Seller address from body:', sellerAddress)
    
    // VALIDAZIONE: L'indirizzo del venditore DEVE essere fornito dal form
    // Non usiamo fallback perché Sendcloud richiede indirizzi validi e completi
    if (!sellerAddress?.street?.trim() || !sellerAddress?.city?.trim() || !sellerAddress?.zip?.trim()) {
      return NextResponse.json(
        {
          error: 'Indirizzo venditore incompleto. Compila tutti i campi obbligatori: via, città, CAP.',
        },
        { status: 400 }
      )
    }
    
    // Usa indirizzo fornito dal form (già validato)
    // Se il form ha separato street e houseNumber, usali, altrimenti estrai da street
    const sellerStreetFull = sellerAddress.street.trim()
    const sellerHouseNumber = sellerAddress.houseNumber?.trim() || ''
    const sellerCity = sellerAddress.city.trim()
    const sellerZip = sellerAddress.zip.trim()
    const sellerState = sellerAddress.province?.trim() || seller.province || ''
    const sellerPhone = sellerAddress.phone?.trim() || seller.phone || '+39 000 0000000'
    
    // Se houseNumber è separato, usa quello, altrimenti estrai da street
    let sellerStreet = sellerStreetFull
    let sellerHouseNum = sellerHouseNumber
    
    if (!sellerHouseNum && sellerStreetFull) {
      // Estrai numero civico se presente nell'indirizzo
      const match = sellerStreetFull.match(/(.+?)\s+(?:n\.?|n°|#)?\s*(\d+[a-zA-Z]?)\s*$/i)
      if (match) {
        sellerStreet = match[1].trim()
        sellerHouseNum = match[2].trim()
      } else {
        // Fallback: usa tutto come street e "1" come house_number
        sellerStreet = sellerStreetFull
        sellerHouseNum = '1'
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7246/ingest/60853c97-34bc-4463-ba9b-b186bb8ceacd',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-label/route.ts:180',message:'Seller address extracted',data:{sellerStreetFull,sellerHouseNumber,sellerStreet,sellerHouseNum,sellerCity,sellerZip,hubAddress},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix-2',hypothesisId:'H'})}).catch(()=>{});
    // #endregion
    
    console.log('[GENERATE-LABEL] Extracted seller address:', { sellerStreet, sellerHouseNum, sellerCity, sellerZip, sellerState, sellerPhone })

    // Generate label using Sendcloud
    // SELLER = from (mittente), HUB = to (destinatario)
    const labelResult = await generateShippingLabel({
      transactionId: id,
      // FROM: Seller address (mittente)
      fromName: seller.name || seller.email || 'Seller',
      fromStreet1: sellerStreet,
      fromHouseNumber: sellerHouseNum,
      fromCity: sellerCity,
      fromState: sellerState,
      fromZip: sellerZip,
      fromCountry: 'IT',
      fromPhone: sellerPhone,
      fromEmail: seller.email,
      // TO: Hub address (destinatario) - DEVE essere completo!
      toName: hubAddress.name,
      toStreet1: hubAddress.street1,
      toCity: hubAddress.city,
      toState: hubAddress.state,
      toZip: hubAddress.zip,
      toCountry: hubAddress.country,
      toPhone: hubAddress.phone,
      toEmail: hubAddress.email,
      weight: actualWeight,
      weightUnit: weightUnit || 'kg',
      dimensions: dimensions,
      // NOTA: Non specifichiamo courier se non fornito - Sendcloud troverà automaticamente i carrier disponibili
      // Questo permette di usare carrier italiani che sono già configurati nella dashboard Sendcloud
      courier: courier || undefined, // undefined = Sendcloud sceglie automaticamente
      service: service || 'STANDARD',
      metadata: {
        transactionId: id,
        sellerId: transaction.userBId,
        buyerId: transaction.userAId,
        listingTitle: transaction.proposal?.listing?.title,
      },
    })

    if (!labelResult.success || !labelResult.sendcloudParcelId) {
      return NextResponse.json(
        {
          error: labelResult.error || 'Errore generazione etichetta Sendcloud',
        },
        { status: 500 }
      )
    }

    // Download label PDF as base64
    let labelPdfBase64: string | null = null
    if (labelResult.labelUrl) {
      labelPdfBase64 = await downloadLabelPdf(labelResult.labelUrl)
    }

    // Calculate shipping cost (addebitato al buyer)
    // Per ora: costAmount = costo reale, chargedAmount = costAmount + margine (es. +50%)
    const costAmount = labelResult.costAmount || 0
    const marginAmount = costAmount * 0.5 // Margine 50% (configurabile)
    const chargedAmount = costAmount + marginAmount

    // Create ShippingLabel in database
    const shippingLabel = await prisma.shippingLabel.create({
      data: {
        transactionId: id,
        courier: courier || 'AUTO', // 'AUTO' = Sendcloud sceglie automaticamente il carrier migliore
        provider: 'SENDCLOUD',
        // Nota: per compatibilità, usiamo i campi Shippo nel DB ma con dati Sendcloud
        shippoTransactionId: labelResult.sendcloudParcelId, // Sendcloud parcel ID
        shippoRateId: labelResult.sendcloudShipmentId, // Sendcloud shipment ID
        shippoTrackingNumber: labelResult.trackingNumber,
        labelUrl: labelResult.labelUrl,
        labelPdfBase64: labelPdfBase64 || undefined,
        weight: actualWeight,
        weightUnit: weightUnit || 'kg',
        dimensions: dimensions || null,
        fromAddress: fromAddress,
        toAddress: hubAddress,
        service: service || 'STANDARD',
        costAmount: costAmount,
        chargedAmount: chargedAmount,
        marginAmount: marginAmount,
        status: ShippingLabelStatus.CREATED,
      },
    })

    // Update transaction with tracking number
    const updatedTransaction = await prisma.safeTradeTransaction.update({
      where: { id },
      data: {
        trackingNumber: labelResult.trackingNumber || undefined,
        notes: `Etichetta di spedizione generata via Sendcloud. Tracking: ${labelResult.trackingNumber || 'N/A'}. Costo: €${costAmount.toFixed(2)}.`,
      },
    })

    // SECURITY: Create AdminNotification per validazione (come prima)
    await prisma.adminNotification.create({
      data: {
        type: 'URGENT_ACTION',
        referenceType: 'TRANSACTION',
        referenceId: id,
        title: `📦 Etichetta Generata - Validazione Richiesta - Ordine #${id.slice(0, 8)}`,
        message: `Seller ${transaction.userB.name || transaction.userB.email} ha generato etichetta di spedizione. Tracking: "${labelResult.trackingNumber || 'N/A'}" per transazione Verified Escrow. Importo: €${(transaction.escrowPayment?.amount || 0).toFixed(2)}. Verifica tracking e valida quando pronto per ricezione hub.`,
        priority: 'HIGH',
        targetRoles: ['ADMIN', 'HUB_STAFF'],
      },
    })

    // Create notification for buyer (informa che etichetta generata)
    await prisma.notification.create({
      data: {
        userId: transaction.userAId,
        type: 'TRANSACTION_UPDATED',
        title: '📦 Etichetta di Spedizione Generata',
        message: `Il venditore ha generato l'etichetta di spedizione. Tracking: ${labelResult.trackingNumber || 'N/A'}. Il pacco sarà verificato dal nostro team quando arriverà all'hub.`,
        link: `/transaction/${id}/status`,
      },
    })

    // SECURITY: Log action for audit trail
    console.log(`[VERIFIED_ESCROW] Label generated by seller ${user.id} for transaction ${id}: ${labelResult.trackingNumber || 'N/A'} - PENDING ADMIN VALIDATION`)

    return NextResponse.json({
      success: true,
      shippingLabel: {
        id: shippingLabel.id,
        trackingNumber: labelResult.trackingNumber,
        labelUrl: labelResult.labelUrl,
        costAmount: costAmount,
        chargedAmount: chargedAmount,
        marginAmount: marginAmount,
        status: shippingLabel.status,
      },
      transaction: updatedTransaction,
    })
  } catch (error: any) {
    console.error('[API] Error generating shipping label:', error)
    console.error('[API] Error stack:', error.stack)
    
    // Return detailed error for debugging (in development)
    const errorMessage = error.message || 'Errore interno del server'
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { 
          message: errorMessage,
          stack: error.stack,
          name: error.name,
        }
      : { message: errorMessage }

    return NextResponse.json(
      { 
        error: errorMessage,
        ...errorDetails,
      },
      { status: 500 }
    )
  }
}

