'use client'
import RentalCalendar from '@/app/components/RentalCalendar'
import FavoriteButton from '@/app/components/FavoriteButton'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

const ADMINS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com']

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [sellerProfile, setSellerProfile] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [showOffer, setShowOffer] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const [offerLoading, setOfferLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // localStorage tarkistetaan vain kirjautuneelle käyttäjälle
      if (user) {
        const cached = localStorage.getItem(`order_${params.id}`)
        if (cached) {
          const parsedOrder = JSON.parse(cached)
          if (parsedOrder.status === 'paid') setOrder(parsedOrder)
        }
      }

      const { data } = await supabase.from('listings').select('*').eq('id', params.id).single()

      if (!data || (data.sold && !user)) {
        window.location.href = '/listings'
        return
      }

      if (data.sold && user) {
        const isAdmin = ADMINS.includes(user.email || '')
        const isSellerOfThis = data.user_id === user.id
        const { data: orderData } = await supabase
          .from('orders')
          .select('buyer_id')
          .eq('listing_id', data.id)
          .single()
        const isBuyerOfThis = orderData?.buyer_id === user.id
        if (!isBuyerOfThis && !isSellerOfThis && !isAdmin) {
          window.location.href = '/listings'
          return
        }
      }

      setListing(data)
      setLoading(false)

      if (data?.user_id) {
        supabase.from('profiles').select('username, full_name, avatar_url, location').eq('user_id', data.user_id).single().then(({ data: p }) => setSellerProfile(p))
      }

      if (user) {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('payment') === 'success') {
          const { data: orderData } = await supabase
            .from('orders')
            .select('*')
            .eq('listing_id', params.id)
            .eq('buyer_id', user.id)
            .eq('status', 'paid')
            .single()
          if (orderData) {
            setOrder(orderData)
            localStorage.setItem(`order_${params.id}`, JSON.stringify(orderData))
          }
        }
      }
    }

    init()
  }, [params.id])

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])
  const prevImage = useCallback(() => {
    if (!listing?.images) return
    setLightboxIndex(i => i === 0 ? listing.images.length - 1 : (i ?? 0) - 1)
  }, [listing])
  const nextImage = useCallback(() => {
    if (!listing?.images) return
    setLightboxIndex(i => i === listing.images.length - 1 ? 0 : (i ?? 0) + 1)
  }, [listing])

  useEffect(() => {
    if (lightboxIndex === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'Escape') closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIndex, prevImage, nextImage, closeLightbox])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    setDeleting(true)
    if (listing.images && listing.images.length > 0) {
      const paths = listing.images.map((url: string) => {
        const parts = url.split('/listing-images/')
        return parts[1] || ''
      }).filter(Boolean)
      if (paths.length > 0) await supabase.storage.from('listing-images').remove(paths)
    }
    const { error } = await supabase.from('listings').delete().eq('id', listing.id).eq('user_id', currentUser.id)
    if (error) { alert('Error deleting listing: ' + error.message); setDeleting(false); return }
    window.location.href = '/listings'
  }

  const handleSendMessage = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (!message.trim()) return
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id, receiver_id: listing.user_id,
      listing_id: listing.id, content: message
    })
    if (error) setMessageSent('Error: ' + error.message)
    else { setMessageSent('Message sent!'); setMessage('') }
  }

  const handleBuyNow = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    setBuyLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, amount: listing.price }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      alert(data.error || 'Payment error')
      setBuyLoading(false)
    }
  }

  const handleSendOffer = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (!offerAmount || isNaN(Number(offerAmount))) return
    setOfferLoading(true)
    const offerMsg = `💰 Offer: ${offerAmount} €`
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: listing.user_id,
      listing_id: listing.id,
      content: offerMsg,
      is_offer: true,
      offer_amount: parseFloat(offerAmount),
      offer_status: 'pending',
    })
    setOfferLoading(false)
    if (error) setMessageSent('Error: ' + error.message)
    else {
      setMessageSent('Offer sent!')
      setShowOffer(false)
      setOfferAmount('')
    }
  }

  const handleConfirmReceipt = async () => {
    if (!order) return
    setConfirmLoading(true)
    await supabase
      .from('orders')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('id', order.id)
    localStorage.removeItem(`order_${params.id}`)
    setConfirmLoading(false)
    setConfirmDone(true)
    setOrder(null)
  }

  if (loading) return <p className="listing-loading">Loading...</p>
  if (!listing) return <p className="listing-loading">Listing not found.</p>

  const isRental = listing.listing_type === 'rent'
  const images: string[] = listing.images || []
  const sellerName = sellerProfile?.username || sellerProfile?.full_name || ''

  return (
    <div className="listing-detail-page">

      {/* LIGHTBOX */}
      {lightboxIndex !== null && images.length > 0 && (
        <div onClick={closeLightbox} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); prevImage() }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(240,234,216,0.15)', border: '1px solid rgba(240,234,216,0.3)', color: '#f0ead8', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          )}
          <img src={images[lightboxIndex]} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }} alt="" />
          {images.length > 1 && (
            <button onClick={e => { e.stopPropagation(); nextImage() }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(240,234,216,0.15)', border: '1px solid rgba(240,234,216,0.3)', color: '#f0ead8', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          )}
          <button onClick={closeLightbox} style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', color: '#f0ead8', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          {images.length > 1 && (
            <p style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(240,234,216,0.6)', fontFamily: 'Barlow Condensed', fontSize: '13px', letterSpacing: '0.12em', margin: 0 }}>
              {lightboxIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}

      <a href="/listings" className="listing-back">← Back to listings</a>

      <div className="listing-detail-grid">
        <div className="listing-detail-images">
          {images.length > 0 ? (
            <div className="listing-images-grid">
              {images.map((url, i) => (
                i === 0 ? (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={url} alt={listing.title} className="listing-image listing-image-main" onClick={() => setLightboxIndex(i)} style={{ cursor: 'pointer', display: 'block', width: '100%' }} />
                    <FavoriteButton listingId={listing.id} />
                  </div>
                ) : (
                  <img key={i} src={url} alt={listing.title} className="listing-image" onClick={() => setLightboxIndex(i)} style={{ cursor: 'pointer' }} />
                )
              ))}
            </div>
          ) : (
            <div className="listing-no-image">No photos</div>
          )}
        </div>

        <div className="listing-detail-info">

          {/* SOLD BANNER */}
          {listing.sold && (
            <div style={{ background: '#f5f0e8', border: '1px solid rgba(26,20,8,0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7060', margin: 0 }}>
                🔒 This item has been sold
              </p>
            </div>
          )}

          {/* ITEM RECEIVED */}
          {order && !confirmDone && (
            <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>
                ✓ Payment confirmed
              </p>
              <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: '1.5', marginBottom: '14px' }}>
                Once you receive the item and everything looks good, confirm receipt below. The seller will receive payment after your confirmation or automatically after 48 hours.
              </p>
              <button className="form-submit" onClick={handleConfirmReceipt} disabled={confirmLoading} style={{ background: '#2a6a2a', width: '100%' }}>
                {confirmLoading ? 'Confirming...' : 'Item received ✓'}
              </button>
              <p style={{ fontSize: '11px', color: '#7a7060', marginTop: '8px', textAlign: 'center' }}>
                Problem? Contact <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a> within 48h
              </p>
            </div>
          )}

          {confirmDone && (
            <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', color: '#2a6a2a' }}>
                ✓ Receipt confirmed — thank you!
              </p>
              <p style={{ fontSize: '13px', color: '#3a3428', marginTop: '4px' }}>
                The seller will receive their payment shortly.
              </p>
            </div>
          )}

          {isRental && <span className="listing-rental-badge">For rent</span>}
          <h1 className="listing-detail-title">{listing.title}</h1>
          <p className="listing-detail-price">{listing.price} €{isRental ? '/day' : ''}</p>
          <div className="listing-detail-meta">
            {listing.location && <span className="listing-meta-item">📍 {listing.location}</span>}
            {listing.category && <span className="listing-meta-item">{listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}</span>}
            {listing.condition && <span className="listing-meta-item listing-meta-cond">{conditionLabels[listing.condition] || listing.condition}</span>}
          </div>
          {listing.description && <p className="listing-detail-desc">{listing.description}</p>}

          {/* DELIVERY OPTIONS */}
          {(listing.pickup_enabled || listing.shipping_enabled) && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              {listing.pickup_enabled && (
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.12)', borderRadius: '20px', padding: '5px 12px', color: '#1a1408', cursor: 'default' }}
                  onMouseEnter={e => { const t = (e.currentTarget as HTMLElement).querySelector('.pickup-tip') as HTMLElement; if (t) t.style.display = 'block' }}
                  onMouseLeave={e => { const t = (e.currentTarget as HTMLElement).querySelector('.pickup-tip') as HTMLElement; if (t) t.style.display = 'none' }}
                >
                  📍 Pickup
                  <span className="pickup-tip" style={{ display: 'none', position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1a1408', color: '#F5F3E6', fontSize: '11px', fontWeight: 400, letterSpacing: '0.03em', textTransform: 'none', fontFamily: 'Barlow', borderRadius: '6px', padding: '7px 10px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                    Agree on pickup location with the seller via message
                  </span>
                </span>
              )}
              {listing.shipping_enabled && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.12)', borderRadius: '20px', padding: '5px 12px', color: '#1a1408' }}>
                  📦 Shipping
                </span>
              )}
            </div>
          )}

          {/* MYYJÄN PROFIILI */}
          {sellerName && (
            <a href={`/sellers/${listing.user_id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', padding: '10px 14px', background: '#F5F3E6', borderRadius: '8px', border: '1px solid rgba(26,20,8,0.08)', textDecoration: 'none' }}>
              {sellerProfile?.avatar_url ? (
                <img src={sellerProfile.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#F5F3E6', flexShrink: 0, fontFamily: 'Barlow Condensed' }}>
                  {sellerName[0].toUpperCase()}
                </div>
              )}
              <div>
                <p style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1a1408', margin: 0 }}>
                  {sellerName}
                </p>
                <p style={{ fontSize: '11px', color: '#9a9080', margin: '2px 0 0', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>
                  View all listings →
                </p>
              </div>
            </a>
          )}

          {/* KALENTERI */}
          {isRental && (
            <RentalCalendar
              listingId={listing.id}
              pricePerDay={listing.price}
              rentalPeriod={listing.rental_period || 'day'}
              isOwner={currentUser?.id === listing.user_id}
              currentUserId={currentUser?.id}
            />
          )}

          {/* BUYER ACTIONS — piilotetaan jos myyty tai tilaus on jo olemassa */}
          {!listing.sold && !order && currentUser && currentUser.id !== listing.user_id && (
            <div className="listing-contact">
              {!isRental && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <button className="form-submit" onClick={handleBuyNow} disabled={buyLoading} style={{ flex: 1 }}>
                      {buyLoading ? 'Loading...' : `Buy now — ${(listing.price * 1.08).toFixed(2)} €`}
                    </button>
                    <button onClick={() => setShowOffer(!showOffer)} style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', color: '#FC7038', border: '1px solid #FC7038', borderRadius: '8px', padding: '14px', transition: 'all 0.15s' }}>
                      Make an offer
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: '#F0F7F0', borderRadius: '6px', border: '1px solid rgba(42,106,42,0.15)', position: 'relative' }}>
                    <span style={{ fontSize: '14px' }}>🛡️</span>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', color: '#2a6a2a', letterSpacing: '0.05em' }}>
                      Buyer protection included — {(listing.price * 0.08).toFixed(2)} €
                    </span>
                    <div style={{ marginLeft: 'auto', position: 'relative' }} className="info-tooltip-wrap">
                      <button className="info-btn">i</button>
                      <div className="info-tooltip">
                        Your purchase is protected. If something goes wrong, Slabsend steps in to help resolve the issue and ensure you get your money back. The seller receives payment only after you confirm the item is as described. If the item doesn't match the listing, contact info@slabsend.com and we'll help resolve it.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showOffer && (
                <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '10px' }}>
                    Your offer (asking price: {listing.price} €)
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="form-input" type="number" placeholder={`Max ${listing.price} €`} value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 0 }} />
                    <button className="form-submit" onClick={handleSendOffer} disabled={offerLoading} style={{ width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                      {offerLoading ? 'Sending...' : 'Send offer'}
                    </button>
                  </div>
                  {offerAmount && !isNaN(Number(offerAmount)) && Number(offerAmount) > 0 && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', background: '#fff', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.08)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '4px' }}>
                        <span>Your offer</span><span>{Number(offerAmount).toFixed(2)} €</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '4px' }}>
                        <span>🛡️ Buyer protection</span><span>{(Number(offerAmount) * 0.08).toFixed(2)} €</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#1a1408', borderTop: '1px solid rgba(26,20,8,0.08)', paddingTop: '6px', marginTop: '4px' }}>
                        <span>Total you pay</span><span>{(Number(offerAmount) * 1.08).toFixed(2)} €</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {messageSent && <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`}>{messageSent}</p>}

              <h3 className="listing-contact-title">{isRental ? 'Ask about rental' : 'Contact seller'}</h3>
              <textarea className="form-input form-textarea" placeholder="Write a message..." value={message} onChange={e => setMessage(e.target.value)} />
              <button className="form-submit" onClick={handleSendMessage}>Send message</button>
            </div>
          )}

          {!currentUser && !listing.sold && (
            <div className="listing-contact">
              <a href="/login" className="form-submit" style={{ display: 'block', textAlign: 'center' }}>Sign in to contact seller</a>
            </div>
          )}

          {currentUser && currentUser.id === listing.user_id && (
            <div className="listing-owner-actions">
              <button className="listing-edit-btn" onClick={() => window.location.href = `/listings/${listing.id}/edit`}>Edit listing</button>
              <button className="listing-delete-btn" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete listing'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}