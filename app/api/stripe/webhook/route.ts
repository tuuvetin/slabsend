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
    const sellerUserId = session.metadata?.seller_user_id
    const buyerEmail = session.customer_details?.email

    if (listingId) {
      // Merkitään ilmoitus myydyksi
      await supabase.from('listings').update({ sold: true }).eq('id', listingId)

      // Haetaan ostajan user_id sähköpostilla
      const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', session.metadata?.buyer_id || '')
        .single()

      // Lasketaan summat
      const totalAmount = (session.amount_total || 0) / 100
      const serviceFee = Math.round(totalAmount * 0.08 * 100) / 100
      const baseAmount = totalAmount - serviceFee

      // Lasketaan auto-confirm 48h päähän
      const autoConfirmAt = new Date()
      autoConfirmAt.setHours(autoConfirmAt.getHours() + 48)

      // Luodaan order
      await supabase.from('orders').insert({
        listing_id: parseInt(listingId),
        buyer_id: session.metadata?.buyer_id || null,
        seller_id: sellerUserId || null,
        amount: baseAmount,
        service_fee: serviceFee,
        status: 'paid',
        stripe_session_id: session.id,
        auto_confirm_at: autoConfirmAt.toISOString(),
      })
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