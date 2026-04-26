'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  paid:          { label: 'Maksettu — käsittele', color: '#e07010' },
  label_created: { label: 'Tarra luotu', color: '#1060c0' },
  shipped:       { label: 'Matkalla', color: '#7040c0' },
  delivered:     { label: 'Toimitettu', color: '#207040' },
  completed:     { label: 'Valmis', color: '#2a6a2a' },
  confirmed:     { label: 'Confirmed', color: '#2a6a2a' },
  refunded:      { label: 'Refunded', color: '#aa2200' },
}

export default function AdminOrdersPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('6m')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
        setAuthorized(false)
        return
      }
      setAuthorized(true)
    }).catch(() => setAuthorized(false))
  }, [])

  useEffect(() => {
    if (!authorized) return
    setLoading(true)
    fetch(`/api/admin/orders/list?range=${range}`)
      .then(r => r.json())
      .then(data => {
        setOrders(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authorized, range])

  if (authorized === null) return null
  if (!authorized) return <div style={{ padding: '40px', fontFamily: 'Barlow' }}>Access denied.</div>

  const totalRevenue = orders.reduce((s, o) => s + (o.service_fee || 0), 0)
  const totalVolume = orders.reduce((s, o) => s + (o.amount || 0) + (o.service_fee || 0), 0)
  const confirmed = orders.filter(o => o.status === 'confirmed').length
  const pending = orders.filter(o => o.status === 'paid').length

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', fontFamily: 'Barlow, sans-serif', color: '#1a1408' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: 32, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Orders</h1>
          <a href="/admin" style={{ fontSize: 12, color: '#9a9080', textDecoration: 'none', letterSpacing: '0.1em', fontFamily: 'Barlow Condensed', textTransform: 'uppercase' }}>← Back to admin</a>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['1m','3m','6m','1y','all'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontFamily: 'Barlow Condensed', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', border: 'none',
              background: range === r ? '#FC7038' : 'rgba(26,20,8,0.08)',
              color: range === r ? '#fff' : '#5a5040',
            }}>{r}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Total orders', value: orders.length },
          { label: 'Confirmed', value: confirmed },
          { label: 'Awaiting', value: pending },
          { label: 'Slabsend revenue', value: `${totalRevenue.toFixed(2)} €` },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(26,20,8,0.08)', borderRadius: 10, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'Barlow Condensed', fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#9a9080' }}>Loading...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: '#9a9080' }}>No orders in this period.</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid rgba(26,20,8,0.08)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F3E6', borderBottom: '1px solid rgba(26,20,8,0.08)' }}>
                {['Order #', 'Item', 'Date', 'Seller gets', 'Fee', 'Total', 'Status'].map(h => (
                  <th key={h} style={{ fontFamily: 'Barlow Condensed', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', padding: '10px 14px', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => {
                const st = STATUS_LABEL[o.status] || { label: o.status, color: '#9a9080' }
                const total = (o.amount || 0) + (o.service_fee || 0)
                return (
                  <tr key={o.id} onClick={() => window.location.href = `/admin/orders/${o.id}`} style={{ borderBottom: '1px solid rgba(26,20,8,0.06)', background: i % 2 === 0 ? '#fff' : 'rgba(245,243,230,0.4)', cursor: 'pointer' }}>
                    <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 13, fontWeight: 700 }}>{o.order_number || o.id?.slice(0,8)}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{o.listing?.title || '—'}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 12, color: '#7a7060' }}>{new Date(o.created_at).toLocaleDateString('fi-FI')}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 13, fontWeight: 600 }}>{o.amount?.toFixed(2)} €</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 13, color: '#FC7038', fontWeight: 600 }}>{o.service_fee?.toFixed(2)} €</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 13, fontWeight: 700 }}>{total.toFixed(2)} €</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'Barlow Condensed', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: st.color, background: `${st.color}18`, padding: '3px 8px', borderRadius: 4 }}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid rgba(26,20,8,0.1)', background: '#F5F3E6' }}>
                <td colSpan={3} style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a7060' }}>Total</td>
                <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700 }}>{orders.reduce((s,o) => s+(o.amount||0), 0).toFixed(2)} €</td>
                <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700, color: '#FC7038' }}>{totalRevenue.toFixed(2)} €</td>
                <td style={{ padding: '12px 14px', fontFamily: 'Barlow Condensed', fontSize: 14, fontWeight: 700 }}>{totalVolume.toFixed(2)} €</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
