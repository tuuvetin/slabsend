'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const listingId = searchParams.get('listing')
  const [show, setShow] = useState(false)
  const [sellerId, setSellerId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!listingId) return
    const supabase = createClient()
    supabase
      .from('listings')
      .select('user_id')
      .eq('id', listingId)
      .single()
      .then(({ data }) => {
        if (data?.user_id) setSellerId(data.user_id)
      })
  }, [listingId])

  return (
    <div style={{
      width: '100%',
      maxWidth: '420px',
      opacity: show ? 1 : 0,
      transform: show ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      {/* Checkmark */}
      <div style={{
        width: '72px',
        height: '72px',
        borderRadius: '50%',
        background: '#2a6a2a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M9 18L15 24L27 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: '26px',
        fontWeight: 800,
        color: '#3a3428',
        textAlign: 'center',
        marginBottom: '12px',
        letterSpacing: '-0.02em',
      }}>
        Payment successful!
      </h1>

      <p style={{
        fontSize: '15px',
        color: '#7a7060',
        textAlign: 'center',
        lineHeight: 1.6,
        marginBottom: '32px',
      }}>
        Check your email for an order confirmation.
        The seller will be notified and ship your item shortly.
      </p>

      <div style={{
        background: '#fff',
        border: '1px solid rgba(42,106,42,0.2)',
        borderRadius: '12px',
        padding: '16px 18px',
        marginBottom: '28px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a6a2a', marginBottom: '6px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Buyer protection active
        </p>
        <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: 1.5, margin: 0 }}>
          The seller receives payment only after you confirm the item arrived as described — or automatically after 48 hours.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {listingId && sellerId && (
          <Link
            href={`/messages/${listingId}/${sellerId}`}
            style={{
              display: 'block',
              textAlign: 'center',
              background: '#FC7038',
              color: '#fff',
              fontWeight: 700,
              fontSize: '15px',
              borderRadius: '10px',
              padding: '14px',
              textDecoration: 'none',
              letterSpacing: '0.02em',
            }}
          >
            Open chat with seller
          </Link>
        )}
        {listingId && (
          <Link
            href={`/listings/${listingId}`}
            style={{
              display: 'block',
              textAlign: 'center',
              background: 'transparent',
              color: '#3a3428',
              fontWeight: 600,
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px',
              textDecoration: 'none',
              border: '1px solid rgba(58,52,40,0.2)',
            }}
          >
            View listing
          </Link>
        )}
        <Link
          href="/listings"
          style={{
            display: 'block',
            textAlign: 'center',
            color: '#7a7060',
            fontSize: '13px',
            padding: '10px',
            textDecoration: 'none',
          }}
        >
          Back to listings
        </Link>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#F5F3E6',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <Suspense fallback={null}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  )
}
