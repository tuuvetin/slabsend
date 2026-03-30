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
  const [counterAmount, setCounterAmount] = useState('')
  const [showCounter, setShowCounter] = useState<string | null>(null)
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
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new])
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m))
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

  const handleOfferAction = async (msgId: string, action: 'accepted' | 'declined') => {
    await supabase.from('messages').update({ offer_status: action }).eq('id', msgId)
    if (action === 'accepted' && listing) {
      // Käynnistetään maksu
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          amount: messages.find(m => m.id === msgId)?.offer_amount
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    }
  }

  const handleCounterOffer = async (msg: any) => {
    if (!counterAmount || isNaN(Number(counterAmount))) return
    const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id
    await supabase.from('messages').update({ offer_status: 'countered' }).eq('id', msg.id)
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: params.id,
      content: `💰 Counter offer: ${counterAmount} €`,
      is_offer: true,
      offer_amount: parseFloat(counterAmount),
      offer_status: 'pending',
    })
    setShowCounter(null)
    setCounterAmount('')
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
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUser?.id
          const isOffer = msg.is_offer
          const isPending = msg.offer_status === 'pending'
          const isReceiver = msg.receiver_id === currentUser?.id

          return (
            <div key={msg.id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
              {isOffer ? (
                <div style={{
                  background: isMine ? '#FC7038' : '#F5F3E6',
                  border: isMine ? 'none' : '1px solid rgba(26,20,8,0.12)',
                  borderRadius: '12px',
                  borderBottomRightRadius: isMine ? '3px' : '12px',
                  borderBottomLeftRadius: isMine ? '12px' : '3px',
                  padding: '12px 16px',
                  maxWidth: '75%',
                }}>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isMine ? 'rgba(245,243,230,0.7)' : '#9a9080', marginBottom: '4px' }}>
                    {msg.offer_status === 'accepted' ? '✓ Offer accepted' :
                     msg.offer_status === 'declined' ? '✗ Offer declined' :
                     msg.offer_status === 'countered' ? '↩ Counter offered' : 'Offer'}
                  </p>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '24px', fontWeight: 700, color: isMine ? '#F5F3E6' : '#1a1408', margin: '0 0 8px 0' }}>
                    {msg.offer_amount} €
                  </p>

                  {/* Vastaanottajan napit pending-tarjoukseen */}
                  {isReceiver && isPending && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleOfferAction(msg.id, 'accepted')}
                        style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
                      >Accept & Pay</button>
                      <button
                        onClick={() => setShowCounter(showCounter === msg.id ? null : msg.id)}
                        style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: isMine ? '#F5F3E6' : '#FC7038', border: `1px solid ${isMine ? 'rgba(245,243,230,0.4)' : '#FC7038'}`, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
                      >Counter</button>
                      <button
                        onClick={() => handleOfferAction(msg.id, 'declined')}
                        style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#aa2200', border: '1px solid #aa2200', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}
                      >Decline</button>
                    </div>
                  )}

                  {/* Counter offer -lomake */}
                  {showCounter === msg.id && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <input
                        type="number"
                        placeholder="Your counter offer €"
                        value={counterAmount}
                        onChange={e => setCounterAmount(e.target.value)}
                        style={{ fontFamily: 'Barlow', fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', background: '#F5F3E6', color: '#1a1408', flex: 1 }}
                      />
                      <button
                        onClick={() => handleCounterOffer(msg)}
                        style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FC7038', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >Send</button>
                    </div>
                  )}

                  <p style={{ fontSize: '11px', color: isMine ? 'rgba(245,243,230,0.6)' : '#9a9080', margin: '8px 0 0 0', textAlign: isMine ? 'right' : 'left' }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                  <p className="message-content">{msg.content}</p>
                  <p className="message-time">
                    {new Date(msg.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          )
        })}
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
        <button className="conversation-send-btn" onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}