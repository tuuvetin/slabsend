/**
 * Posti shipment tracking via nShift/Unifaun REST API
 *
 * Endpoint: GET /rs-extapi/v1/trackingevents/{parcelNo}
 * Auth: same Basic auth as shipment creation
 *
 * Status mapping:
 *   shipped  → parcel scanned at drop-off / sorting centre
 *   delivered → parcel delivered to pickup point or recipient
 */

const BASE_URL = 'https://api.unifaun.com/rs-extapi/v1'

function getAuthHeader(): string {
  const combinedKey = process.env.POSTI_API_KEY || ''
  const hyphenIdx = combinedKey.indexOf('-')
  if (hyphenIdx === -1) throw new Error('POSTI_API_KEY format invalid')
  const id = combinedKey.substring(0, hyphenIdx)
  const secret = combinedKey.substring(hyphenIdx + 1)
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64')
}

export type TrackingStatus = 'shipped' | 'delivered' | 'unknown'

// nShift event codes that indicate parcel is in transit
const SHIPPED_CODES = [
  'COLLECTED',
  'PICKUP',
  'ITEM_PICKED_UP',
  'SORTED',
  'IN_TRANSIT',
  'ITEM_SORTED_IN_TRANSPORT_SORTING_CENTER',
  'ITEM_PICKED_UP_BY_POSTMAN',
]

// nShift event codes that indicate parcel has been delivered
const DELIVERED_CODES = [
  'DELIVERED',
  'ITEM_DELIVERED_TO_RECIPIENT',
  'ITEM_ARRIVED_AT_PICKUP_POINT',
  'DELIVERED_TO_PICKUP_POINT',
]

export async function getPostiTrackingStatus(
  parcelNo: string,
): Promise<{ status: TrackingStatus; rawEvents?: any[] }> {
  let authHeader: string
  try {
    authHeader = getAuthHeader()
  } catch {
    return { status: 'unknown' }
  }

  try {
    const res = await fetch(`${BASE_URL}/trackingevents/${encodeURIComponent(parcelNo)}`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      console.warn('Posti tracking HTTP error:', res.status, parcelNo)
      return { status: 'unknown' }
    }

    const events: any[] = await res.json()
    if (!Array.isArray(events) || events.length === 0) return { status: 'unknown' }

    // Check most recent events first
    const codes = events.map((e: any) => (e.eventCode || e.status || '').toUpperCase())

    if (codes.some(c => DELIVERED_CODES.includes(c))) return { status: 'delivered', rawEvents: events }
    if (codes.some(c => SHIPPED_CODES.includes(c))) return { status: 'shipped', rawEvents: events }

    return { status: 'unknown', rawEvents: events }
  } catch (err) {
    console.error('Posti tracking error:', err)
    return { status: 'unknown' }
  }
}
