'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setCurrentUser(user)

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const seen = new Set()
      const unique = (messages || []).filter(msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const key = `${msg.listing_id}-${otherUserId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      const enriched = await Promise.all(unique.map(async msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id

        const [{ data: listing }, { data: profile }, { data: order }] = await Promise.all([
          supabase.from('listings').select('title, images').eq('id', msg.listing_id).single(),
          supabase.from('profiles').select('username, full_name, avatar_url').eq('user_id', otherUserId).single(),
          supabase.from('orders').select('status')
            .eq('listing_id', msg.listing_id)
            .or(`and(buyer_id.eq.${user.id},seller_id.eq.${otherUserId}),and(buyer_id.eq.${otherUserId},seller_id.eq.${user.id})`)
            .in('status', ['paid', 'confirmed'])
            .maybeSingle(),
        ])

        return { ...msg, listing, profile, otherUserId, order }
      }))

      setConversations(enriched)
      setLoading(false)
    })
  }, [])

  if (loading) return <p className="listing-loading">Loading messages...</p>

  return (
    <div className="messages-page">
      <h1 className="messages-title">Messages</h1>

      {conversations.length === 0 && (
        <div className="messages-empty">
          <p>No messages yet.</p>
          <a href="/listings" className="messages-empty-link">Browse listings to get started →</a>
        </div>
      )}

      <div className="messages-list">
        {conversations.map(msg => {
          const displayName = msg.profile?.username || msg.profile?.full_name || 'User'
          const avatarUrl = msg.profile?.avatar_url
          const listingTitle = msg.listing?.title || `Listing #${msg.listing_id}`
          const listingImage = msg.listing?.images?.[0]
          const hasOrder = !!msg.order

          return (
            <a key={msg.id} href={`/messages/${msg.listing_id}/${msg.otherUserId}`} className="conversation-link">
              <div className="conversation-card" style={{ background: hasOrder ? '#f0f7f0' : undefined, borderColor: hasOrder ? 'rgba(42,106,42,0.2)' : undefined }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(26,20,8,0.1)' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed', fontSize: '18px', fontWeight: 700, color: '#F5F3E6', flexShrink: 0 }}>
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  {listingImage && (
                    <img src={listingImage} alt="" style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #F5F3E6' }} />
                  )}
                  {msg.sender_id !== currentUser?.id && (
                    <span style={{ position: 'absolute', top: 0, right: 0, width: '11px', height: '11px', background: '#FC7038', borderRadius: '50%', border: '2px solid #F5F3E6' }} />
                  )}
                </div>

                <div className="conversation-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p className="conversation-listing" style={{ fontWeight: 600, margin: 0 }}>{displayName}</p>
                    {hasOrder && (
                      <span style={{ background: msg.order.status === 'confirmed' ? '#2a6a2a' : '#FC7038', color: '#fff', fontFamily: 'Barlow Condensed', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                        {msg.order.status === 'confirmed' ? '✓ Completed' : '⏳ Awaiting confirmation'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9a9080', margin: '1px 0 3px', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>{listingTitle}</p>
                  <p className="conversation-preview">
                    {msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content}
                  </p>
                </div>

                <div className="conversation-meta">
                  <span className="conversation-date">
                    {new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="conversation-arrow">→</span>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}