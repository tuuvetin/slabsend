import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature failed' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const supabase = await createClient()
    const listingId = session.metadata?.listing_id

    if (listingId) {
      await supabase.from('listings').update({ sold: true }).eq('id', listingId)
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    if (account.charges_enabled) {
      const supabase = await createClient()
      await supabase.from('profiles').update({ stripe_onboarded: true }).eq('stripe_account_id', account.id)
    }
  }

  return NextResponse.json({ received: true })
}