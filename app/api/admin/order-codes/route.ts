import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

export async function POST(req: Request) {
  // Auth check — only admins
  const { createClient: createServerClient } = await import('@/utils/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId, activationCode, trackingCode } = await req.json()

  // Fetch full order with profiles
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      listing:listing_id ( title, images ),
      seller_profile:seller_id ( username, address_street, address_postcode, address_city, phone )
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Update order
  await supabaseAdmin.from('orders').update({
    status: 'label_created',
    activation_code: activationCode,
    tracking_number: trackingCode,
    label_created_at: new Date().toISOString(),
  }).eq('id', orderId)

  // Get seller email
  let sellerEmail = ''
  try {
    const { data: { user: sellerUser } } = await supabaseAdmin.auth.admin.getUserById(order.seller_id)
    sellerEmail = sellerUser?.email || ''
  } catch {}

  const sellerName = order.seller_profile?.username || 'Myyjä'
  const trackingUrl = `https://www.matkahuolto.fi/seuranta?shipmentId=${trackingCode}`

  // EMAIL 1: Myyjälle — aktivointikoodi
  if (sellerEmail) {
    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: sellerEmail,
      subject: `Lähetä pakettisi — aktivointikoodi: ${activationCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
          <h2 style="color: #FC7038;">Pakettisi on valmis lähetettäväksi! 📦</h2>
          <p>Hei ${sellerName},</p>
          <p>Tilaus <strong>${order.order_number}</strong> — tuote: <strong>${order.listing?.title}</strong></p>

          <div style="background: #F5F3E6; border: 2px solid #FC7038; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="font-size: 13px; color: #7a7060; margin: 0 0 8px; letter-spacing: 0.1em; text-transform: uppercase;">Aktivointikoodisi</p>
            <p style="font-size: 36px; font-weight: 700; letter-spacing: 0.2em; color: #1a1408; margin: 0;">${activationCode}</p>
          </div>

          <h3>Näin toimit:</h3>
          <ol style="line-height: 2; color: #3a3028;">
            <li>Pakkaa tuote tukevasti (kuplamuovi tai sanomalehdet sisälle)</li>
            <li>Sulje paketti teipillä</li>
            <li>Vie paketti lähimpään Matkahuollon pisteeseen tai pakettiautomaattiin</li>
            <li>Syötä automaatin ruudulle aktivointikoodi <strong>${activationCode}</strong></li>
            <li>Jätä paketti sisään</li>
          </ol>

          <p><a href="https://www.matkahuolto.fi/palvelupistehaku" style="color: #FC7038;">Etsi lähin Matkahuollon piste →</a></p>

          <p style="color: #7a7060; font-size: 13px;">Saat rahat tilillesi kun ostaja vastaanottaa paketin.</p>
          <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
        </div>
      `,
    })
  }

  // EMAIL 2: Ostajalle — seurantakoodi
  if (order.buyer_email) {
    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: order.buyer_email,
      subject: `Tilauksesi on matkalla — seurantakoodi: ${trackingCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
          <h2 style="color: #FC7038;">Tilauksesi on matkalla! 🚚</h2>
          <p>Tilaus <strong>${order.order_number}</strong> — tuote: <strong>${order.listing?.title}</strong></p>

          <div style="background: #F5F3E6; border: 2px solid #1a1408; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <p style="font-size: 13px; color: #7a7060; margin: 0 0 8px; letter-spacing: 0.1em; text-transform: uppercase;">Seurantakoodi</p>
            <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.15em; color: #1a1408; margin: 0;">${trackingCode}</p>
          </div>

          <p style="text-align: center;">
            <a href="${trackingUrl}" style="display: inline-block; background: #FC7038; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              Seuraa pakettia →
            </a>
          </p>

          <p style="color: #7a7060; font-size: 13px;">Arvioitu toimitusaika: 2–5 arkivuorokautta. Saat tekstiviestin Matkahuollolta kun paketti on noudettavissa.</p>
          <p>Kysyttävää? <a href="mailto:info@slabsend.com" style="color: #FC7038;">info@slabsend.com</a></p>
          <p style="color: #9a9080; font-size: 12px;">Slabsend — Pre-owned climbing gear</p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}

// PATCH — päivitä vain status
export async function PATCH(req: Request) {
  const { createClient: createServerClient } = await import('@/utils/supabase/server')
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { orderId, status } = await req.json()
  if (!orderId || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await supabaseAdmin.from('orders').update({
    status,
    [`${status}_at`]: new Date().toISOString(),
  }).eq('id', orderId)

  return NextResponse.json({ ok: true })
}
