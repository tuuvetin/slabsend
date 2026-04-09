'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ConversationPage() {
  const params = useParams()
  const listingId = params.listingId as string
  const otherUserId = params.userId as string

  const [messages, setMessages] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [counterAmount, setCounterAmount] = useState('')
  const [showCounter, setShowCounter] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [order, setOrder] = useState<any>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setCurrentUser(user)

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('listing_id', listingId)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])

      const { data: l } = await supabase.from('listings').select('*').eq('id', listingId).single()
      setListing(l)

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', [user.id, otherUserId])

      const profileMap: Record<string, any> = {}
      for (const p of profileData || []) profileMap[p.user_id] = p
      setProfiles(profileMap)

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('listing_id', parseInt(listingId as string))
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in('status', ['paid', 'confirmed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (orderData) setOrder(orderData)
      setLoading(false)

      const channel = supabase
        .channel(`messages-${listingId}-${user.id}-${otherUserId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${listingId}`
        }, (payload) => {
          const msg = payload.new as any
          if (
            (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === user.id)
          ) {
            setMessages(prev => [...prev, msg])
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${listingId}`
        }, (payload) => setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)))
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [listingId, otherUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser) return
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: listingId,
      content: newMessage,
    })
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message', recipientId: otherUserId, listingId, preview: newMessage }),
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
    if (action === 'accepted') {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'offer', recipientId: otherUserId, listingId, offerAction: 'accepted' }),
      })
    }
  }

  const handleCounterOffer = async (msg: any) => {
    if (!counterAmount || isNaN(Number(counterAmount))) return
    await supabase.from('messages').update({ offer_status: 'countered' }).eq('id', msg.id)
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: listingId,
      content: `💰 Counter offer: ${counterAmount} €`,
      is_offer: true,
      offer_amount: parseFloat(counterAmount),
      offer_status: 'pending',
    })
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'offer', recipientId: otherUserId, listingId, offerAction: 'countered' }),
    })
    setShowCounter(null)
    setCounterAmount('')
  }

  const handleConfirmReceipt = async () => {
    if (!order) return
    setConfirmLoading(true)
    await supabase
      .from('orders')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', order.id)
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'receipt_confirmed', recipientId: otherUserId, listingId }),
    })
    setConfirmLoading(false)
    setConfirmDone(true)
    setOrder({ ...order, status: 'confirmed' })
  }

  const Avatar = ({ userId, size = 32 }: { userId: string; size?: number }) => {
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

  const isBuyer = order && currentUser && order.buyer_id === currentUser.id
  const isSellerOrder = order && currentUser && order.seller_id === currentUser.id
  const otherProfile = profiles[otherUserId]
  const otherName = otherProfile?.username || otherProfile?.full_name || 'User'

  return (
    <div className="conversation-page">

      {/* HEADER */}
      <div className="conversation-header">
        <a href="/messages" className="conversation-back-btn">← Messages</a>
        <a href={`/sellers/${otherUserId}`} className="conversation-header-center" style={{ textDecoration: 'none' }}>
          <Avatar userId={otherUserId} size={32} />
          <span className="conversation-header-name">{otherName}</span>
        </a>
        <div style={{ width: 90 }} />
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="conversation-scroll">

        {listing && (
          <a href={`/listings/${listingId}`} style={{ textDecoration: 'none' }} className="conversation-listing-header">
            {listing.images && listing.images.length > 0 && (
              <img src={listing.images[0]} alt={listing.title} className="conversation-listing-img" />
            )}
            <div>
              <h2 className="conversation-listing-title">{listing.title}</h2>
              <p className="conversation-listing-price">{listing.price} €{listing.listing_type === 'rent' ? '/day' : ''}</p>
            </div>
          </a>
        )}

        {order && order.status === 'paid' && isBuyer && !confirmDone && (
          <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>✓ Payment confirmed</p>
            <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: '1.5', marginBottom: '14px' }}>
              Once you receive the item and everything looks good, confirm below. The seller will receive payment after your confirmation or automatically after 48 hours.
            </p>
            <button className="form-submit" onClick={handleConfirmReceipt} disabled={confirmLoading} style={{ background: '#2a6a2a', width: '100%' }}>
              {confirmLoading ? 'Confirming...' : 'Item received ✓'}
            </button>
            <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '8px', textAlign: 'center' }}>
              Problem? Contact <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a> within 48h
            </p>
          </div>
        )}

        {order && order.status === 'paid' && isSellerOrder && (
          <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>✓ Item sold — payment received</p>
            <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: '1.5' }}>
              The buyer has paid. You will receive <strong>{order.amount} €</strong> to your bank account once the buyer confirms receipt or automatically after 48 hours.
            </p>
            <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '8px' }}>
              Order #{order.order_number || order.id} · Questions? <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a>
            </p>
          </div>
        )}

        {(order?.status === 'confirmed' || confirmDone) && (
          <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: '#2a6a2a' }}>✓ Transaction complete</p>
            <p style={{ fontSize: '13px', color: '#3a3428', marginTop: '4px' }}>
              {isBuyer ? 'Thank you for your purchase!' : 'Payment will be transferred to your account shortly.'}
            </p>
          </div>
        )}

        {/* MESSAGES */}
        <div className="conversation-messages">
          {messages.map((msg, idx) => {
            const isMine = msg.sender_id === currentUser?.id
            const isOffer = msg.is_offer
            const isPending = msg.offer_status === 'pending'
            const isAccepted = msg.offer_status === 'accepted'
            const isSellerMsg = listing && currentUser && listing.user_id === currentUser.id
            const isBuyerMsg = msg.sender_id === currentUser?.id

            const senderProfile = profiles[msg.sender_id]
            const senderName = senderProfile?.username || senderProfile?.full_name || ''

            const prevMsg = idx > 0 ? messages[idx - 1] : null
            const msgDate = new Date(msg.created_at)
            const prevDate = prevMsg ? new Date(prevMsg.created_at) : null
            const showDateSep = !prevDate || msgDate.toDateString() !== prevDate.toDateString()
            const time = msgDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            const dateLabel = msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="message-date-sep">
                    <span>{dateLabel}</span>
                  </div>
                )}

                <div className={`message-row ${isMine ? 'mine' : 'theirs'}`}>
                  {!isMine && <Avatar userId={msg.sender_id} size={28} />}

                  <div className="message-body">
                    {!isMine && senderName && (
                      <p className="message-sender-label">{senderName} · {time}</p>
                    )}

                    {isOffer ? (
                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ minWidth: 200 }}>
                        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isMine ? 'rgba(245,243,230,0.7)' : '#9a9080', margin: '0 0 4px' }}>
                          {msg.offer_status === 'accepted' ? '✓ Offer accepted' : msg.offer_status === 'declined' ? '✗ Offer declined' : msg.offer_status === 'countered' ? '↩ Counter offered' : 'Offer'}
                        </p>
                        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '24px', fontWeight: 700, color: isMine ? '#F5F3E6' : '#1a1408', margin: '0 0 10px' }}>{msg.offer_amount} €</p>

                        {isSellerMsg && isPending && !isBuyerMsg && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button onClick={() => handleOfferAction(msg.id, 'accepted')} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept</button>
                            <button onClick={() => setShowCounter(showCounter === msg.id ? null : msg.id)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: isMine ? '#F5F3E6' : '#FC7038', border: `1px solid ${isMine ? 'rgba(245,243,230,0.5)' : '#FC7038'}`, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Counter</button>
                            <button onClick={() => handleOfferAction(msg.id, 'declined')} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: isMine ? 'rgba(245,243,230,0.7)' : '#aa2200', border: `1px solid ${isMine ? 'rgba(245,243,230,0.3)' : '#aa2200'}`, padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Decline</button>
                          </div>
                        )}

                        {isBuyerMsg && isAccepted && (
                          <button onClick={() => handleAcceptAndPay(msg)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept & Pay</button>
                        )}

                        {showCounter === msg.id && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                            <input type="number" placeholder="Your counter offer €" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} style={{ fontFamily: 'Barlow', fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', background: '#F5F3E6', color: '#1a1408', flex: 1 }} />
                            <button onClick={() => handleCounterOffer(msg)} style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FC7038', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Send</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        <p className="message-content">{msg.content}</p>
                      </div>
                    )}

                    {isMine && <p className="message-time-mine">{time}</p>}
                    {!isMine && !senderName && <p className="message-time-theirs">{time}</p>}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* INPUT */}
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
