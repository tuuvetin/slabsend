'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ReviewForm({ orderId, sellerId }: { orderId: number, sellerId: string }) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [existing, setExisting] = useState<any>(null)
  const [checking, setChecking] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecking(false); return }
      const { data } = await supabase.from('reviews').select('*').eq('reviewer_id', user.id).eq('order_id', orderId).maybeSingle()
      if (data) setExisting(data)
      setChecking(false)
    }
    check()
  }, [orderId])

  const handleSubmit = async () => {
    if (rating === 0) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      seller_id: sellerId,
      order_id: orderId,
      rating,
      comment: comment.trim() || null,
    })
    setLoading(false)
    if (!error) setSubmitted(true)
  }

  if (checking) return null

  const done = existing || submitted
  const displayRating = existing?.rating ?? rating
  const displayComment = existing?.comment ?? (submitted ? comment : '')

  if (done) return (
    <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '14px 16px', marginTop: '16px' }}>
      <p style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '8px' }}>Your review</p>
      <div style={{ display: 'flex', gap: '2px', marginBottom: displayComment ? '6px' : 0 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ fontSize: '20px', color: s <= displayRating ? '#FC7038' : '#d0c8b8' }}>★</span>
        ))}
      </div>
      {displayComment && <p style={{ fontSize: '13px', color: '#3a3428', margin: 0, lineHeight: 1.5 }}>{displayComment}</p>}
    </div>
  )

  return (
    <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginTop: '16px' }}>
      <p style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '12px' }}>
        Rate this seller
      </p>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
        {[1,2,3,4,5].map(s => (
          <button
            key={s}
            onClick={() => setRating(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontSize: '28px', color: s <= (hovered || rating) ? '#FC7038' : '#d0c8b8', transition: 'color 0.1s', lineHeight: 1 }}
          >★</button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
        style={{ width: '100%', border: '1px solid rgba(26,20,8,0.15)', borderRadius: '8px', padding: '10px 12px', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', background: '#fff', resize: 'vertical', minHeight: '80px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || rating === 0}
        style={{ background: rating === 0 ? '#d0c8b8' : '#FC7038', color: '#F5F3E6', border: 'none', borderRadius: '8px', padding: '12px 24px', fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: rating === 0 ? 'not-allowed' : 'pointer', width: '100%', transition: 'background 0.15s' }}
      >
        {loading ? 'Submitting...' : 'Submit review'}
      </button>
    </div>
  )
}
