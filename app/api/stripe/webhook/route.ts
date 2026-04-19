import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const resend = new Resend(process.env.RESEND_API_KEY!)
const supabaseAdmin = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `SLB-${timestamp}-${random}`
}

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
    const listingId = session.metadata?.listing_id
    const sellerUserId = session.metadata?.seller_user_id
    const buyerId = session.metadata?.buyer_id
    const buyerEmail = session.customer_details?.email || ''

    if (!listingId) return NextResponse.json({ received: true })

    // Merkitään ilmoitus myydyksi
    await supabaseAdmin.from('listings').update({ sold: true }).eq('id', listingId)

    // Lasketaan summat (senttiinä)
    const totalCents = session.amount_total || 0
    const itemPriceCents = session.metadata?.base_amount ? parseInt(session.metadata.base_amount) : 0
    const shippingCostCents = session.metadata?.shipping_cost ? parseInt(session.metadata.shipping_cost) : 0
    const serviceFeeCents = session.metadata?.service_fee ? parseInt(session.metadata.service_fee) : 0
    // Backwards compat
    const totalAmount = totalCents / 100
    const baseAmount = parseFloat((itemPriceCents / 100).toFixed(2))
    const serviceFee = parseFloat((serviceFeeCents / 100).toFixed(2))

    // 48h auto-confirm
    const autoConfirmAt = new Date()
    autoConfirmAt.setHours(autoConfirmAt.getHours() + 48)

    // Luodaan tilausnumero
    const orderNumber = generateOrderNumber()

    // Ostajan osoite Stripe-sessiosta
    const shippingDetails = session.shipping_details || session.customer_details
    const buyerAddress = shippingDetails?.address || {}
    const buyerPhone = session.customer_details?.phone || ''
    const buyerCountry = (buyerAddress as any).country || session.metadata?.buyer_country || ''

    // Haetaan ostajan profiiliosoite jos ei tule Stripestä
    let buyerAddressStreet = (buyerAddress as any).line1 || ''
    let buyerAddressPostcode = (buyerAddress as any).postal_code || ''
    let buyerAddressCity = (buyerAddress as any).city || ''
    let buyerPhoneFinal = buyerPhone

    if (buyerId && (!buyerAddressStreet || !buyerPhoneFinal)) {
      const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('address_street, address_postcode, address_city, phone')
        .eq('user_id', buyerId)
        .maybeSingle()
      if (buyerProfile) {
        buyerAddressStreet = buyerAddressStreet || buyerProfile.address_street || ''
        buyerAddressPostcode = buyerAddressPostcode || buyerProfile.address_postcode || ''
        buyerAddressCity = buyerAddressCity || buyerProfile.address_city || ''
        buyerPhoneFinal = buyerPhoneFinal || buyerProfile.phone || ''
      }
    }

    // Luodaan order
    const orderNumber2 = orderNumber
    await supabaseAdmin.from('orders').insert({
      listing_id: parseInt(listingId),
      buyer_id: buyerId || null,
      seller_id: sellerUserId || null,
      amount: baseAmount,
      service_fee: serviceFee,
      status: 'paid',
      stripe_session_id: session.id,
      auto_confirm_at: autoConfirmAt.toISOString(),
      order_number: orderNumber2,
      // Uudet kentät
      item_price_cents: itemPriceCents,
      shipping_cost_cents: shippingCostCents,
      service_fee_cents: serviceFeeCents,
      total_cents: totalCents,
      shipping_zone: session.metadata?.shipping_zone || null,
      buyer_address_street: buyerAddressStreet,
      buyer_address_postcode: buyerAddressPostcode,
      buyer_address_city: buyerAddressCity,
      buyer_country: buyerCountry,
      buyer_phone: buyerPhoneFinal,
      buyer_email: buyerEmail,
    })

    // Haetaan ilmoituksen tiedot
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('title, user_id')
      .eq('id', listingId)
      .single()

    // Haetaan myyjän profiili
    const { data: sellerProfile } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name')
      .eq('user_id', sellerUserId || '')
      .single()

    const sellerName = sellerProfile?.username || sellerProfile?.full_name || 'Seller'

    // Haetaan myyjän sähköposti admin-clientillä
    let sellerEmail = ''
    try {
      const { data: { user: sellerUser } } = await supabaseAdmin.auth.admin.getUserById(sellerUserId || '')
      sellerEmail = sellerUser?.email || ''
    } catch (e) {
      console.error('Error fetching seller email:', e)
    }

    // Merkitään kaikki avoimet tarjoukset perutuiksi
    await supabaseAdmin
      .from('messages')
      .update({ offer_status: 'declined' })
      .eq('listing_id', listingId)
      .eq('offer_status', 'pending')

    // Lisätään viesti chattiin ostajan ja myyjän välille
    if (buyerId && sellerUserId) {
  await supabaseAdmin.from('messages').insert({
        sender_id: buyerId,
        receiver_id: sellerUserId,
        listing_id: parseInt(listingId),
        content: `✅ Payment confirmed for "${listing?.title}". Order #${orderNumber}. The seller will receive ${baseAmount} € when you confirm receipt.`,
      })
    }

    // Sähköposti myyjälle
    if (sellerEmail) {
      await resend.emails.send({
        from: 'Slabsend <info@slabsend.com>',
        to: sellerEmail,
        subject: `Your item "${listing?.title}" has been sold!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FC7038;">Your item has been sold! 🎉</h2>
            <p>Hi ${sellerName},</p>
            <p><strong>${listing?.title}</strong> has been purchased.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${orderNumber}</strong></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${listing?.title}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Amount you'll receive</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${baseAmount} €</strong></td></tr>
            </table>
            <p>Please ship the item as soon as possible. The buyer has 48 hours to confirm receipt, after which you'll receive your payment.</p>
            <p>Questions? Contact <a href="mailto:info@slabsend.com">info@slabsend.com</a></p>
            <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
          </div>
        `,
      })
    }

    // Sähköposti ostajalle
    if (buyerEmail) {
      await resend.emails.send({
        from: 'Slabsend <info@slabsend.com>',
        to: buyerEmail,
        subject: `Order confirmed: ${listing?.title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FC7038;">Order confirmed! ✓</h2>
            <p>Thank you for your purchase.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${orderNumber}</strong></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${listing?.title}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total paid</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${totalAmount} €</strong></td></tr>
            </table>
            <p>Once you receive the item, please confirm receipt on the listing page. If anything is wrong, contact us within 48 hours at <a href="mailto:info@slabsend.com">info@slabsend.com</a></p>
            <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
          </div>
        `,
      })
    }

    // Sähköposti Slabsendille
    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: 'info@slabsend.com',
      subject: `New order: ${listing?.title} — ${orderNumber}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New order received</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${orderNumber}</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${listing?.title}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Buyer email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${buyerEmail}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Seller</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${sellerName} (${sellerEmail})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total paid</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${totalAmount} €</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">To transfer to seller</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${baseAmount} €</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Slabsend fee</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${serviceFee} €</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Stripe session</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${session.id}</td></tr>
          </table>
          <p><strong>Action needed:</strong> Transfer ${baseAmount} € to seller after buyer confirms receipt or after 48 hours.</p>
        </div>
      `,
    })
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    if (account.charges_enabled) {
      await supabaseAdmin.from('profiles').update({ stripe_onboarded: true }).eq('stripe_account_id', account.id)
    }
  }

  return NextResponse.json({ received: true })
}
