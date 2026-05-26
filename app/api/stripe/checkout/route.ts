import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'
import { countryToISO } from '@/app/lib/countries'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// FI buyer + FI seller: buyer picks carrier
const FINLAND_POSTI_OPTION: Stripe.Checkout.SessionCreateParams.ShippingOption = {
  shipping_rate_data: {
    type: 'fixed_amount',
    fixed_amount: { amount: 890, currency: 'eur' },
    display_name: 'Posti — pickup from Posti point',
    metadata: { carrier: 'posti' },
    delivery_estimate: {
      minimum: { unit: 'business_day', value: 1 },
      maximum: { unit: 'business_day', value: 3 },
    },
  },
}

const FINLAND_MATKAHUOLTO_OPTION: Stripe.Checkout.SessionCreateParams.ShippingOption = {
  shipping_rate_data: {
    type: 'fixed_amount',
    fixed_amount: { amount: 890, currency: 'eur' },
    display_name: 'Matkahuolto — pickup from Matkahuolto point',
    metadata: { carrier: 'matkahuolto' },
    delivery_estimate: {
      minimum: { unit: 'business_day', value: 1 },
      maximum: { unit: 'business_day', value: 3 },
    },
  },
}

// FI seller → SE buyer
const SWEDEN_OPTION: Stripe.Checkout.SessionCreateParams.ShippingOption = {
  shipping_rate_data: {
    type: 'fixed_amount',
    fixed_amount: { amount: 1090, currency: 'eur' },
    display_name: 'Matkahuolto — Sweden pickup point',
    metadata: { carrier: 'matkahuolto', zone: 'SE' },
    delivery_estimate: {
      minimum: { unit: 'business_day', value: 3 },
      maximum: { unit: 'business_day', value: 6 },
    },
  },
}

// Baltic seller → any buyer: slightly higher price to cover Baltic→FI Posti costs
const FINLAND_POSTI_ONLY_OPTION: Stripe.Checkout.SessionCreateParams.ShippingOption = {
  shipping_rate_data: {
    type: 'fixed_amount',
    fixed_amount: { amount: 1190, currency: 'eur' },
    display_name: 'Posti — pickup from Posti point',
    metadata: { carrier: 'posti' },
    delivery_estimate: {
      minimum: { unit: 'business_day', value: 2 },
      maximum: { unit: 'business_day', value: 5 },
    },
  },
}


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

  // Seller's country (ISO-2) — determines available carriers and price
  const sellerCountryISO: string = listing.shipping_from_country || 'FI'
  const isBalticSeller = ['EE', 'LV', 'LT'].includes(sellerCountryISO)

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

  // Buyer's country ISO — used to show only relevant shipping options
  const buyerISO: string =
    buyerProfile?.address_country ||
    countryToISO(buyerProfile?.country || '') ||
    'FI'
  const isSEBuyer = buyerISO === 'SE'
  const isBalticBuyer = ['EE', 'LV', 'LT'].includes(buyerISO)

  const shippingOptions: Stripe.Checkout.SessionCreateParams.ShippingOption[] = []

  if (listing.listing_type === 'rent') {
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 0, currency: 'eur' },
        display_name: 'Pickup / Nouto',
      },
    })
  } else if (isBalticSeller) {
    // Baltic seller → always €11.90 Posti regardless of buyer country
    shippingOptions.push(FINLAND_POSTI_ONLY_OPTION)
  } else if (isSEBuyer) {
    // FI seller → SE buyer: only Sweden option
    shippingOptions.push(SWEDEN_OPTION)
  } else if (isBalticBuyer) {
    // FI seller → Baltic buyer: Posti only (covers FI→EE/LV/LT via Omniva)
    shippingOptions.push(FINLAND_POSTI_OPTION)
  } else {
    // FI seller → FI buyer (default): Posti or Matkahuolto
    shippingOptions.push(FINLAND_POSTI_OPTION, FINLAND_MATKAHUOLTO_OPTION)
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
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?listing=${listingId}`,
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
