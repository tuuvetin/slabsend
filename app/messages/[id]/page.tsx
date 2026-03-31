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
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setCurrentUser(user)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', params.id)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      if (msgs && msgs.length > 0) {
        // Haetaan listing
        const { data: l } = await supabase.from('listings').select('*').eq('id', msgs[0].listing_id).single()
        setListing(l)

        // Haetaan kaikkien osallistujien profiilit
        const userIds = [...new Set(msgs.flatMap(m => [m.sender_id, m.receiver_id]))]
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, username, full_name, avatar_url')
          .in('user_id', userIds)

        const profileMap: Record<string, any> = {}
        for (const p of profileData || []) profileMap[p.user_id] = p
        setProfiles(profileMap)
      }

      setLoading(false)

      const channel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => setMessages(prev => [...prev, payload.new]))
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)))
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

  const handleAcceptAndPay = async (msg: any) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, amount: msg.offer_amount }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const handleOfferAction = async (msgId: string, action: 'accepted' | 'declined') => {
    await supabase.from('messages').update({ offer_status: action }).eq('id', msgId)
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

  const Avatar = ({ userId, size = 32 }: { userId: string, size?: number }) => {
    const p = profiles[userId]
    const name = p?.username || p?.full_name || '?'
    if (p?.avatar_url) return (
      <img src={p.avatar_url} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    )
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Barlow Condensed', fontSize: size * 0.45, fontWeight: 700, color: '#F5F3E6', flexShrink: 0 }}>
        {name[0].toUpperCase()}
      </div>
    )
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
      {messages.length > 0 && (() => {
        const otherUserId = messages[0].sender_id === currentUser?.id
          ? messages[0].receiver_id
          : messages[0].sender_id
        const otherProfile = profiles[otherUserId]
        const otherName = otherProfile?.username || otherProfile?.full_name || null
        return otherName ? (
          <p style={{ fontSize: '12px', color: '#9a9080', marginTop: '2px', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>
            Conversation with {otherName}
          </p>
        ) : null
      })()}
    </div>
  </div>
)}

      <div className="conversation-messages">
        {messages.map(msg => {
          const isMine = msg.sender_id === currentUser?.id
          const isOffer = msg.is_offer
          const isPending = msg.offer_status === 'pending'
          const isAccepted = msg.offer_status === 'accepted'
          const isSeller = listing && currentUser && listing.user_id === currentUser.id
          const isBuyer = msg.sender_id === currentUser?.id
          const senderProfile = profiles[msg.sender_id]
          const senderName = senderProfile?.username || senderProfile?.full_name || ''

          return (
            <div key={msg.id} className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
              {/* Avatar vastapuolelle */}
              {!isMine && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginRight: '8px' }}>
                  <Avatar userId={msg.sender_id} size={32} />
                  {senderName && (
                    <span style={{ fontSize: '10px', fontFamily: 'Barlow Condensed', color: '#9a9080', letterSpacing: '0.05em', maxWidth: '48px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {senderName}
                    </span>
                  )}
                </div>
              )}

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

                  {isSeller && isPending && !isBuyer && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => handleOfferAction(msg.id, 'accepted')} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => setShowCounter(showCounter === msg.id ? null : msg.id)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#FC7038', border: '1px solid #FC7038', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Counter</button>
                      <button onClick={() => handleOfferAction(msg.id, 'declined')} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#aa2200', border: '1px solid #aa2200', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Decline</button>
                    </div>
                  )}

                  {isBuyer && isAccepted && (
                    <button onClick={() => handleAcceptAndPay(msg)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept & Pay</button>
                  )}

                  {showCounter === msg.id && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      <input type="number" placeholder="Your counter offer €" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} style={{ fontFamily: 'Barlow', fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', background: '#F5F3E6', color: '#1a1408', flex: 1 }} />
                      <button onClick={() => handleCounterOffer(msg)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FC7038', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Send</button>
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

              {/* Oma avatar oikealle */}
              {isMine && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                  <Avatar userId={currentUser.id} size={32} />
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