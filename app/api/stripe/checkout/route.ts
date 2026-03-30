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

  const { data: sellerProfile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
        .eq('user_id', listing.user_id)
    .single()

  if (!sellerProfile?.stripe_account_id) {
    return NextResponse.json({ error: 'Seller has not connected Stripe' }, { status: 400 })
  }

  const commissionRate = parseFloat(process.env.NEXT_PUBLIC_COMMISSION_RATE || '0.08')
  const amountInCents = Math.round(amount * 100)
  const commissionInCents = Math.round(amountInCents * commissionRate)

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: listing.title },
        unit_amount: amountInCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/${listingId}?payment=cancelled`,
    payment_intent_data: {
      application_fee_amount: commissionInCents,
      transfer_data: { destination: sellerProfile.stripe_account_id },
    },
  })

  return NextResponse.json({ url: session.url })
}