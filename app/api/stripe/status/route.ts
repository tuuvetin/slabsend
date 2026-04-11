import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/utils/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ verified: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, stripe_onboarded')
    .eq('user_id', user.id)
    .single()

  if (!profile?.stripe_account_id) return NextResponse.json({ verified: false })

  // If already marked as onboarded in DB, trust it
  if (profile.stripe_onboarded) return NextResponse.json({ verified: true })

  // Otherwise check live from Stripe
  try {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id)
    const verified = account.charges_enabled === true

    if (verified) {
      await supabase
        .from('profiles')
        .update({ stripe_onboarded: true })
        .eq('user_id', user.id)
    }

    return NextResponse.json({ verified })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
