/**
 * Matkahuolto shipment tracking via XML API
 *
 * Endpoint: POST https://extservices.matkahuolto.fi/mpaketti/mhtrackingxml
 * Auth: same UserId/Password as shipment creation
 */

const PROD_ENDPOINT = 'https://extservices.matkahuolto.fi/mpaketti/mhtrackingxml'
const TEST_ENDPOINT = 'https://extservicestest.matkahuolto.fi/mpaketti/mhtrackingxml'

export type TrackingStatus = 'shipped' | 'delivered' | 'unknown'

function parseXmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

function parseXmlTagAll(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'g')
  const results: string[] = []
  let m
  while ((m = re.exec(xml)) !== null) results.push(m[1].trim())
  return results
}

// Status codes that indicate parcel is in transit
const SHIPPED_CODES = ['10', '20', '30', 'COLLECTED', 'IN_TRANSIT', 'SORTED']
// Status codes that indicate parcel has been delivered / arrived at pickup point
const DELIVERED_CODES = ['40', '50', 'DELIVERED', 'ARRIVED_AT_PICKUP', 'READY_FOR_PICKUP']

export async function getMatkahuoltoTrackingStatus(
  shipmentNumber: string,
): Promise<{ status: TrackingStatus; rawResponse?: string }> {
  const testMode = process.env.MATKAHUOLTO_TEST_MODE === 'true'
  const endpoint = testMode ? TEST_ENDPOINT : PROD_ENDPOINT
  const userId = testMode
    ? (process.env.MATKAHUOLTO_TEST_USER_ID || '9430023')
    : (process.env.MATKAHUOLTO_USER_ID || '15500710')
  const password = testMode
    ? (process.env.MATKAHUOLTO_TEST_PASSWORD || '456')
    : (process.env.MATKAHUOLTO_PASSWORD || '')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<MHTrackingRequest>
  <UserId>${userId}</UserId>
  <Password>${password}</Password>
  <Version>2.0</Version>
  <ShipmentNumber>${shipmentNumber}</ShipmentNumber>
</MHTrackingRequest>`

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body: xml,
      signal: AbortSignal.timeout(10_000),
    })

    const responseText = await res.text()

    const errorNbr = parseXmlTag(responseText, 'ErrorNbr')
    if (errorNbr && errorNbr !== '0') {
      console.warn('Matkahuolto tracking error:', errorNbr, parseXmlTag(responseText, 'ErrorMsg'))
      return { status: 'unknown', rawResponse: responseText.slice(0, 500) }
    }

    // Parse all status events — check latest/highest status
    const statuses = parseXmlTagAll(responseText, 'StatusCode')

    if (statuses.some(s => DELIVERED_CODES.includes(s.toUpperCase()))) {
      return { status: 'delivered', rawResponse: responseText.slice(0, 500) }
    }
    if (statuses.some(s => SHIPPED_CODES.includes(s.toUpperCase()))) {
      return { status: 'shipped', rawResponse: responseText.slice(0, 500) }
    }

    return { status: 'unknown', rawResponse: responseText.slice(0, 500) }
  } catch (err) {
    console.error('Matkahuolto tracking error:', err)
    return { status: 'unknown' }
  }
}
