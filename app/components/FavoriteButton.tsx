'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function FavoriteButton({ listingId }: { listingId: string }) {
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .maybeSingle()
      setIsFavorited(!!data)
    }
    check()
  }, [listingId])

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setLoading(true)
    if (isFavorited) {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listingId)
      if (error) { console.error('Favorites delete error:', error); setLoading(false); return }
      setIsFavorited(false)
    } else {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, listing_id: listingId })
      if (error) { console.error('Favorites insert error:', error); setLoading(false); return }
      setIsFavorited(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '28px',
        height: '28px',
        background: 'rgba(255,255,255,0.92)',
        border: 'none',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: loading ? 'wait' : 'pointer',
        zIndex: 2,
        boxShadow: '0 1px 6px rgba(0,0,0,0.18)',
        flexShrink: 0,
        padding: 0,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={isFavorited ? '#FC7038' : 'none'}
        stroke={isFavorited ? '#FC7038' : '#7a7060'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </button>
  )
}
