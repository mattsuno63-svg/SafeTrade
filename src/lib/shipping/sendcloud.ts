/**
 * Sendcloud API Integration
 * 
 * Generazione etichette di spedizione per Verified Escrow
 * Specializzato in Europa/Italia - Supporta Poste Italiane, GLS, SDA, ecc.
 * 
 * Documentazione: https://docs.sendcloud.com/
 */

// Type definitions
type Address = {
  name: string
  street1: string
  city: string
  state?: string
  zip: string
  country: string
  phone?: string
  email?: string
}

// Re-export interfaces per compatibilità con Shippo
export interface GenerateLabelParams {
  // Mittente (seller - chi spedisce)
  fromName?: string
  fromStreet1?: string
  fromHouseNumber?: string // Numero civico separato (opzionale, verrà estratto se non fornito)
  fromCity?: string
  fromState?: string
  fromZip?: string
  fromCountry?: string
  fromPhone?: string
  fromEmail?: string
  
  // Destinatario (hub SafeTrade quando seller spedisce)
  toName: string
  toStreet1: string
  toCity: string
  toState?: string
  toZip: string
  toCountry: string
  toPhone?: string
  toEmail?: string
  
  // Pacco
  weight: number // in kg
  weightUnit?: 'kg' | 'lb'
  dimensions?: {
    length: number // in cm
    width: number
    height: number
  }
  
  // Servizio
  courier?: string // ID del carrier Sendcloud (es. 'poste_italiane', 'gls_italy', ecc.)
  service?: string // 'STANDARD', 'EXPRESS', ecc.
  
  // Metadati
  transactionId: string
  metadata?: Record<string, any>
}

export interface GenerateLabelResult {
  success: boolean
  sendcloudParcelId?: string  // ID parcel Sendcloud (equivalente a shippoTransactionId)
  sendcloudShipmentId?: string // ID shipment Sendcloud (equivalente a shippoRateId)
  trackingNumber?: string
  labelUrl?: string
  labelPdfBase64?: string
  costAmount?: number // Costo reale corriere (in EUR)
  estimatedDelivery?: string
  error?: string
}

// Configurazione hub SafeTrade (destinazione)
const HUB_ADDRESS: Address = {
  name: process.env.SENDCLOUD_HUB_NAME || 'SafeTrade Hub',
  street1: process.env.SENDCLOUD_HUB_STREET1 || '',
  city: process.env.SENDCLOUD_HUB_CITY || '',
  state: process.env.SENDCLOUD_HUB_STATE || '',
  zip: process.env.SENDCLOUD_HUB_ZIP || '',
  country: process.env.SENDCLOUD_HUB_COUNTRY || 'IT',
  phone: process.env.SENDCLOUD_HUB_PHONE || '',
  email: process.env.SENDCLOUD_HUB_EMAIL || 'hub@safetrade.it',
}

/**
 * Valida configurazione Sendcloud
 */
export function validateSendcloudConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!process.env.SENDCLOUD_API_KEY) {
    errors.push('SENDCLOUD_API_KEY non configurata nel file .env')
  }
  
  if (!process.env.SENDCLOUD_API_SECRET) {
    errors.push('SENDCLOUD_API_SECRET non configurata nel file .env')
  }
  
  if (!HUB_ADDRESS.street1 || !HUB_ADDRESS.city || !HUB_ADDRESS.zip) {
    errors.push('Indirizzo hub SafeTrade non configurato. Configura SENDCLOUD_HUB_* nel file .env')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Genera autenticazione Basic Auth per Sendcloud API
 */
function getSendcloudAuth(): string {
  const apiKey = process.env.SENDCLOUD_API_KEY || ''
  const apiSecret = process.env.SENDCLOUD_API_SECRET || ''
  const credentials = `${apiKey}:${apiSecret}`
  return Buffer.from(credentials).toString('base64')
}

/**
 * Estrae numero civico da indirizzo completo
 */
function extractHouseNumber(address: string): { street: string; houseNumber: string } {
  if (!address) return { street: '', houseNumber: '1' }
  
  // Pattern: "Via Roma 15" o "Via Roma, 15" o "Via Roma n.15"
  const match = address.match(/(.+?)\s+(?:n\.?|n°|#)?\s*(\d+[a-zA-Z]?)\s*$/i)
  if (match) {
    return { street: match[1].trim(), houseNumber: match[2].trim() }
  }
  
  // Ultimo numero nell'indirizzo
  const lastNumber = address.match(/(\d+[a-zA-Z]?)\s*$/)
  if (lastNumber) {
    return {
      street: address.substring(0, address.lastIndexOf(lastNumber[1])).trim(),
      houseNumber: lastNumber[1]
    }
  }
  
  return { street: address.trim() || 'Via non specificata', houseNumber: '1' }
}

/**
 * Genera un'etichetta di spedizione usando Sendcloud
 */
export async function generateShippingLabel(
  params: GenerateLabelParams
): Promise<GenerateLabelResult> {
  
  // Valida configurazione
  const configValidation = validateSendcloudConfig()
  if (!configValidation.valid) {
    throw new Error(`Configurazione Sendcloud non valida: ${configValidation.errors.join(', ')}`)
  }

  const apiKey = process.env.SENDCLOUD_API_KEY!
  const apiSecret = process.env.SENDCLOUD_API_SECRET!
  const baseUrl = 'https://panel.sendcloud.sc/api/v2'

  // DEBUG: Log dettagliato dei parametri ricevuti (solo in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[SENDCLOUD] Params received:', {
      fromStreet1: params.fromStreet1,
      fromCity: params.fromCity,
      fromZip: params.fromZip,
      fromCountry: params.fromCountry,
      toStreet1: params.toStreet1,
      toCity: params.toCity,
      toZip: params.toZip,
      toCountry: params.toCountry,
    })
  }
  
  // Valida indirizzo mittente (seller) - deve essere completo e valido
  const fromStreet1Trimmed = params.fromStreet1?.trim() || ''
  const fromHouseNumberProvided = params.fromHouseNumber?.trim() || ''
  const fromCityTrimmed = params.fromCity?.trim() || ''
  const fromZipTrimmed = params.fromZip?.trim() || ''
  const fromCountryTrimmed = (params.fromCountry && params.fromCountry.trim()) || 'IT'
  
  if (!fromStreet1Trimmed || 
      fromStreet1Trimmed.includes('completare') ||
      !fromCityTrimmed || fromCityTrimmed === 'Città' ||
      !fromZipTrimmed || fromZipTrimmed === '00000') {
    console.error('[SENDCLOUD] Validation failed for fromAddress:', {
      fromStreet1: fromStreet1Trimmed,
      fromCity: fromCityTrimmed,
      fromZip: fromZipTrimmed,
    })
    throw new Error('Indirizzo mittente (venditore) non valido o incompleto. Completa l\'indirizzo di spedizione prima di generare l\'etichetta.')
  }
  
  // Valida indirizzo destinatario (hub) PRIMA di creare parcelData
  const toStreet1Trimmed = params.toStreet1?.trim() || ''
  const toCityTrimmed = params.toCity?.trim() || ''
  const toZipTrimmed = params.toZip?.trim() || ''
  const toCountryTrimmed = (params.toCountry && params.toCountry.trim()) || 'IT'
  
  if (!toStreet1Trimmed || !toCityTrimmed || !toZipTrimmed) {
    console.error('[SENDCLOUD] Validation failed for toAddress:', {
      toStreet1: toStreet1Trimmed,
      toCity: toCityTrimmed,
      toZip: toZipTrimmed,
    })
    throw new Error(`Indirizzo hub non configurato correttamente: toStreet1="${toStreet1Trimmed}", toCity="${toCityTrimmed}", toZip="${toZipTrimmed}"`)
  }

  // Estrai numero civico per destinatario (hub)
  const toAddressParts = extractHouseNumber(toStreet1Trimmed)
  
  // Estrai numero civico per mittente (seller)
  const fromAddressParts = fromHouseNumberProvided 
    ? { street: fromStreet1Trimmed, houseNumber: fromHouseNumberProvided }
    : extractHouseNumber(fromStreet1Trimmed)
  
  // Valida valori destinatario (hub)
  const toAddress = toAddressParts.street || toStreet1Trimmed
  const toCity = toCityTrimmed
  const toPostalCode = toZipTrimmed
  const toCountry = toCountryTrimmed.toUpperCase()
  const toHouseNumber = toAddressParts.houseNumber
  
  if (!toAddress || !toCity || !toPostalCode || !toCountry) {
    throw new Error(`Campi destinatario mancanti: address="${toAddress}", city="${toCity}", postal_code="${toPostalCode}", country="${toCountry}"`)
  }
  
  // Valida valori mittente (seller)
  const fromAddress = fromAddressParts.street || fromStreet1Trimmed
  const fromCity = fromCityTrimmed
  const fromPostalCode = fromZipTrimmed
  const fromCountry = fromCountryTrimmed.toUpperCase()
  const fromHouseNumber = fromAddressParts.houseNumber
  
  if (!fromAddress || !fromCity || !fromPostalCode || !fromCountry) {
    throw new Error(`Campi mittente mancanti: address="${fromAddress}", city="${fromCity}", postal_code="${fromPostalCode}", country="${fromCountry}"`)
  }
  
  // Crea parcel data con struttura corretta Sendcloud API v2
  const parcelData: any = {
    // Destinatario (hub) - campi diretti nel parcel OBBLIGATORI
    name: (params.toName || 'SafeTrade Hub').trim(),
    address: toAddress,
    house_number: toHouseNumber,
    city: toCity,
    postal_code: toPostalCode,
    country: toCountry,
    
    // Mittente (seller) - campi from_* OBBLIGATORI
    from_name: (params.fromName && params.fromName.trim()) || 'Seller',
    from_address_1: fromAddress,
    from_house_number: fromHouseNumber,
    from_city: fromCity,
    from_postal_code: fromPostalCode,
    from_country: fromCountry,
    
    // Dati pacco OBBLIGATORI
    request_label: true,
    weight: String(params.weight || 0.5),
    order_number: params.transactionId,
    description: `SafeTrade Verified Escrow - Transaction ${params.transactionId}`,
  }
  
  // Aggiungi campi opzionali destinatario
  if (params.toName && params.toName.trim()) {
    parcelData.company_name = params.toName.trim()
  }
  if (params.toPhone && params.toPhone.trim()) {
    parcelData.telephone = params.toPhone.trim()
  }
  if (params.toEmail && params.toEmail.trim()) {
    parcelData.email = params.toEmail.trim()
  }
  
  // Aggiungi campi opzionali mittente
  if (params.fromPhone && params.fromPhone.trim()) {
    parcelData.from_telephone = params.fromPhone.trim()
  }
  if (params.fromEmail && params.fromEmail.trim()) {
    parcelData.from_email = params.fromEmail.trim()
  }
  
  // Aggiungi dimensioni se disponibili
  if (params.dimensions) {
    parcelData.length = String(params.dimensions.length || 30) // cm
    parcelData.width = String(params.dimensions.width || 20) // cm
    parcelData.height = String(params.dimensions.height || 5) // cm
  }

  // Se specificato courier, aggiungi (ma non è obbligatorio - Sendcloud sceglierà automaticamente)
  if (params.courier) {
    parcelData.carrier = params.courier
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[SENDCLOUD] Creating parcel...', {
      transactionId: params.transactionId,
      fromCity: fromCity,
      toCity: toCity,
      weight: params.weight,
      courier: params.courier || 'AUTO',
    })
    console.log('[SENDCLOUD] parcelData:', JSON.stringify(parcelData, null, 2))
  }

  // Chiamata API Sendcloud per creare parcel (shipment + label)
  const auth = getSendcloudAuth()
  
  // Sendcloud API v2 richiede SEMPRE il wrapper { parcel: ... }
  const requestBody = { parcel: parcelData }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[SENDCLOUD] Final request body:', JSON.stringify(requestBody, null, 2))
    console.log('[SENDCLOUD] Auth check:', `Basic ${auth.substring(0, 15)}... (length: ${auth.length})`)
    console.log('[SENDCLOUD] API URL:', `${baseUrl}/parcels`)
  }
  
  const response = await fetch(`${baseUrl}/parcels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })
  
  const responseText = await response.text()
  
  if (!response.ok) {
    console.error('[SENDCLOUD] API Error:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    })
    
    let errorMessage = `Sendcloud API error (${response.status})`
    let userFriendlyMessage = errorMessage
    
    try {
      const errorData = JSON.parse(responseText)
      if (errorData.error?.message) {
        errorMessage = errorData.error.message
        userFriendlyMessage = errorData.error.message
      } else if (errorData.error) {
        errorMessage = JSON.stringify(errorData.error)
        userFriendlyMessage = JSON.stringify(errorData.error)
      }
      
      // Controlla se l'errore è dovuto a carrier non disponibili
      const errorStr = JSON.stringify(errorData).toLowerCase()
      if (errorStr.includes('carrier') || errorStr.includes('shipping method') || 
          errorStr.includes('no rates') || errorStr.includes('no service') ||
          errorStr.includes('not available')) {
        userFriendlyMessage = 'Nessun corriere disponibile per questa spedizione. Verifica che almeno un carrier italiano sia attivo nella dashboard Sendcloud (es. Poste Italiane, GLS IT, InPost IT).'
      }
    } catch (e) {
      errorMessage = responseText.substring(0, 200)
      userFriendlyMessage = errorMessage
    }
    
    return {
      success: false,
      error: userFriendlyMessage,
    }
  }
  
  // Parse risposta
  let responseData: any
  try {
    responseData = JSON.parse(responseText)
  } catch (e) {
    console.error('[SENDCLOUD] Invalid JSON response:', responseText.substring(0, 200))
    return {
      success: false,
      error: `Invalid JSON response: ${responseText.substring(0, 200)}`,
    }
  }
  
  // Sendcloud restituisce { parcel: { ... } }
  const parcel = responseData.parcel || responseData
  
  if (!parcel || !parcel.id) {
    console.error('[SENDCLOUD] Invalid response structure:', JSON.stringify(responseData, null, 2))
    return {
      success: false,
      error: 'Risposta Sendcloud non valida: parcel.id mancante',
    }
  }
  
  // Estrai tracking number e label URL
  const trackingNumber = parcel.tracking_number || parcel.trackingNumber
  const labelUrl = parcel.label?.label_printer || parcel.label_url || parcel.labelUrl
  const shippingMethod = parcel.shipping_method || parcel.shippingMethod
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[SENDCLOUD] Parcel created successfully:', {
      parcelId: parcel.id,
      trackingNumber,
      labelUrl: labelUrl ? 'Present' : 'Missing',
      shippingMethod: shippingMethod?.name || 'N/A',
    })
  }
  
  return {
    success: true,
    sendcloudParcelId: String(parcel.id),
    sendcloudShipmentId: shippingMethod?.id ? String(shippingMethod.id) : undefined,
    trackingNumber: trackingNumber ? String(trackingNumber) : undefined,
    labelUrl: labelUrl ? String(labelUrl) : undefined,
    costAmount: shippingMethod?.price ? parseFloat(shippingMethod.price) : undefined,
    estimatedDelivery: shippingMethod?.min_delivery_time ? String(shippingMethod.min_delivery_time) : undefined,
  }
}

/**
 * Scarica PDF dell'etichetta da Sendcloud
 */
export async function downloadLabelPdf(parcelId: string): Promise<string | null> {
  const configValidation = validateSendcloudConfig()
  if (!configValidation.valid) {
    throw new Error(`Configurazione Sendcloud non valida: ${configValidation.errors.join(', ')}`)
  }
  
  const baseUrl = 'https://panel.sendcloud.sc/api/v2'
  const auth = getSendcloudAuth()
  
  if (process.env.NODE_ENV === 'development') console.log('[SENDCLOUD] Downloading label for parcel:', parcelId)
  
  // Sendcloud API: GET /parcels/{id}/label
  const response = await fetch(`${baseUrl}/parcels/${parcelId}/label`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/pdf',
    },
  })
  
  if (!response.ok) {
    console.error('[SENDCLOUD] Error downloading label:', response.status, response.statusText)
    return null
  }
  
  // Converti PDF in base64
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  
  if (process.env.NODE_ENV === 'development') console.log('[SENDCLOUD] Label downloaded successfully, size:', base64.length, 'bytes')
  
  return base64
}
