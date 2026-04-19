'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [order, setOrder] = useState<any>(null)
  const [sellerProfile, setSellerProfile] = useState<any>(null)
  const [sellerEmail, setSellerEmail] = useState('')
  const [activationCode, setActivationCode] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) { setAuthorized(false); return }
      setAuthorized(true)
      loadOrder()
    })
  }, [])

  const loadOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        listing:listing_id ( title, price, weight_kg, images ),
        seller_profile:seller_id ( username, address_street, address_postcode, address_city, phone )
      `)
      .eq('id', params.id)
      .single()

    if (data) {
      setOrder(data)
      setSellerProfile(data.seller_profile)
      setActivationCode(data.matkahuolto_activation_code || '')
      setTrackingCode(data.matkahuolto_tracking_code || '')
    }
  }

  const handleSaveAndSend = async () => {
    if (!activationCode.trim() || !trackingCode.trim()) {
      setMessage('Syötä molemmat koodit ennen tallentamista.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/admin/order-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: params.id, activationCode, trackingCode }),
    })
    const data = await res.json()
    if (data.error) setMessage('Virhe: ' + data.error)
    else {
      setMessage('✅ Koodit tallennettu ja sähköpostit lähetetty!')
      await loadOrder()
    }
    setSaving(false)
  }

  const handleStatusUpdate = async (newStatus: string) => {
    await supabase.from('orders').update({ status: newStatus, [`${newStatus}_at`]: new Date().toISOString() }).eq('id', params.id)
    setMessage(`Status päivitetty: ${newStatus}`)
    await loadOrder()
  }

  const fmt = (cents: number | null) => cents != null ? (cents / 100).toFixed(2) + ' €' : '—'

  if (authorized === null) return null
  if (!authorized) return <div style={{ padding: '40px', fontFamily: 'Barlow' }}>Access denied.</div>
  if (!order) return <div style={{ padding: '40px', fontFamily: 'Barlow' }}>Ladataan...</div>

  const statusColors: Record<string, string> = {
    paid: '#e07010', label_created: '#1060c0', shipped: '#7040c0',
    delivered: '#207040', completed: '#2a6a2a',
  }
  const statusColor = statusColors[order.status] || '#888'

  return (
    <div style={{ fontFamily: 'Barlow', maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
      <a href="/admin/orders" style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7060', textDecoration: 'none' }}>← Kaikki tilaukset</a>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '20px 0' }}>
        <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '24px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
          Tilaus #{order.order_number}
        </h1>
        <span style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '20px', background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}40` }}>
          {order.status}
        </span>
      </div>

      {/* TUOTE */}
      <div style={cardStyle}>
        <SectionTitle>Tuote</SectionTitle>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {order.listing?.images?.[0] && <img src={order.listing.images[0]} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(26,20,8,0.1)' }} alt="" />}
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px' }}>{order.listing?.title}</div>
            <div style={{ color: '#7a7060', fontSize: '13px', marginTop: '4px' }}>Paino: {order.listing?.weight_kg ?? '—'} kg · Vyöhyke: {order.shipping_zone || '—'}</div>
          </div>
        </div>
      </div>

      {/* LÄHETTÄJÄ — kopioi Matkahuoltoon */}
      <div style={cardStyle}>
        <SectionTitle>🟢 Lähettäjä (myyjä) — kopioi Matkahuoltoon</SectionTitle>
        <CopyBlock lines={[
          sellerProfile?.username || '—',
          sellerProfile?.address_street || '—',
          `${sellerProfile?.address_postcode || ''} ${sellerProfile?.address_city || ''}`.trim() || '—',
          sellerProfile?.phone || '—',
        ]} />
      </div>

      {/* VASTAANOTTAJA — kopioi Matkahuoltoon */}
      <div style={cardStyle}>
        <SectionTitle>🔵 Vastaanottaja (ostaja) — kopioi Matkahuoltoon</SectionTitle>
        <CopyBlock lines={[
          order.buyer_address_street || '—',
          `${order.buyer_address_postcode || ''} ${order.buyer_address_city || ''}`.trim() || '—',
          order.buyer_country || '—',
          order.buyer_phone || '—',
          order.buyer_email || '—',
        ]} />
      </div>

      {/* MAKSU */}
      <div style={cardStyle}>
        <SectionTitle>Maksu</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <tbody>
            <Row label="Tuote" value={fmt(order.item_price_cents)} />
            <Row label="Toimitus" value={fmt(order.shipping_cost_cents)} />
            <Row label="Palvelumaksu (8%)" value={fmt(order.service_fee_cents)} />
            <Row label="Yhteensä" value={fmt(order.total_cents)} bold />
          </tbody>
        </table>
      </div>

      {/* MATKAHUOLTO-KOODIT */}
      <div style={cardStyle}>
        <SectionTitle>Matkahuollon koodit</SectionTitle>
        <a
          href="https://yritysportaali.matkahuolto.fi"
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-block', fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 16px', background: '#1a1408', color: '#F5F3E6', borderRadius: '6px', textDecoration: 'none', marginBottom: '16px' }}
        >
          Avaa Matkahuollon Yritysportaali →
        </a>

        {order.matkahuolto_activation_code ? (
          <div style={{ background: '#e6f4ea', border: '1px solid #a8d5b0', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
            <p style={{ fontSize: '12px', color: '#3a7a4a', margin: '0 0 6px' }}>Koodit tallennettu</p>
            <p style={{ fontSize: '14px', margin: '0 0 4px' }}>Aktivointikoodi: <strong>{order.matkahuolto_activation_code}</strong></p>
            <p style={{ fontSize: '14px', margin: 0 }}>Seurantakoodi: <strong>{order.matkahuolto_tracking_code}</strong></p>
          </div>
        ) : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            style={inputStyle}
            placeholder="Aktivointikoodi (Matkahuollolta)"
            value={activationCode}
            onChange={e => setActivationCode(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="Seurantakoodi (Matkahuollolta)"
            value={trackingCode}
            onChange={e => setTrackingCode(e.target.value)}
          />
          <button
            onClick={handleSaveAndSend}
            disabled={saving}
            style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '12px 20px', background: '#FC7038', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Tallennetaan...' : 'Tallenna ja lähetä sähköpostit'}
          </button>
        </div>
      </div>

      {/* STATUKSEN PÄIVITYS */}
      <div style={cardStyle}>
        <SectionTitle>Päivitä status</SectionTitle>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['label_created', 'shipped', 'delivered', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => handleStatusUpdate(s)}
              disabled={order.status === s}
              style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '8px 14px', background: order.status === s ? '#ddd' : '#fff', color: order.status === s ? '#aaa' : '#1a1408', border: '1px solid rgba(26,20,8,0.2)', borderRadius: '6px', cursor: order.status === s ? 'default' : 'pointer' }}
            >
              → {s}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div style={{ marginTop: '16px', padding: '12px 16px', background: message.startsWith('✅') ? '#e6f4ea' : '#fce8e0', border: `1px solid ${message.startsWith('✅') ? '#a8d5b0' : '#f0b0a0'}`, borderRadius: '8px', fontSize: '14px', color: message.startsWith('✅') ? '#2a5a3a' : '#8a2010' }}>
          {message}
        </div>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '12px',
  padding: '20px 24px', marginBottom: '16px',
}
const inputStyle: React.CSSProperties = {
  fontFamily: 'Barlow', fontSize: '14px', padding: '10px 14px',
  background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px',
  color: '#1a1408', width: '100%', boxSizing: 'border-box',
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px', marginTop: 0 }}>{children}</p>
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr>
      <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(26,20,8,0.06)', color: '#7a7060' }}>{label}</td>
      <td style={{ padding: '6px 0', borderBottom: '1px solid rgba(26,20,8,0.06)', textAlign: 'right', fontWeight: bold ? 700 : 400 }}>{value}</td>
    </tr>
  )
}
function CopyBlock({ lines }: { lines: string[] }) {
  const copy = () => navigator.clipboard.writeText(lines.join('\n'))
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '14px', background: '#fff', border: '1px solid rgba(26,20,8,0.12)', borderRadius: '8px', padding: '12px 16px', lineHeight: 1.8 }}>
        {lines.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <button onClick={copy} style={{ position: 'absolute', top: '8px', right: '8px', fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', background: '#1a1408', color: '#F5F3E6', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        Kopioi
      </button>
    </div>
  )
}
