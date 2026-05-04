'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
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
  const [imageUploading, setImageUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const adjustTextareaHeight = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const markIncomingAsRead = useCallback(async (userId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('listing_id', listingId)
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('is_read', false)
  }, [listingId, otherUserId])

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

      // Mark all incoming messages as read
      await markIncomingAsRead(user.id)

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
        .eq('listing_id', listingId)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in('status', ['paid', 'confirmed', 'label_created'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (orderData) {
        setOrder(orderData)
      } else {
        // Fallback: check localStorage (set by listing page after payment redirect)
        const cached = localStorage.getItem(`order_${listingId}`)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            if (parsed.status === 'paid') setOrder(parsed)
          } catch {}
        }
      }
      setLoading(false)

      const channel = supabase
        .channel(`messages-${listingId}-${user.id}-${otherUserId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `listing_id=eq.${listingId}`
        }, async (payload) => {
          const msg = payload.new as any
          if (msg.sender_id === user.id && msg.receiver_id === otherUserId) {
            setMessages(prev => [...prev, msg])
          } else if (msg.sender_id === otherUserId && msg.receiver_id === user.id) {
            // Mark incoming realtime message as read immediately (we're looking at the convo)
            await supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
            setMessages(prev => [...prev, { ...msg, is_read: true }])
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
    const content = newMessage.trim()
    setNewMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: listingId,
      content,
    })
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message', recipientId: otherUserId, listingId, preview: content }),
    })
  }

  const handleImageUpload = async (file: File) => {
    if (!currentUser || imageUploading) return
    setImageUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `chat/${listingId}/${currentUser.id}-${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('listing-images').upload(path, file, { cacheControl: '3600' })
      if (error) { setImageUploading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(path)
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: otherUserId,
        listing_id: listingId,
        content: 'Photo',
        image_url: publicUrl,
      })
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'message', recipientId: otherUserId, listingId, preview: 'Photo' }),
      })
    } finally {
      setImageUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
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
    localStorage.removeItem(`order_${listingId}`)
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
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, fontWeight: 700, color: '#F5F3E6', flexShrink: 0 }}>
        {name[0].toUpperCase()}
      </div>
    )
  }

  if (loading) return <p className="listing-loading">Loading...</p>

  const isBuyer = order && currentUser && order.buyer_id === currentUser.id
  const isSellerOrder = order && currentUser && order.seller_id === currentUser.id
  const otherProfile = profiles[otherUserId]
  const otherName = otherProfile?.username || otherProfile?.full_name || 'User'

  // Find index of last message sent by me — for "Seen" receipt
  let lastMyMsgIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender_id === currentUser?.id) { lastMyMsgIdx = i; break }
  }

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
            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>Payment confirmed</p>
            <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: '1.5', marginBottom: '14px' }}>
              Once you receive the item and everything looks good, confirm below. The seller will receive payment after your confirmation or automatically after 48 hours.
            </p>
            <button className="form-submit" onClick={handleConfirmReceipt} disabled={confirmLoading} style={{ background: '#2a6a2a', width: '100%' }}>
              {confirmLoading ? 'Confirming...' : 'Item received'}
            </button>
            <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '8px', textAlign: 'center' }}>
              Problem? Contact <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a> within 48h
            </p>
          </div>
        )}

        {order && order.status === 'paid' && isSellerOrder && (
          <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>Item sold — payment received</p>
            <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: '1.5' }}>
              The buyer has paid. You will receive <strong>{order.amount} €</strong> to your bank account once the buyer confirms receipt or automatically after 48 hours.
            </p>
            {order.activation_code && (
              <div style={{ marginTop: '12px', background: '#fff', border: '1px solid rgba(42,106,42,0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '4px' }}>Matkahuolto activation code</p>
                <p style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.12em', color: '#3a3428', fontFamily: 'monospace' }}>{order.activation_code}</p>
                <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '4px' }}>Enter this code at the Matkahuolto parcel machine to send the package.</p>
              </div>
            )}
            <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '8px' }}>
              Order #{order.order_number || order.id} · Questions? <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a>
            </p>
          </div>
        )}

        {(order?.status === 'confirmed' || confirmDone) && (
          <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: '#2a6a2a' }}>Transaction complete</p>
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

            const isLastMine = isMine && idx === lastMyMsgIdx
            const showSeen = isLastMine && msg.is_read

            // System messages render as centered pill, skip normal row layout
            if (msg.content?.startsWith('__SYSTEM__:') || msg.content?.startsWith('✅ Payment confirmed')) {
              let systemText: string
              if (msg.content.startsWith('__SYSTEM__:')) {
                systemText = msg.content.replace('__SYSTEM__:', '')
              } else {
                // Old format: "✅ Payment confirmed for "X". Order #Y. The seller will receive..."
                // Extract just the order number and show clean neutral text
                const orderMatch = msg.content.match(/Order #([\w-]+)/)
                systemText = orderMatch ? `Payment confirmed — Order #${orderMatch[1]}` : 'Payment confirmed'
              }
              return (
                <div key={msg.id}>
                  {showDateSep && <div className="message-date-sep"><span>{dateLabel}</span></div>}
                  <div style={{ textAlign: 'center', margin: '10px 0' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(26,20,8,0.07)', color: '#7a7060', fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', padding: '5px 14px', borderRadius: '20px' }}>
                      {systemText}
                    </span>
                  </div>
                </div>
              )
            }

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

                    {msg.image_url ? (
                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ padding: '4px', overflow: 'hidden' }}>
                        <img
                          src={msg.image_url}
                          alt="shared image"
                          style={{ maxWidth: '220px', maxHeight: '280px', width: '100%', objectFit: 'cover', borderRadius: '14px', display: 'block' }}
                        />
                      </div>
                    ) : isOffer ? (
                      <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`} style={{ minWidth: 200 }}>
                        <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: isMine ? 'rgba(245,243,230,0.7)' : '#9a9080', margin: '0 0 4px' }}>
                          {msg.offer_status === 'accepted' ? '✓ Offer accepted' : msg.offer_status === 'declined' ? '✗ Offer declined' : msg.offer_status === 'countered' ? '↩ Counter offered' : 'Offer'}
                        </p>
                        <p style={{ fontSize: '24px', fontWeight: 700, color: isMine ? '#F5F3E6' : '#1a1408', margin: '0 0 10px' }}>{msg.offer_amount} €</p>

                        {/* Pending offer not sent by me → show action buttons for the recipient */}
                        {!isMine && isPending && !listing?.sold && !order && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {listing && listing.user_id === currentUser?.id ? (
                              // Seller receiving buyer's offer → Accept (notify only, no payment)
                              <button onClick={() => handleOfferAction(msg.id, 'accepted')} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept</button>
                            ) : (
                              // Buyer receiving seller's counter → Accept & Pay
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button onClick={() => handleAcceptAndPay(msg)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept & Pay</button>
                                <span style={{ fontSize: '10px', color: isMine ? 'rgba(245,243,230,0.6)' : '#9a9080' }}>+{(msg.offer_amount * 0.10).toFixed(2)} € buyer protection · shipping selected at checkout</span>
                              </div>
                            )}
                            <button onClick={() => setShowCounter(showCounter === msg.id ? null : msg.id)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#FC7038', border: '1px solid #FC7038', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Counter</button>
                            <button onClick={() => handleOfferAction(msg.id, 'declined')} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#aa2200', border: '1px solid #aa2200', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Decline</button>
                          </div>
                        )}

                        {/* Accept & Pay: own offer was accepted by seller */}
                        {isMine && isAccepted && !listing?.sold && !order && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button onClick={() => handleAcceptAndPay(msg)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#2a6a2a', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Accept & Pay</button>
                            <span style={{ fontSize: '10px', color: 'rgba(245,243,230,0.6)' }}>+{(msg.offer_amount * 0.10).toFixed(2)} € buyer protection · shipping selected at checkout</span>
                          </div>
                        )}

                        {showCounter === msg.id && (
                          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                            <input type="number" placeholder="Your counter offer €" value={counterAmount} onChange={e => setCounterAmount(e.target.value)} style={{ fontSize: '13px', padding: '6px 10px', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', background: '#F5F3E6', color: '#1a1408', flex: 1 }} />
                            <button onClick={() => handleCounterOffer(msg)} style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#FC7038', color: '#F5F3E6', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Send</button>
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

                    {showSeen && (
                      <p className="message-seen-label">Seen</p>
                    )}
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
        {/* Image upload button */}
        <button
          className="conversation-img-btn"
          onClick={() => imageInputRef.current?.click()}
          disabled={imageUploading}
          title="Send photo"
        >
          {imageUploading ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }}
        />

        <textarea
          ref={textareaRef}
          className="conversation-input"
          placeholder="Write a message..."
          value={newMessage}
          rows={1}
          onChange={e => { setNewMessage(e.target.value); adjustTextareaHeight() }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <button className="conversation-send-btn" onClick={handleSend}>Send</button>
      </div>
    </div>
  )
}
