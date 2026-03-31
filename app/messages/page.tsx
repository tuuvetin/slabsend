'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // Yksi viesti per listing
      const seen = new Set()
      const unique = (messages || []).filter(msg => {
        if (seen.has(msg.listing_id)) return false
        seen.add(msg.listing_id)
        return true
      })

      // Haetaan listing-nimet ja vastapuolen profiilit
      const enriched = await Promise.all(unique.map(async msg => {
        const otherUserId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id

        const [{ data: listing }, { data: profile }] = await Promise.all([
          supabase.from('listings').select('title, images').eq('id', msg.listing_id).single(),
          supabase.from('profiles').select('username, full_name, avatar_url').eq('user_id', otherUserId).single(),
        ])

        return { ...msg, listing, profile, otherUserId }
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

          return (
            <a key={msg.id} href={`/messages/${msg.listing_id}`} className="conversation-link">
              <div className="conversation-card">

                {/* Vastapuolen avatar tai listing-kuva */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(26,20,8,0.1)' }}
                    />
                  ) : (
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '50%',
                      background: '#FC7038', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontFamily: 'Barlow Condensed',
                      fontSize: '18px', fontWeight: 700, color: '#F5F3E6', flexShrink: 0
                    }}>
                      {displayName[0].toUpperCase()}
                    </div>
                  )}
                  {/* Listing thumbnail pieni kulmassa */}
                  {listingImage && (
                    <img
                      src={listingImage}
                      alt=""
                      style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #F5F3E6' }}
                    />
                  )}
                </div>

                <div className="conversation-body">
                  <p className="conversation-listing" style={{ fontWeight: 600 }}>{displayName}</p>
                  <p style={{ fontSize: '12px', color: '#9a9080', margin: '1px 0 3px', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>{listingTitle}</p>
                  <p className="conversation-preview">
                    {msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content}
                  </p>
                </div>

                <div className="conversation-meta">
                  <span className="conversation-date">
                    {new Date(msg.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
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