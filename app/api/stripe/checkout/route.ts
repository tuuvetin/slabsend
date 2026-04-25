import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { listingId, amount, shippingCostCents, shippingZone, buyerCountry } = await req.json()

  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .single()

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

  const commissionRate = parseFloat(process.env.NEXT_PUBLIC_COMMISSION_RATE || '0.08')
  const baseAmount = Math.round(amount * 100)
  const serviceFee = Math.round(baseAmount * commissionRate)
  const shippingCents = shippingCostCents ? Math.round(shippingCostCents) : 0

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
        product_data: { name: 'Slabsend service fee' },
        unit_amount: serviceFee,
      },
      quantity: 1,
    },
  ]

  if (shippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: 'Shipping (Matkahuolto)' },
        unit_amount: shippingCents,
      },
      quantity: 1,
    })
  }

  // Allowed shipping countries must match BUYER_COUNTRIES in app/lib/shipping.ts
  const allowedCountries = ['FI', 'EE', 'LV', 'LT', 'SE'] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[]

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    shipping_address_collection: { allowed_countries: allowedCountries },
    phone_number_collection: { enabled: true },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=cancelled`,
    metadata: {
      listing_id: listingId,
      seller_user_id: listing.user_id,
      buyer_id: user.id,
      base_amount: baseAmount.toString(),
      service_fee: serviceFee.toString(),
      shipping_cost: shippingCents.toString(),
      shipping_zone: shippingZone || '',
      buyer_country: buyerCountry || '',
    },
  })

  return NextResponse.json({ url: session.url })
}