'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          const seen = new Set()
          const unique = (data || []).filter(msg => {
            if (seen.has(msg.listing_id)) return false
            seen.add(msg.listing_id)
            return true
          })
          setConversations(unique)
          setLoading(false)
        })
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
        {conversations.map(msg => (
          <a key={msg.id} href={`/messages/${msg.listing_id}`} className="conversation-link">
            <div className="conversation-card">
              <div className="conversation-icon">💬</div>
              <div className="conversation-body">
                <p className="conversation-listing">Listing #{msg.listing_id}</p>
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
        ))}
      </div>
    </div>
  )
}