/**
 * Shippo API Integration
 * 
 * Generazione etichette di spedizione per Verified Escrow
 * 
 * Documentazione: https://docs.goshippo.com/
 */

// Import Shippo - use named import
import { Shippo } from 'shippo'

// Initialize Shippo client (lazy initialization)
let shippoClient: Shippo | null = null

function getShippoClient(): Shippo {
  if (shippoClient) {
    return shippoClient
  }

  try {
    const apiKey = process.env.SHIPPO_API_KEY
    if (!apiKey) {
      throw new Error('SHIPPO_API_KEY non configurata nel file .env')
    }

    shippoClient = new Shippo({
      apiKeyHeader: apiKey,
      shippoApiVersion: '2018-02-08',
    })

    if (!shippoClient) {
      throw new Error('Shippo client initialization failed')
    }

    return shippoClient
  } catch (error: any) {
    console.error('[SHIPPO] Error initializing Shippo client:', error)
    throw new Error(`Failed to initialize Shippo client: ${error.message}`)
  }
}

// Type definitions (fallback if types not available)
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

type Parcel = {
  length: string
  width: string
  height: string
  distance_unit: string
  weight: string
  mass_unit: string
}

type Shipment = {
  address_from: Address
  address_to: Address
  parcels: Parcel[]
  async?: boolean
  carrier_accounts?: string[]
}

type ShippoTransaction = {
  object_id?: string
  rate?: string
  async?: boolean
  label_file_type?: string
  metadata?: string
  status?: string
  tracking_number?: string
  label_url?: string
  messages?: Array<{ text: string }>
}

type ShippoRate = {
  object_id?: string
  provider?: string
  servicelevel?: { name?: string }
  amount?: string
  currency?: string
  estimated_days?: number
  tracking_number?: string
}

// Configurazione hub SafeTrade (mittente)
const HUB_ADDRESS: Address = {
  name: process.env.SHIPPO_HUB_NAME || 'SafeTrade Hub',
  street1: process.env.SHIPPO_HUB_STREET1 || '',
  city: process.env.SHIPPO_HUB_CITY || '',
  state: process.env.SHIPPO_HUB_STATE || '',
  zip: process.env.SHIPPO_HUB_ZIP || '',
  country: process.env.SHIPPO_HUB_COUNTRY || 'IT',
  phone: process.env.SHIPPO_HUB_PHONE || '',
  email: process.env.SHIPPO_HUB_EMAIL || 'hub@safetrade.it',
}

export interface GenerateLabelParams {
  // Mittente (seller - chi spedisce)
  fromName?: string
  fromStreet1?: string
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
  courier?: string // 'dhl_express', 'ups', 'fedex', etc.
  service?: string // 'STANDARD', 'EXPRESS', etc.
  
  // Metadati
  transactionId: string
  metadata?: Record<string, any>
}

export interface GenerateLabelResult {
  success: boolean
  shippoTransactionId?: string
  shippoRateId?: string
  trackingNumber?: string
  labelUrl?: string
  labelPdfBase64?: string
  costAmount?: number // Costo reale corriere (in EUR)
  estimatedDelivery?: string
  error?: string
}

/**
 * Genera un'etichetta di spedizione usando Shippo
 */
export async function generateShippingLabel(
  params: GenerateLabelParams
): Promise<GenerateLabelResult> {
  try {
    // Valida API key
    if (!process.env.SHIPPO_API_KEY) {
      throw new Error('SHIPPO_API_KEY non configurata. Configura SHIPPO_API_KEY nel file .env')
    }

    // Valida indirizzo hub
    if (!HUB_ADDRESS.street1 || !HUB_ADDRESS.city || !HUB_ADDRESS.zip) {
      throw new Error('Indirizzo hub SafeTrade non configurato. Configura SHIPPO_HUB_* nel file .env')
    }

    // Crea indirizzo destinatario
    const toAddress: Address = {
      name: params.toName,
      street1: params.toStreet1,
      city: params.toCity,
      state: params.toState || '',
      zip: params.toZip,
      country: params.toCountry,
      phone: params.toPhone,
      email: params.toEmail,
    }

    // Crea indirizzo mittente (seller) - usa dati forniti o fallback
    const fromAddress: Address = {
      name: params.fromName || 'Seller',
      street1: params.fromStreet1 || 'Via da completare', // TODO: da User profile
      city: params.fromCity || 'Città',
      state: params.fromState || '',
      zip: params.fromZip || '00000', // TODO: da User profile
      country: params.fromCountry || 'IT',
      phone: params.fromPhone || '',
      email: params.fromEmail || '',
    }

    // Get Shippo client
    const client = getShippoClient()

    // Crea shipment in Shippo usando la sintassi corretta dell'API
    console.log('[SHIPPO] Creating shipment...', {
      transactionId: params.transactionId,
      courier: params.courier,
      weight: params.weight,
      fromCity: fromAddress.city,
      toCity: toAddress.city,
    })

    const shipmentData: any = {
      addressFrom: fromAddress, // SELLER (mittente)
      addressTo: toAddress,     // HUB (destinatario)
      parcels: [
        {
          length: String(params.dimensions?.length || 30), // Default 30cm
          width: String(params.dimensions?.width || 20),   // Default 20cm
          height: String(params.dimensions?.height || 5),  // Default 5cm
          distanceUnit: 'cm',
          weight: String(params.weight || 0.5), // Default 0.5kg
          massUnit: params.weightUnit || 'kg',
        }
      ],
    }

    // Se specificato courier, aggiungi
    // NOTA: Se non specifichi un courier, Shippo troverà automaticamente i carrier disponibili
    // Questo è utile quando carrier locali potrebbero non essere disponibili in modalità test
    if (params.courier) {
      shipmentData.carrierAccounts = [params.courier]
    }
    // Se NON specifichi courier, Shippo userà i suoi account di default disponibili per la rotta

    const createdShipment = await client.shipments.create(shipmentData)

    if (!createdShipment || !createdShipment.objectId) {
      throw new Error('Errore creazione shipment Shippo')
    }

    // Log completo per debugging
    console.log('[SHIPPO] Shipment created:', {
      shipmentId: createdShipment.objectId,
      ratesCount: createdShipment.rates?.length || 0,
      status: (createdShipment as any).status,
      messages: (createdShipment as any).messages,
    })

    // Verifica rates disponibili
    if (!createdShipment.rates || createdShipment.rates.length === 0) {
      console.error('[SHIPPO] No rates available. Shipment details:', {
        shipmentId: createdShipment.objectId,
        from: fromAddress,
        to: toAddress,
        messages: (createdShipment as any).messages,
        status: (createdShipment as any).status,
        errorMessages: (createdShipment as any).messages?.map((m: any) => m.text || m),
      })
      
      // Check if there are error messages from Shippo
      const errorMessages = (createdShipment as any).messages
      if (errorMessages && errorMessages.length > 0) {
        const messageText = errorMessages.map((m: any) => m.text || m).join(', ')
        throw new Error(`Shippo non può fornire tariffe: ${messageText}`)
      }
      
      throw new Error('Nessuna tariffa disponibile per questo shipment. Verifica che gli indirizzi siano validi e completi (via, città, CAP). In modalità test, alcuni carrier potrebbero non essere disponibili.')
    }

    // Seleziona rate (usa il primo disponibile o quello più economico)
    const selectedRate = createdShipment.rates[0] // TODO: logica selezione rate migliore

    if (!selectedRate || !selectedRate.objectId) {
      throw new Error('Nessuna tariffa valida trovata')
    }

    console.log('[SHIPPO] Selected rate:', {
      rateId: selectedRate.objectId,
      carrier: selectedRate.provider,
      service: selectedRate.servicelevel?.name,
      amount: selectedRate.amount,
      currency: selectedRate.currency,
    })

    // Crea transaction (genera etichetta) usando la sintassi corretta
    const transactionData: any = {
      rate: selectedRate.objectId,
      metadata: JSON.stringify({
        transactionId: params.transactionId,
        ...params.metadata,
      }),
    }

    const createdTransaction = await client.transactions.create(transactionData)

    if (!createdTransaction || !createdTransaction.objectId) {
      throw new Error('Errore creazione transaction Shippo')
    }

    // Verifica stato transaction
    if (createdTransaction.status === 'ERROR') {
      const errorMessages = createdTransaction.messages?.map((m: any) => m.text).join(', ') || 'Errore sconosciuto'
      throw new Error(`Errore Shippo: ${errorMessages}`)
    }

    if (createdTransaction.status !== 'SUCCESS') {
      throw new Error(`Transaction non riuscita. Status: ${createdTransaction.status}`)
    }

    // Estrai tracking number (usando la sintassi corretta)
    const trackingNumber = createdTransaction.trackingNumber || (selectedRate as { trackingNumber?: string }).trackingNumber || undefined

    // Estrai label URL (PDF) - potrebbe essere labelUrl o label_url
    const labelUrl = createdTransaction.labelUrl || (createdTransaction as any).label_url || undefined

    // Estrai cost amount (converti in EUR se necessario)
    let costAmount = parseFloat(selectedRate.amount || '0')
    const currency = selectedRate.currency || 'USD'
    
    // TODO: Conversione valuta se necessario (per ora assumiamo USD ≈ EUR o stesso currency)
    if (currency !== 'EUR') {
      console.warn(`[SHIPPO] Currency ${currency} diversa da EUR. Conversione non implementata.`)
      // Per ora usiamo amount così com'è
    }

    console.log('[SHIPPO] Label generated successfully:', {
      transactionId: params.transactionId,
      shippoTransactionId: createdTransaction.objectId,
      trackingNumber,
      costAmount,
      labelUrl,
    })

    return {
      success: true,
      shippoTransactionId: createdTransaction.objectId,
      shippoRateId: selectedRate.objectId,
      trackingNumber,
      labelUrl,
      costAmount,
      estimatedDelivery: selectedRate.estimatedDays 
        ? new Date(Date.now() + selectedRate.estimatedDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
    }
  } catch (error: any) {
    console.error('[SHIPPO] Error generating label:', error)
    return {
      success: false,
      error: error.message || 'Errore generazione etichetta Shippo',
    }
  }
}

/**
 * Scarica label PDF come base64
 */
export async function downloadLabelPdf(labelUrl: string): Promise<string | null> {
  try {
    const response = await fetch(labelUrl)
    if (!response.ok) {
      throw new Error(`Errore download label: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return base64
  } catch (error: any) {
    console.error('[SHIPPO] Error downloading label PDF:', error)
    return null
  }
}

/**
 * Valida configurazione Shippo
 */
export function validateShippoConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!process.env.SHIPPO_API_KEY) {
    errors.push('SHIPPO_API_KEY non configurata nel file .env')
  }

  if (!HUB_ADDRESS.street1) {
    errors.push('SHIPPO_HUB_STREET1 non configurato nel file .env')
  }

  if (!HUB_ADDRESS.city) {
    errors.push('SHIPPO_HUB_CITY non configurato nel file .env')
  }

  if (!HUB_ADDRESS.zip) {
    errors.push('SHIPPO_HUB_ZIP non configurato nel file .env')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

