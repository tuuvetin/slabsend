import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId, amount } = await req.json()

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const commissionRate = parseFloat(process.env.NEXT_PUBLIC_COMMISSION_RATE || '0.08')
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

  // Fallback: if no options (e.g. shipping_enabled=false and pickup_enabled=false), add basic shipping
  if (shippingOptions.length === 0) {
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 890, currency: 'eur' },
        display_name: 'Standard shipping (Matkahuolto)',
      },
    })
  }

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
    },
  })

  return NextResponse.json({ url: session.url })
}
