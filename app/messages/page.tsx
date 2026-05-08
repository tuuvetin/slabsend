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

      // Fetch messages + unread in parallel
      const [{ data: messages }, { data: unreadRows }] = await Promise.all([
        supabase
          .from('messages')
          .select('id, sender_id, receiver_id, listing_id, content, image_url, created_at')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('listing_id, sender_id')
          .eq('receiver_id', user.id)
          .eq('is_read', false),
      ])

      // Build unread count map
      const unreadMap: Record<string, number> = {}
      for (const row of unreadRows || []) {
        const key = `${row.listing_id}-${row.sender_id}`
        unreadMap[key] = (unreadMap[key] || 0) + 1
      }

      // Deduplicate to one message per conversation
      const seen = new Set()
      const unique = (messages || []).filter(msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const key = `${msg.listing_id}-${otherUserId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })

      if (unique.length === 0) { setConversations([]); setLoading(false); return }

      // Collect all IDs for batch fetching
      const listingIds = [...new Set(unique.map(m => m.listing_id))]
      const otherUserIds = [...new Set(unique.map(m => m.sender_id === user.id ? m.receiver_id : m.sender_id))]

      // Batch fetch listings, profiles, orders in 3 queries total
      const [{ data: listings }, { data: profiles }, { data: orders }] = await Promise.all([
        supabase.from('listings').select('id, title, images').in('id', listingIds),
        supabase.from('profiles').select('user_id, username, full_name, avatar_url').in('user_id', otherUserIds),
        supabase.from('orders').select('listing_id, buyer_id, seller_id, status')
          .in('listing_id', listingIds)
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .in('status', ['paid', 'confirmed']),
      ])

      const listingMap: Record<string, any> = {}
      for (const l of listings || []) listingMap[l.id] = l

      const profileMap: Record<string, any> = {}
      for (const p of profiles || []) profileMap[p.user_id] = p

      const enriched = unique.map(msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const order = (orders || []).find(o =>
          o.listing_id === msg.listing_id &&
          ((o.buyer_id === user.id && o.seller_id === otherUserId) ||
           (o.buyer_id === otherUserId && o.seller_id === user.id))
        ) || null
        return {
          ...msg,
          listing: listingMap[msg.listing_id] || null,
          profile: profileMap[otherUserId] || null,
          otherUserId,
          order,
          unreadCount: unreadMap[`${msg.listing_id}-${otherUserId}`] || 0,
        }
      })

      // Sort: unread first, then by date
      enriched.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

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
          const unread = msg.unreadCount || 0

          const preview = msg.image_url
            ? 'Photo'
            : (msg.content?.length > 60 ? msg.content.substring(0, 60) + '...' : (msg.content || ''))

          return (
            <a key={msg.id} href={`/messages/${msg.listing_id}/${msg.otherUserId}`} className="conversation-link">
              <div className="conversation-card" style={{ background: hasOrder ? '#fef3ed' : undefined, borderColor: hasOrder ? 'rgba(252,112,56,0.2)' : undefined }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(26,20,8,0.1)' }} />
                  ) : (
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700, color: '#F5F3E6', flexShrink: 0 }}>
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  {listingImage && (
                    <img src={listingImage} alt="" style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #F5F3E6' }} />
                  )}
                  {unread > 0 && (
                    <span style={{ position: 'absolute', top: '-2px', left: '-2px', minWidth: '18px', height: '18px', background: '#FC7038', borderRadius: '9px', border: '2px solid #F5F3E6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#F5F3E6', padding: '0 3px' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>

                <div className="conversation-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <p className="conversation-listing" style={{ fontWeight: unread > 0 ? 700 : 600, margin: 0, color: unread > 0 ? '#1a1408' : undefined }}>{displayName}</p>
                    {hasOrder && (
                      <span style={{ background: msg.order.status === 'confirmed' ? '#2a6a2a' : '#fde8da', color: msg.order.status === 'confirmed' ? '#fff' : '#c04a10', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                        {msg.order.status === 'confirmed' ? 'Completed' : 'Awaiting confirmation'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '12px', color: '#9a9080', margin: '1px 0 3px', letterSpacing: '0.05em' }}>{listingTitle}</p>
                  <p className="conversation-preview" style={{ fontWeight: unread > 0 ? 600 : undefined, color: unread > 0 ? '#1a1408' : undefined }}>
                    {preview}
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
