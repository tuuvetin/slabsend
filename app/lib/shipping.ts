// Matkahuolto-hinnat — Hinnasto 1.1.2026 (ALV 0%) + Slabsend-marginaali
//
// Kustannus meille (ALV 0% → ×1.255):
//   FI  Lähellä-paketti  ≤10 kg : 6,10 € → 7,66 € incl. ALV
//   BALTIC Ulkomaan Lähellä ≤10 kg : 7,96 € → 9,99 € incl. ALV
//   SE  Ulkomaan Lähellä  : 9,20 € + 0,31 €/kg → ~11,94 € (1 kg) incl. ALV
//
// Ostajalta veloitetaan (kiinteät, marginaali ~15–20 %):
//   FI     8,90 € (≤10 kg)  +0,50 €/lisäkg
//   BALTIC 11,90 € (≤10 kg) +0,50 €/lisäkg
//   SE     14,90 € (≤5 kg)  +0,60 €/lisäkg

export const SELLER_COUNTRIES = ['FI'] as const
export const BUYER_COUNTRIES = ['FI', 'EE', 'LV', 'LT', 'SE'] as const

export const BUYER_COUNTRY_NAMES: Record<string, string> = {
  FI: 'Finland',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  SE: 'Sweden',
}

export type BuyerCountry = typeof BUYER_COUNTRIES[number]
export type ShippingZone = 'FI' | 'BALTIC' | 'SE'

export function getShippingZone(buyerCountry: string): ShippingZone | null {
  if (buyerCountry === 'FI') return 'FI'
  if (['EE', 'LV', 'LT'].includes(buyerCountry)) return 'BALTIC'
  if (buyerCountry === 'SE') return 'SE'
  return null
}

export function getZoneLabel(zone: ShippingZone): string {
  if (zone === 'FI') return 'Finland'
  if (zone === 'BALTIC') return 'Estonia / Latvia / Lithuania'
  return 'Sweden'
}

export function getServiceName(zone: ShippingZone): string {
  if (zone === 'FI') return 'Matkahuolto Lähellä-paketti'
  if (zone === 'BALTIC') return 'Matkahuolto Ulkomaan Lähellä'
  return 'Matkahuolto Ulkomaan Lähellä (SE)'
}

/**
 * Palauttaa toimitushinnan senteissä (ALV sisältyy, B2C-hinta).
 *
 * FI     : 8,90 € (0–10 kg), +0,50 €/kg yli 10 kg
 * BALTIC : 11,90 € (0–10 kg), +0,50 €/kg yli 10 kg
 * SE     : 14,90 € (0–5 kg), +0,60 €/kg yli 5 kg
 */
export function calculateShippingCost(zone: ShippingZone, weightKg: number): number {
  const w = Math.max(1, Math.ceil(weightKg))   // min 1 kg, pyöristys ylös

  if (zone === 'FI') {
    if (w <= 10) return 890
    return 890 + (w - 10) * 50
  }

  if (zone === 'BALTIC') {
    if (w <= 10) return 1190
    return 1190 + (w - 10) * 50
  }

  // SE
  if (w <= 5) return 1490
  return 1490 + (w - 5) * 60
}

export function isValidBuyerCountry(country: string): country is BuyerCountry {
  return (BUYER_COUNTRIES as readonly string[]).includes(country)
}

export function isAddressComplete(profile: {
  address_street?: string | null
  address_postcode?: string | null
  address_city?: string | null
  phone?: string | null
}): boolean {
  return !!(
    profile.address_street?.trim() &&
    profile.address_postcode?.trim() &&
    profile.address_city?.trim() &&
    profile.phone?.trim()
  )
}
