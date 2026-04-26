'use client'
import { useEffect } from 'react'

export default function OrdersError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Admin orders error:', error)
  }, [error])

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '40px 24px', fontFamily: 'Barlow, sans-serif' }}>
      <h2 style={{ fontFamily: 'Barlow Condensed', fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c0392b', marginBottom: 16 }}>
        Something went wrong
      </h2>
      <pre style={{ background: '#fce8e0', border: '1px solid #f0b0a0', borderRadius: 8, padding: '16px', fontSize: 12, overflowX: 'auto', color: '#8a2010', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {error?.message || 'Unknown error'}
        {error?.digest ? `\nDigest: ${error.digest}` : ''}
      </pre>
      <button
        onClick={reset}
        style={{ marginTop: 20, fontFamily: 'Barlow Condensed', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '10px 20px', background: '#FC7038', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}
