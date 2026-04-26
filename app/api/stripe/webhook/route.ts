import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { createMatkahuoltoShipment } from '@/app/lib/matkahuolto'

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
    // Shipping cost comes from Stripe's shipping_options selection
    const shippingCostCents = (session as any).shipping_cost?.amount_total ?? (session.metadata?.shipping_cost ? parseInt(session.metadata.shipping_cost) : 0)
    const serviceFeeCents = session.metadata?.service_fee ? parseInt(session.metadata.service_fee) : 0
    // Backwards compat
    const totalAmount = totalCents / 100
    const baseAmount = parseFloat((itemPriceCents / 100).toFixed(2))
    const serviceFee = parseFloat((serviceFeeCents / 100).toFixed(2))
    // Detect shipping zone from buyer's country (set by Stripe address collection)
    const sessionAny2 = session as any
    const shippingCountry = sessionAny2.shipping_details?.address?.country || session.metadata?.buyer_country || ''
    const shippingZone: string = shippingCostCents === 0 ? 'pickup' : (shippingCountry || session.metadata?.shipping_zone || '')

    // 48h auto-confirm
    const autoConfirmAt = new Date()
    autoConfirmAt.setHours(autoConfirmAt.getHours() + 48)

    // Luodaan tilausnumero
    const orderNumber = generateOrderNumber()

    // Ostajan osoite Stripe-sessiosta
    const sessionAny = session as any
    const buyerAddress = sessionAny.shipping_details?.address || session.customer_details?.address || {}
    const buyerPhone = session.customer_details?.phone || ''
    const buyerCountry = buyerAddress.country || session.metadata?.buyer_country || ''

    // Haetaan ostajan profiiliosoite jos ei tule Stripestä
    let buyerAddressStreet = buyerAddress.line1 || ''
    let buyerAddressPostcode = buyerAddress.postal_code || ''
    let buyerAddressCity = buyerAddress.city || ''
    let buyerPhoneFinal = buyerPhone
    let buyerName = session.customer_details?.name || ''

    if (buyerId && (!buyerAddressStreet || !buyerPhoneFinal)) {
      const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('address_street, address_postcode, address_city, phone, full_name, username')
        .eq('user_id', buyerId)
        .maybeSingle()
      if (buyerProfile) {
        buyerAddressStreet = buyerAddressStreet || buyerProfile.address_street || ''
        buyerAddressPostcode = buyerAddressPostcode || buyerProfile.address_postcode || ''
        buyerAddressCity = buyerAddressCity || buyerProfile.address_city || ''
        buyerPhoneFinal = buyerPhoneFinal || buyerProfile.phone || ''
        buyerName = buyerName || buyerProfile.full_name || buyerProfile.username || ''
      }
    }

    // Luodaan order
    const { data: insertedOrder } = await supabaseAdmin
      .from('orders')
      .insert({
        listing_id: parseInt(listingId),
        buyer_id: buyerId || null,
        seller_id: sellerUserId || null,
        amount: baseAmount,
        service_fee: serviceFee,
        status: 'paid',
        stripe_session_id: session.id,
        auto_confirm_at: autoConfirmAt.toISOString(),
        order_number: orderNumber,
        // Uudet kentät
        item_price_cents: itemPriceCents,
        shipping_cost_cents: shippingCostCents,
        service_fee_cents: serviceFeeCents,
        total_cents: totalCents,
        shipping_zone: shippingZone || null,
        buyer_address_street: buyerAddressStreet,
        buyer_address_postcode: buyerAddressPostcode,
        buyer_address_city: buyerAddressCity,
        buyer_country: buyerCountry,
        buyer_phone: buyerPhoneFinal,
        buyer_email: buyerEmail,
      })
      .select('id')
      .single()

    const orderId: number | null = insertedOrder?.id ?? null

    // Haetaan ilmoituksen tiedot
    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('title, user_id, weight_kg')
      .eq('id', listingId)
      .single()

    // Haetaan myyjän profiili (myös osoitetiedot Matkahuoltoa varten)
    const { data: sellerProfile } = await supabaseAdmin
      .from('profiles')
      .select('username, full_name, address_street, address_postcode, address_city, phone, stripe_onboarded')
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

    // ── Matkahuolto auto-generation ─────────────────────────────────────────────
    let activationCode: string | undefined
    let trackingNumber: string | undefined
    let matkahuoltoError: string | undefined
    let matkahuoltoRaw: string | undefined
    let labelCreated = false

    if (shippingZone === 'FI' && orderId) {
      const sellerReady =
        sellerProfile?.address_street &&
        sellerProfile?.address_postcode &&
        sellerProfile?.address_city &&
        sellerProfile?.phone &&
        sellerEmail

      const buyerReady =
        buyerAddressStreet &&
        buyerAddressPostcode &&
        buyerAddressCity &&
        buyerPhoneFinal

      if (sellerReady && buyerReady) {
        try {
          const weightKg = (listing as any)?.weight_kg || 1
          const mhResult = await createMatkahuoltoShipment({
            senderName: sellerProfile!.full_name || sellerProfile!.username || sellerName,
            senderAddress: sellerProfile!.address_street,
            senderPostal: sellerProfile!.address_postcode,
            senderCity: sellerProfile!.address_city,
            senderPhone: sellerProfile!.phone,
            senderEmail: sellerEmail,
            receiverName: buyerName || buyerEmail,
            receiverAddress: buyerAddressStreet,
            receiverPostal: buyerAddressPostcode,
            receiverCity: buyerAddressCity,
            receiverPhone: buyerPhoneFinal,
            receiverEmail: buyerEmail,
            weightKg,
            senderReference: orderNumber,
          })

          if (mhResult.success && mhResult.activationCode) {
            activationCode = mhResult.activationCode
            trackingNumber = mhResult.trackingNumber
            labelCreated = true

            // Päivitetään tilaus aktivointikoodilla
            await supabaseAdmin
              .from('orders')
              .update({
                status: 'label_created',
                activation_code: activationCode,
                tracking_number: trackingNumber || null,
              })
              .eq('id', orderId)
          } else {
            matkahuoltoError = mhResult.error || 'Unknown error'
            matkahuoltoRaw = mhResult.rawResponse?.slice(0, 1000) || ''
            console.error('Matkahuolto API error:', matkahuoltoError, matkahuoltoRaw)
          }
        } catch (e) {
          matkahuoltoError = String(e)
          console.error('Matkahuolto exception:', e)
        }
      } else {
        matkahuoltoError = `Missing address data — seller ready: ${!!sellerReady}, buyer ready: ${!!buyerReady}`
        console.warn('Matkahuolto skipped:', matkahuoltoError)
      }
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

    // ── Sähköpostit ──────────────────────────────────────────────────────────────

    // Myyjälle
    if (sellerEmail) {
      const sellerStripeOnboarded = sellerProfile?.stripe_onboarded === true
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://slabsend.com'
      await resend.emails.send({
        from: 'Slabsend <info@slabsend.com>',
        to: sellerEmail,
        subject: labelCreated
          ? `Ship now — activation code for "${listing?.title}"`
          : `Your item "${listing?.title}" has been sold!`,
        html: labelCreated
          ? sellerEmailWithCode({ sellerName, listingTitle: listing?.title || '', orderNumber, baseAmount, activationCode: activationCode!, stripeOnboarded: sellerStripeOnboarded, appUrl })
          : sellerEmailWithoutCode({ sellerName, listingTitle: listing?.title || '', orderNumber, baseAmount, stripeOnboarded: sellerStripeOnboarded, appUrl }),
      })
    }

    // Ostajalle
    if (buyerEmail) {
      await resend.emails.send({
        from: 'Slabsend <info@slabsend.com>',
        to: buyerEmail,
        subject: `Order confirmed: ${listing?.title}`,
        html: buyerConfirmationEmail({ listingTitle: listing?.title || '', orderNumber, totalAmount, trackingNumber }),
      })
    }

    // Adminille
    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: 'info@slabsend.com',
      subject: `${labelCreated ? '✅' : shippingZone === 'FI' ? '⚠️' : '📦'} New order: ${listing?.title} — ${orderNumber}`,
      html: adminOrderEmail({
        orderNumber,
        listingTitle: listing?.title || '',
        buyerEmail,
        sellerName,
        sellerEmail,
        totalAmount,
        baseAmount,
        serviceFee,
        sessionId: session.id,
        shippingZone,
        labelCreated,
        activationCode,
        trackingNumber,
        matkahuoltoError,
        matkahuoltoRaw,
        orderId,
      }),
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

// ── Email templates ───────────────────────────────────────────────────────────

function stripeSetupBlock(appUrl: string): string {
  return `
    <div style="background: #fff8f0; border: 1px solid #FC7038; border-radius: 10px; padding: 20px 24px; margin: 24px 0;">
      <p style="font-weight: 700; color: #1a1408; margin: 0 0 8px;">⚡ Set up payments to receive your money</p>
      <p style="font-size: 14px; color: #3a3020; margin: 0 0 16px;">You haven't connected a bank account yet. It takes 2 minutes — your payment will be held until you complete this.</p>
      <a href="${appUrl}/profile" style="display: inline-block; background: #FC7038; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 10px 22px; border-radius: 8px;">Set up payments →</a>
    </div>
  `
}

function sellerEmailWithCode(p: {
  sellerName: string
  listingTitle: string
  orderNumber: string
  baseAmount: number
  activationCode: string
  stripeOnboarded: boolean
  appUrl: string
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
      <h2 style="color: #FC7038;">Your item has been sold! 🎉</h2>
      <p>Hi ${p.sellerName},</p>
      <p><strong>${p.listingTitle}</strong> has been purchased and your shipping label is ready.</p>

      ${!p.stripeOnboarded ? stripeSetupBlock(p.appUrl) : ''}

      <div style="background: #1a1408; border-radius: 12px; padding: 28px 24px; margin: 28px 0; text-align: center;">
        <p style="color: rgba(245,243,230,0.55); font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 10px;">Your Matkahuolto activation code</p>
        <p style="color: #FC7038; font-size: 42px; font-weight: 700; letter-spacing: 0.15em; margin: 0 0 10px; font-family: monospace;">${p.activationCode}</p>
        <p style="color: rgba(245,243,230,0.45); font-size: 12px; margin: 0 0 20px;">Write this code on your package and drop it off at any Matkahuolto point</p>
        <a href="https://www.matkahuolto.fi/palvelupisteet" style="display: inline-block; background: #FC7038; color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: 0.08em; padding: 12px 24px; border-radius: 8px;">Find nearest drop-off point →</a>
      </div>

      <h3 style="font-size: 15px; margin-bottom: 8px;">What to do:</h3>
      <ol style="padding-left: 20px; line-height: 1.8; color: #3a3020;">
        <li>Write the 7-digit code clearly on the package</li>
        <li>Drop the package at your nearest Matkahuolto service point</li>
        <li>The buyer will be notified automatically when the parcel is scanned</li>
      </ol>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.orderNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.listingTitle}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">You'll receive</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.baseAmount} €</strong> after buyer confirms receipt</td></tr>
      </table>

      <p>Questions? Contact <a href="mailto:info@slabsend.com" style="color: #FC7038;">info@slabsend.com</a></p>
      <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
    </div>
  `
}

function sellerEmailWithoutCode(p: {
  sellerName: string
  listingTitle: string
  orderNumber: string
  baseAmount: number
  stripeOnboarded: boolean
  appUrl: string
}): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
      <h2 style="color: #FC7038;">Your item has been sold! 🎉</h2>
      <p>Hi ${p.sellerName},</p>
      <p><strong>${p.listingTitle}</strong> has been purchased.</p>

      ${!p.stripeOnboarded ? stripeSetupBlock(p.appUrl) : ''}

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.orderNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.listingTitle}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">You'll receive</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.baseAmount} €</strong> after buyer confirms receipt</td></tr>
      </table>

      <p>We're preparing your shipping details. You'll receive a separate email shortly with your Matkahuolto activation code and drop-off instructions.</p>
      <p>If you don't hear from us within a few hours, please contact <a href="mailto:info@slabsend.com" style="color: #FC7038;">info@slabsend.com</a> with your order number.</p>
      <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
    </div>
  `
}

function buyerConfirmationEmail(p: {
  listingTitle: string
  orderNumber: string
  totalAmount: number
  trackingNumber?: string
}): string {
  const trackingBlock = p.trackingNumber
    ? `<p style="margin-top: 16px;">Your parcel tracking number: <strong>${p.trackingNumber}</strong> — track at <a href="https://www.matkahuolto.fi/en/tracking?trackingCode=${p.trackingNumber}" style="color: #FC7038;">Matkahuolto tracking</a></p>`
    : ''
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
      <h2 style="color: #FC7038;">Order confirmed! ✓</h2>
      <p>Thank you for your purchase.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.orderNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.listingTitle}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total paid</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.totalAmount} €</strong></td></tr>
      </table>
      ${trackingBlock}
      <p>Once you receive the item, please confirm receipt on the listing page. If anything is wrong, contact us within 48 hours at <a href="mailto:info@slabsend.com" style="color: #FC7038;">info@slabsend.com</a></p>
      <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
    </div>
  `
}

function adminOrderEmail(p: {
  orderNumber: string
  listingTitle: string
  buyerEmail: string
  sellerName: string
  sellerEmail: string
  totalAmount: number
  baseAmount: number
  serviceFee: number
  sessionId: string
  shippingZone: string
  labelCreated: boolean
  activationCode?: string
  trackingNumber?: string
  matkahuoltoError?: string
  matkahuoltoRaw?: string
  orderId: number | null
}): string {
  const mhBlock = p.shippingZone === 'FI'
    ? p.labelCreated
      ? `
        <tr style="background: #f0faf0;"><td style="padding: 8px; border-bottom: 1px solid #eee;" colspan="2"><strong>✅ Matkahuolto label auto-generated</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Activation code</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 20px; font-weight: 700; font-family: monospace; color: #FC7038;">${p.activationCode}</td></tr>
        ${p.trackingNumber ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Tracking number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.trackingNumber}</td></tr>` : ''}
      `
      : `
        <tr style="background: #fff8f0;"><td style="padding: 8px; border-bottom: 1px solid #eee;" colspan="2"><strong>⚠️ Matkahuolto label FAILED — manual action needed</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Error</td><td style="padding: 8px; border-bottom: 1px solid #eee; color: #c0392b;">${p.matkahuoltoError || 'Unknown error'}</td></tr>
        ${p.orderId ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Manual entry</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://slabsend.com'}/admin/orders/${p.orderId}">Enter code manually →</a></td></tr>` : ''}
        ${p.matkahuoltoRaw ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; vertical-align: top;">API raw response</td><td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 11px; color: #555; word-break: break-all;">${p.matkahuoltoRaw.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td></tr>` : ''}
      `
    : ''

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New order received</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Order number</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.orderNumber}</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Item</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.listingTitle}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Buyer email</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.buyerEmail}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Seller</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.sellerName} (${p.sellerEmail})</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Total paid</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.totalAmount} €</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">To transfer to seller</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${p.baseAmount} €</strong></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Slabsend fee</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.serviceFee} €</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Shipping zone</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.shippingZone || 'N/A'}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;">Stripe session</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${p.sessionId}</td></tr>
        ${mhBlock}
      </table>
      <p><strong>Action needed:</strong> Transfer ${p.baseAmount} € to seller after buyer confirms receipt or after 48 hours.</p>
    </div>
  `
}
