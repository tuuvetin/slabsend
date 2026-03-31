'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [offerAmount, setOfferAmount] = useState('')
  const [showOffer, setShowOffer] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const [offerLoading, setOfferLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
      setListing(data)
      setLoading(false)
    })
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

  if (loading) return <p className="listing-loading">Loading...</p>
  if (!listing) return <p className="listing-loading">Listing not found.</p>

  const isRental = listing.listing_type === 'rent'
  const images: string[] = listing.images || []

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
                <img key={i} src={url} alt={listing.title} className={`listing-image ${i === 0 ? 'listing-image-main' : ''}`} onClick={() => setLightboxIndex(i)} style={{ cursor: 'pointer' }} />
              ))}
            </div>
          ) : (
            <div className="listing-no-image">No photos</div>
          )}
        </div>

        <div className="listing-detail-info">
          {isRental && <span className="listing-rental-badge">For rent</span>}
          <h1 className="listing-detail-title">{listing.title}</h1>
          <p className="listing-detail-price">{listing.price} €{isRental ? '/day' : ''}</p>
          <div className="listing-detail-meta">
            {listing.location && <span className="listing-meta-item">📍 {listing.location}</span>}
            {listing.category && <span className="listing-meta-item">{listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}</span>}
            {listing.condition && <span className="listing-meta-item listing-meta-cond">{conditionLabels[listing.condition] || listing.condition}</span>}
          </div>
          {listing.description && <p className="listing-detail-desc">{listing.description}</p>}

          {/* BUYER ACTIONS */}
          {currentUser && currentUser.id !== listing.user_id && (
            <div className="listing-contact">

              {/* BUY NOW + MAKE OFFER */}
              {!isRental && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                  <button
                    className="form-submit"
                    onClick={handleBuyNow}
                    disabled={buyLoading}
                    style={{ flex: 1 }}
                  >
                   {buyLoading ? 'Loading...' : `Buy now — ${Math.round(listing.price * 1.08)} €`}
                  </button>
                  <button
                    onClick={() => setShowOffer(!showOffer)}
                    style={{
                      flex: 1, fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer',
                      background: 'transparent', color: '#FC7038', border: '1px solid #FC7038',
                      borderRadius: '8px', padding: '14px',
                      transition: 'all 0.15s'
                    }}
                  >
                    Make an offer
                  </button>
                </div>
              )}

              {/* OFFER FORM */}
              {showOffer && (
                <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '10px' }}>
                    Your offer (asking price: {listing.price} €)
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      className="form-input"
                      type="number"
                      placeholder={`Max ${listing.price} €`}
                      value={offerAmount}
                      onChange={e => setOfferAmount(e.target.value)}
                      style={{ marginBottom: 0 }}
                    />
                    <button
                      className="form-submit"
                      onClick={handleSendOffer}
                      disabled={offerLoading}
                      style={{ width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}
                    >
                      {offerLoading ? 'Sending...' : 'Send offer'}
                    </button>
                  </div>
                </div>
              )}

              {messageSent && <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`}>{messageSent}</p>}

              {/* MESSAGE */}
              <h3 className="listing-contact-title">{isRental ? 'Ask about rental' : 'Contact seller'}</h3>
              <textarea className="form-input form-textarea" placeholder="Write a message..." value={message} onChange={e => setMessage(e.target.value)} />
              <button className="form-submit" onClick={handleSendMessage}>Send message</button>
            </div>
          )}

          {!currentUser && (
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