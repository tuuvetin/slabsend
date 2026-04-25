import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // Auth check
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      listing:listing_id ( title, price, weight_kg, images ),
      seller_profile:profiles!orders_seller_id_fkey ( username, full_name, address_street, address_postcode, address_city, phone )
    `)
    .eq('id', params.id)
    .single()

  if (error || !order) {
    // Fallback: try without the join if FK hint fails
    const { data: orderPlain } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!orderPlain) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // Fetch related data separately
    const [{ data: listing }, { data: sellerProfile }] = await Promise.all([
      supabaseAdmin.from('listings').select('title, price, weight_kg, images').eq('id', orderPlain.listing_id).single(),
      orderPlain.seller_id
        ? supabaseAdmin.from('profiles').select('username, full_name, address_street, address_postcode, address_city, phone').eq('user_id', orderPlain.seller_id).single()
        : Promise.resolve({ data: null }),
    ])

    // Get seller email
    let sellerEmail = ''
    if (orderPlain.seller_id) {
      try {
        const { data: { user: sellerUser } } = await supabaseAdmin.auth.admin.getUserById(orderPlain.seller_id)
        sellerEmail = sellerUser?.email || ''
      } catch {}
    }

    return NextResponse.json({ ...orderPlain, listing, seller_profile: sellerProfile, seller_email: sellerEmail })
  }

  // Get seller email
  let sellerEmail = ''
  if (order.seller_id) {
    try {
      const { data: { user: sellerUser } } = await supabaseAdmin.auth.admin.getUserById(order.seller_id)
      sellerEmail = sellerUser?.email || ''
    } catch {}
  }

  return NextResponse.json({ ...order, seller_email: sellerEmail })
}
