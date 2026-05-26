/**
 * Posti SmartShip REST API — via Unifaun
 *
 * Base URL: https://api.unifaun.com/rs-extapi/v1
 * Auth:     HTTP Basic — split combined key by first hyphen to get id:secret
 * Service:  PO2103 = Postipaketti (domestic FI + international Baltic→FI)
 * Sender partners: { id: "POSTI", custNo: <logistics contract number> }
 *
 * Label PDF: returned in response pdfs[].href — valid 1 hour, requires same Basic auth.
 *            Downloaded server-side and returned as base64 for email attachment.
 */

const BASE_URL = 'https://api.unifaun.com/rs-extapi/v1'

function getAuthHeader(): string {
  const combinedKey = process.env.POSTI_API_KEY || ''
  // Format: {16-char id}-{24-char secret}
  const hyphenIdx = combinedKey.indexOf('-')
  if (hyphenIdx === -1) throw new Error('POSTI_API_KEY format invalid — expected {id}-{secret}')
  const id = combinedKey.substring(0, hyphenIdx)
  const secret = combinedKey.substring(hyphenIdx + 1)
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

export interface PostiShipmentParams {
  // Sender (seller)
  senderName: string
  senderAddress: string
  senderPostal: string
  senderCity: string
  senderCountry: string // ISO-2: 'FI' | 'EE' | 'LV' | 'LT'
  senderPhone: string
  senderEmail: string
  // Receiver (buyer)
  receiverName: string
  receiverAddress: string
  receiverPostal: string
  receiverCity: string
  receiverCountry: string // ISO-2
  receiverPhone: string
  receiverEmail: string
  // Package
  weightKg: number
  contents?: string
  // Reference
  senderReference: string
}

export interface PostiShipmentResult {
  success: boolean
  trackingNumber?: string
  labelPdfBase64?: string
  error?: string
  rawResponse?: string
}

export async function createPostiShipment(
  params: PostiShipmentParams,
): Promise<PostiShipmentResult> {
  const custNo = process.env.POSTI_CONTRACT_NUMBER || '690100'

  let authHeader: string
  try {
    authHeader = getAuthHeader()
  } catch (e) {
    return { success: false, error: String(e) }
  }

  const body = [
    {
      pdfConfig: {
        target1Media: 'laser-a5',
        target1XOffset: 0,
        target1YOffset: 0,
      },
      shipment: {
        sender: {
          name: params.senderName,
          address1: params.senderAddress,
          zipcode: params.senderPostal.replace(/\s/g, ''),
          city: params.senderCity,
          country: params.senderCountry,
          phone: params.senderPhone,
          email: params.senderEmail,
        },
        senderPartners: [{ id: 'POSTI', custNo }],
        receiver: {
          name: params.receiverName,
          address1: params.receiverAddress,
          zipcode: params.receiverPostal.replace(/\s/g, ''),
          city: params.receiverCity,
          country: params.receiverCountry,
          phone: params.receiverPhone,
          mobile: params.receiverPhone,
          email: params.receiverEmail,
        },
        // PO2103 = Postipaketti (Unifaun code — covers both domestic FI and Baltic→FI)
        service: { id: 'PO2103' },
        orderNo: params.senderReference,
        senderReference: params.senderReference,
      },
      parcels: [
        {
          copies: 1,
          weight: Math.max(0.1, params.weightKg),
          contents: params.contents || 'Climbing gear',
          valuePerParcel: true,
        },
      ],
    },
  ]

  let responseText = ''
  try {
    const res = await fetch(`${BASE_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    })

    responseText = await res.text()

    if (!res.ok) {
      return {
        success: false,
        error: `Posti API HTTP ${res.status}`,
        rawResponse: responseText.slice(0, 1000),
      }
    }

    const data = JSON.parse(responseText)
    const shipment = Array.isArray(data) ? data[0] : data

    const trackingNumber: string | undefined =
      shipment?.parcels?.[0]?.parcelNo || undefined

    // Find label PDF href (description === 'Label', or first entry)
    const labelEntry = shipment?.pdfs?.find(
      (p: any) => p.description === 'Label',
    ) || shipment?.pdfs?.[0]

    let labelPdfBase64: string | undefined
    if (labelEntry?.href) {
      try {
        const labelRes = await fetch(labelEntry.href, {
          headers: { Authorization: authHeader },
          signal: AbortSignal.timeout(15_000),
        })
        if (labelRes.ok) {
          const buf = await labelRes.arrayBuffer()
          labelPdfBase64 = Buffer.from(buf).toString('base64')
        } else {
          console.warn('Posti label download failed:', labelRes.status)
        }
      } catch (e) {
        console.error('Posti label fetch error:', e)
      }
    }

    return {
      success: true,
      trackingNumber,
      labelPdfBase64,
      rawResponse: responseText.slice(0, 500),
    }
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${String(err)}`,
      rawResponse: responseText.slice(0, 500),
    }
  }
}
