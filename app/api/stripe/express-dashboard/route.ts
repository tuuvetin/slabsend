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

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ error: 'No Stripe account found' }, { status: 404 })
  }

  const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id)
  return NextResponse.json({ url: loginLink.url })
}
