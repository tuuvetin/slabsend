// Countries where Slabsend currently operates (shipping supported)
// Update this list when expanding to new markets

export const SUPPORTED_COUNTRIES = [
  'Finland',
  'Sweden',
  'Estonia',
  'Latvia',
  'Lithuania',
]

// ISO-2 codes for the same countries — used in checkout and shipping logic
export const SUPPORTED_COUNTRY_CODES = ['FI', 'SE', 'EE', 'LV', 'LT']

// Map country name → ISO-2
export const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  'Finland':   'FI',
  'Sweden':    'SE',
  'Estonia':   'EE',
  'Latvia':    'LV',
  'Lithuania': 'LT',
}

export function countryToISO(country: string): string {
  return COUNTRY_NAME_TO_ISO[country] || country.toUpperCase().slice(0, 2)
}
