import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { SUPPORTED_COUNTRY_CODES, COUNTRY_NAME_TO_ISO } from '@/app/lib/countries'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const FINLAND = ['FI']
const NORDIC_BALTIC = ['EE', 'LV', 'LT', 'SE']

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId, amount, rentalBookingId } = await req.json()

  const [{ data: listing }, { data: buyerProfile }] = await Promise.all([
    supabase.from('listings').select('*').eq('id', listingId).single(),
    supabase.from('profiles').select('country, address_country').eq('user_id', user.id).single(),
  ])

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  // Resolve buyer's country to ISO-2 code
  const rawCountry = buyerProfile?.address_country || buyerProfile?.country || ''
  const buyerISO = COUNTRY_NAME_TO_ISO[rawCountry] || (SUPPORTED_COUNTRY_CODES.includes(rawCountry.toUpperCase()) ? rawCountry.toUpperCase() : '')

  // Rentals are pickup-only — no country restriction
  const isPickupOnly = listing.listing_type === 'rent' || (listing.pickup_enabled && listing.shipping_enabled === false)

  // Block buyers from unsupported countries for shipped goods
  if (!isPickupOnly && rawCountry && !buyerISO) {
    return NextResponse.json({
      error: 'Slabsend currently ships only to Finland, Sweden, Estonia, Latvia and Lithuania. Your profile country is not supported.',
    }, { status: 400 })
  }

  const isFinland = FINLAND.includes(buyerISO)
  const isNordic = NORDIC_BALTIC.includes(buyerISO)
  const unknownCountry = !isFinland && !isNordic

  const commissionRate = 0.10
  const baseAmount = Math.round(amount * 100)
  const serviceFee = Math.round(baseAmount * commissionRate)

  const lineItems: any[] = [
    {
      price_data: {
        currency: 'eur',
        product_data: { name: listing.title },
        unit_amount: baseAmount,
      },
      quantity: 1,
    },
    {
      price_data: {
        currency: 'eur',
        product_data: { name: 'Slabsend buyer protection' },
        unit_amount: serviceFee,
      },
      quantity: 1,
    },
  ]

  const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = []

  if (listing.pickup_enabled) {
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'eur' },
        display_name: 'Pickup / Nouto',
      },
    })
  }

  if (listing.shipping_enabled !== false) {
    // Show Finland option only to Finnish buyers (or unknown as fallback)
    if (isFinland || unknownCountry) {
      shippingOptions.push({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 890, currency: 'eur' },
          display_name: 'Standard shipping — Finland (Matkahuolto)',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 1 },
            maximum: { unit: 'business_day' as const, value: 3 },
          },
        },
      })
    }
    // Show Nordic option to non-Finnish buyers (or unknown as fallback)
    if (isNordic || unknownCountry) {
      shippingOptions.push({
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 1490, currency: 'eur' },
          display_name: 'Standard shipping — Nordic & Baltic',
          delivery_estimate: {
            minimum: { unit: 'business_day' as const, value: 3 },
            maximum: { unit: 'business_day' as const, value: 7 },
          },
        },
      })
    }
  }

  // Fallback: if nothing resolved, show basic shipping
  if (shippingOptions.length === 0) {
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 890, currency: 'eur' },
        display_name: 'Standard shipping (Matkahuolto)',
      },
    })
  }

  // Allowed countries: show address collection for all supported countries
  const allowedCountries = ['FI', 'EE', 'LV', 'LT', 'SE'] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    shipping_address_collection: { allowed_countries: allowedCountries },
    shipping_options: shippingOptions,
    phone_number_collection: { enabled: true },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=cancelled`,
    metadata: {
      listing_id: listingId,
      seller_user_id: listing.user_id,
      buyer_id: user.id,
      base_amount: baseAmount.toString(),
      service_fee: serviceFee.toString(),
      ...(rentalBookingId ? { rental_booking_id: String(rentalBookingId) } : {}),
    },
  })

  return NextResponse.json({ url: session.url })
}
