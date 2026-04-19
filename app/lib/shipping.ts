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
  if (zone === 'FI') return 'Suomi'
  if (zone === 'BALTIC') return 'Baltia'
  return 'Ruotsi'
}

// Matkahuolto-hinnat snt, sis. ALV 25,5%
// Perus 0–10 kg, lisä per kg yli 10 kg
export function calculateShippingCost(zone: ShippingZone, weightKg: number): number {
  const baseCents: Record<ShippingZone, number> = {
    FI: 890,      // 8,90 €
    BALTIC: 1190, // 11,90 €
    SE: 1290,     // 12,90 €
  }
  const base = baseCents[zone]
  const extraKg = Math.max(0, Math.ceil(weightKg) - 10)
  const extraPerKg = 39 // 0,39 € / kg yli 10 kg
  return base + extraKg * extraPerKg
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
