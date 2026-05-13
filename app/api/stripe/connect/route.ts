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

  const createAccountAndLink = async (id: string | null) => {
    let acctId = id
    if (!acctId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'FI',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })
      acctId = account.id
      await supabase.from('profiles').upsert(
        { user_id: user.id, stripe_account_id: acctId, stripe_onboarded: false },
        { onConflict: 'user_id' }
      )
    }

    const accountLink = await stripe.accountLinks.create({
      account: acctId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?stripe=success`,
      type: 'account_onboarding',
    })
    return accountLink.url
  }

  try {
    const url = await createAccountAndLink(accountId)
    return NextResponse.json({ url })
  } catch (err: any) {
    // If stored account is from wrong Stripe mode, clear it and create fresh
    if (err?.message?.includes('live mode') || err?.message?.includes('test mode')) {
      try {
        await supabase.from('profiles').upsert(
          { user_id: user.id, stripe_account_id: null, stripe_onboarded: false },
          { onConflict: 'user_id' }
        )
        const url = await createAccountAndLink(null)
        return NextResponse.json({ url })
      } catch (err2: any) {
        return NextResponse.json({ error: err2?.message || 'Stripe error' }, { status: 500 })
      }
    }
    console.error('Stripe connect error:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 500 })
  }
}