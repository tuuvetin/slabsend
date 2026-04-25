import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

export async function GET(req: Request) {
  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || '6m'

  const since = new Date()
  if (range === '1m') since.setMonth(since.getMonth() - 1)
  else if (range === '3m') since.setMonth(since.getMonth() - 3)
  else if (range === '6m') since.setMonth(since.getMonth() - 6)
  else if (range === '1y') since.setFullYear(since.getFullYear() - 1)
  else since.setFullYear(2000)

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, status, amount, service_fee, created_at, confirmed_at, auto_confirm_at,
      listing:listing_id ( title, price ),
      buyer:buyer_id ( id ),
      seller:seller_id ( id )
    `)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
