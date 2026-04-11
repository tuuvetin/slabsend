import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id')
    .eq('user_id', user.id)
    .single()

  let accountId = profile?.stripe_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FI',
      email: user.email,
      business_type: 'individual',
      individual: {
        email: user.email,
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'manual',
          },
        },
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    accountId = account.id

    await supabase.from('profiles').upsert(
      { user_id: user.id, stripe_account_id: accountId },
      { onConflict: 'user_id' }
    )
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/new?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/listings/new?stripe=success`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}