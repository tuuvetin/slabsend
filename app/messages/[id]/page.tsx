'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ConversationPage() {
  const params = useParams()
  const [messages, setMessages] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setCurrentUser(user)

      supabase.from('messages')
        .select('*')
        .eq('listing_id', params.id)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setMessages(data || [])
          if (data && data.length > 0) {
            supabase.from('listings').select('*').eq('id', data[0].listing_id).single().then(({ data: l }) => setListing(l))
          }
          setLoading(false)
        })

      const channel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || messages.length === 0) return
    const otherUserId = messages[0].sender_id === currentUser.id
      ? messages[0].receiver_id
      : messages[0].sender_id
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: params.id,
      content: newMessage
    })
    setNewMessage('')
  }

  if (loading) return <p className="listing-loading">Loading...</p>

  return (
    <div className="conversation-page">
      <a href="/messages" className="listing-back">← Back to messages</a>

      {listing && (
        <div className="conversation-listing-header">
          {listing.images && listing.images.length > 0 && (
            <img src={listing.images[0]} alt={listing.title} className="conversation-listing-img" />
          )}
          <div>
            <h2 className="conversation-listing-title">{listing.title}</h2>
            <p className="conversation-listing-price">
              {listing.price} €{listing.listing_type === 'rent' ? '/day' : ''}
            </p>
          </div>
        </div>
      )}

      <div className="conversation-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message-row ${msg.sender_id === currentUser?.id ? 'mine' : 'theirs'}`}
          >
            <div className={`message-bubble ${msg.sender_id === currentUser?.id ? 'mine' : 'theirs'}`}>
              <p className="message-content">{msg.content}</p>
              <p className="message-time">
                {new Date(msg.created_at).toLocaleTimeString('en-GB', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="conversation-input-row">
        <input
          className="conversation-input"
          placeholder="Write a message..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="conversation-send-btn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  )
}