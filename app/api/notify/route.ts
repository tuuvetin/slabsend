import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY!)
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const body = await req.json()
  const { type } = body

  if (type === 'message') {
    const { receiverId, senderName, listingTitle, listingId, messagePreview } = body

    // Haetaan vastaanottajan sähköposti
    let receiverEmail = ''
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(receiverId)
      receiverEmail = user?.email || ''
    } catch (e) {
      return NextResponse.json({ error: 'Could not fetch receiver email' }, { status: 500 })
    }

    if (!receiverEmail) return NextResponse.json({ ok: true })

    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: receiverEmail,
      subject: `New message about "${listingTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
          <div style="background: #FC7038; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 22px;">New message on Slabsend</h2>
          </div>
          <div style="background: #F5F3E6; padding: 28px 32px; border-radius: 0 0 8px 8px; border: 1px solid rgba(26,20,8,0.08); border-top: none;">
            <p style="margin: 0 0 8px 0;"><strong>${senderName}</strong> sent you a message about <strong>${listingTitle}</strong>:</p>
            <div style="background: #fff; border-left: 3px solid #FC7038; padding: 12px 16px; border-radius: 4px; margin: 16px 0; font-style: italic; color: #5a5040;">
              "${messagePreview}"
            </div>
            <a href="https://slabsend.com/messages/${listingId}/${body.senderId}" style="display: inline-block; background: #FC7038; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 8px;">Reply</a>
            <p style="color: #9a9080; font-size: 12px; margin-top: 24px;">Slabsend — Pre-owned climbing gear</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  }

  if (type === 'receipt_confirmed') {
    const { sellerId, sellerName, buyerName, listingTitle, orderNumber, amount } = body

    let sellerEmail = ''
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(sellerId)
      sellerEmail = user?.email || ''
    } catch (e) {
      return NextResponse.json({ error: 'Could not fetch seller email' }, { status: 500 })
    }

    if (!sellerEmail) return NextResponse.json({ ok: true })

    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: sellerEmail,
      subject: `Receipt confirmed — payment of ${amount} € is on its way`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
          <div style="background: #FC7038; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 22px;">Receipt confirmed ✓</h2>
          </div>
          <div style="background: #F5F3E6; padding: 28px 32px; border-radius: 0 0 8px 8px; border: 1px solid rgba(26,20,8,0.08); border-top: none;">
            <p>Hi ${sellerName},</p>
            <p><strong>${buyerName}</strong> has confirmed they received <strong>${listingTitle}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid rgba(26,20,8,0.1);">Order</td><td style="padding: 8px; border-bottom: 1px solid rgba(26,20,8,0.1);"><strong>${orderNumber}</strong></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid rgba(26,20,8,0.1);">Amount</td><td style="padding: 8px; border-bottom: 1px solid rgba(26,20,8,0.1);"><strong>${amount} €</strong></td></tr>
            </table>
            <p>Your payment will be transferred to you shortly. Thank you for selling on Slabsend!</p>
            <p style="color: #9a9080; font-size: 12px; margin-top: 24px;">Questions? <a href="mailto:info@slabsend.com" style="color: #FC7038;">info@slabsend.com</a> — Slabsend</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  }

  if (type === 'offer') {
    const { receiverId, senderId, senderName, listingTitle, listingId, offerAction, offerAmount } = body

    let receiverEmail = ''
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(receiverId)
      receiverEmail = user?.email || ''
    } catch (e) {
      return NextResponse.json({ error: 'Could not fetch receiver email' }, { status: 500 })
    }

    if (!receiverEmail) return NextResponse.json({ ok: true })

    const subjectMap: Record<string, string> = {
      accepted: `Your offer of ${offerAmount} € was accepted!`,
      countered: `${senderName} sent a counter offer on "${listingTitle}"`,
    }
    const bodyMap: Record<string, string> = {
      accepted: `<strong>${senderName}</strong> accepted your offer of <strong>${offerAmount} €</strong> for <strong>${listingTitle}</strong>. You can now proceed to payment.`,
      countered: `<strong>${senderName}</strong> sent a counter offer of <strong>${offerAmount} €</strong> for <strong>${listingTitle}</strong>.`,
    }

    await resend.emails.send({
      from: 'Slabsend <info@slabsend.com>',
      to: receiverEmail,
      subject: subjectMap[offerAction] || `Update on your offer for "${listingTitle}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1408;">
          <div style="background: #FC7038; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 22px;">${offerAction === 'accepted' ? 'Offer accepted ✓' : 'New counter offer'}</h2>
          </div>
          <div style="background: #F5F3E6; padding: 28px 32px; border-radius: 0 0 8px 8px; border: 1px solid rgba(26,20,8,0.08); border-top: none;">
            <p>${bodyMap[offerAction] || ''}</p>
            <a href="https://slabsend.com/messages/${listingId}/${senderId}" style="display: inline-block; background: #FC7038; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; margin-top: 8px;">View conversation</a>
            <p style="color: #9a9080; font-size: 12px; margin-top: 24px;">Slabsend — Pre-owned climbing gear</p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
