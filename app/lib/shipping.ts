// Matkahuolto-hinnat — Casavend Oy hintaliite 19.04.2026
// Kaikki hinnat ALV 0% → kerrotaan × 1.255 (ALV 25,5%)

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

const VAT = 1.255

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

export function getServiceName(zone: ShippingZone): string {
  if (zone === 'FI') return 'Matkahuolto XXS'
  if (zone === 'BALTIC') return 'Matkahuolto Ulkomaan Lähellä'
  return 'Matkahuolto Ulkomaan Lähellä (SE)'
}

/**
 * Laskee toimitushinnan senteissä, ALV 25,5% sisältyen.
 *
 * FI   → XXS: kiinteä 4,86 € (alv 0) = 6,10 € (alv 25,5%)
 *         Yli 3x25x40cm tai paino yli XXS → Lähellä-paketti:
 *         0–10 kg = 6,10 € (alv 0), lisä 0,31 €/kg yli 10 kg
 *
 * BALTIC (EE/LV/LT) → Ulkomaan Lähellä FIEE/FILT/FILV:
 *         0–10 kg = 7,96 € (alv 0), lisä 0,31 €/kg yli 10 kg
 *
 * SE   → Ulkomaan Lähellä FISE:
 *         perushinta 9,20 € (alv 0) + 0,31 €/kg (kaikki kilot)
 */
export function calculateShippingCost(zone: ShippingZone, weightKg: number): number {
  const w = Math.max(0.1, weightKg)

  if (zone === 'FI') {
    // Käytetään XXS kun mahtuu (3x25x40cm) → ilmoituksen tekijä valitsee
    // XXS: 4,86 € alv0, kiinteä
    // Lähellä: 6,10 € / 10 kg + 0,31 € / lisäkg
    // MVP: kaikki FI-lähetykset XXS-hinnalla, jos paino > 10 kg → Lähellä
    if (w <= 10) {
      // Pienet: XXS 4,86 alv0
      return Math.round(4.86 * VAT * 100)  // 610 snt = 6,10 €
    } else {
      const extra = Math.ceil(w) - 10
      return Math.round((6.10 + extra * 0.31) * VAT * 100)
    }
  }

  if (zone === 'BALTIC') {
    // FIEE/FILT/FILV: 7,96 € / 10 kg, +0,31 €/kg yli 10 kg
    if (w <= 10) {
      return Math.round(7.96 * VAT * 100)  // 999 snt ≈ 9,99 €
    } else {
      const extra = Math.ceil(w) - 10
      return Math.round((7.96 + extra * 0.31) * VAT * 100)
    }
  }

  // SE: FISE: 9,20 € per lähetys + 0,31 €/kg kaikki kilot
  return Math.round((9.20 + Math.ceil(w) * 0.31) * VAT * 100)
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
