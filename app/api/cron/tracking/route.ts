/**
 * Cron endpoint — syncs shipping status for all active orders
 *
 * Called by Vercel Cron every 2 hours (see vercel.json)
 * Protected by CRON_SECRET header
 *
 * Logic:
 *   - Fetch orders with status 'label_created' or 'shipped'
 *   - Determine carrier: activation_code set → Matkahuolto, else → Posti
 *   - Query tracking API → update status to 'shipped' or 'delivered'
 *   - 'delivered' also triggers auto_confirm window reset (48h from delivery)
 */

import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getPostiTrackingStatus } from '@/app/lib/postiTracking'
import { getMatkahuoltoTrackingStatus } from '@/app/lib/matkahuoltoTracking'

const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch orders that need tracking updates (created within last 30 days)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, tracking_number, activation_code, status, created_at')
    .in('status', ['label_created', 'shipped'])
    .not('tracking_number', 'is', null)
    .gte('created_at', cutoff.toISOString())

  if (error) {
    console.error('Tracking cron DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ synced: 0, message: 'No orders to track' })
  }

  const results: { orderId: number; orderNumber: string; carrier: string; newStatus: string }[] = []

  for (const order of orders) {
    const carrier = order.activation_code ? 'matkahuolto' : 'posti'
    const trackingNumber = order.tracking_number

    let newStatus: string | null = null

    try {
      if (carrier === 'posti') {
        const { status } = await getPostiTrackingStatus(trackingNumber)
        if (status === 'delivered') newStatus = 'delivered'
        else if (status === 'shipped' && order.status === 'label_created') newStatus = 'shipped'
      } else {
        const { status } = await getMatkahuoltoTrackingStatus(trackingNumber)
        if (status === 'delivered') newStatus = 'delivered'
        else if (status === 'shipped' && order.status === 'label_created') newStatus = 'shipped'
      }
    } catch (err) {
      console.error(`Tracking error for order ${order.order_number}:`, err)
      continue
    }

    if (newStatus && newStatus !== order.status) {
      const updatePayload: Record<string, any> = { status: newStatus }

      // When delivered, reset auto_confirm to 48h from now
      if (newStatus === 'delivered') {
        const autoConfirmAt = new Date()
        autoConfirmAt.setHours(autoConfirmAt.getHours() + 48)
        updatePayload.auto_confirm_at = autoConfirmAt.toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update(updatePayload)
        .eq('id', order.id)

      if (!updateError) {
        console.log(`Order ${order.order_number}: ${order.status} → ${newStatus}`)
        results.push({ orderId: order.id, orderNumber: order.order_number, carrier, newStatus })
      }
    }
  }

  return NextResponse.json({
    synced: results.length,
    checked: orders.length,
    updates: results,
  })
}
