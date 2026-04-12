import { NextResponse } from 'next/server'

const BASE_URL = process.env.EASYSHIP_SANDBOX === 'true'
  ? 'https://public-api-sandbox.easyship.com'
  : 'https://public-api.easyship.com'

const countryToAlpha2: Record<string, string> = {
  'Austria': 'AT', 'Belgium': 'BE', 'Bulgaria': 'BG', 'Croatia': 'HR',
  'Cyprus': 'CY', 'Czech Republic': 'CZ', 'Denmark': 'DK', 'Estonia': 'EE',
  'Finland': 'FI', 'France': 'FR', 'Germany': 'DE', 'Greece': 'GR',
  'Hungary': 'HU', 'Iceland': 'IS', 'Ireland': 'IE', 'Italy': 'IT',
  'Latvia': 'LV', 'Liechtenstein': 'LI', 'Lithuania': 'LT', 'Luxembourg': 'LU',
  'Malta': 'MT', 'Netherlands': 'NL', 'Norway': 'NO', 'Poland': 'PL',
  'Portugal': 'PT', 'Romania': 'RO', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Spain': 'ES', 'Sweden': 'SE', 'Switzerland': 'CH', 'United Kingdom': 'GB',
  'United States': 'US', 'Canada': 'CA', 'Australia': 'AU',
  'New Zealand': 'NZ', 'Japan': 'JP',
}

const packageDimensions: Record<string, { length: number; width: number; height: number; weight: number }> = {
  'XS': { length: 25, width: 15, height: 3,  weight: 1  },
  'S':  { length: 30, width: 20, height: 15, weight: 3  },
  'M':  { length: 45, width: 35, height: 25, weight: 8  },
  'L':  { length: 60, width: 45, height: 40, weight: 15 },
}

export async function POST(req: Request) {
  const { originCountry, originCity, destinationCountry, destinationCity, packageSize, packageWeight, itemValue } = await req.json()

  const originAlpha2 = countryToAlpha2[originCountry]
  const destAlpha2 = countryToAlpha2[destinationCountry]

  if (!originAlpha2 || !destAlpha2) {
    return NextResponse.json({ error: `Unknown country: ${!originAlpha2 ? originCountry : destinationCountry}` }, { status: 400 })
  }

  const dims = packageDimensions[packageSize] || packageDimensions['M']
  const weight = packageWeight ? parseFloat(packageWeight) : dims.weight

  const body = {
    origin_address: {
      country_alpha2: originAlpha2,
      city: originCity || undefined,
    },
    destination_address: {
      country_alpha2: destAlpha2,
      city: destinationCity || undefined,
    },
    parcels: [{
      total_actual_weight: weight,
      box: {
        length: dims.length,
        width: dims.width,
        height: dims.height,
      },
      items: [{
        description: 'Climbing gear',
        category: 'sporting_goods',
        declared_currency: 'EUR',
        declared_customs_value: itemValue || 50,
        quantity: 1,
        actual_weight: weight,
        dimensions: { length: dims.length, width: dims.width, height: dims.height },
      }],
    }],
  }

  try {
    const res = await fetch(`${BASE_URL}/2024-09/rates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EASYSHIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Easyship rates error:', data)
      return NextResponse.json({ error: data?.error?.message || 'Easyship error', rates: [] }, { status: res.status })
    }

    const rates = (data.rates || [])
      .map((r: any) => ({
        id: r.courier_service_id,
        courier: r.courier_name,
        service: r.service_name,
        price: r.total_charge,
        currency: r.currency || 'EUR',
        minDays: r.min_delivery_time,
        maxDays: r.max_delivery_time,
      }))
      .sort((a: any, b: any) => a.price - b.price)

    return NextResponse.json({ rates })
  } catch (err: any) {
    console.error('Easyship fetch error:', err)
    return NextResponse.json({ error: err.message, rates: [] }, { status: 500 })
  }
}
