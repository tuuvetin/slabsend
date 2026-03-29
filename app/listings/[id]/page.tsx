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

  if (loading) return <p className="listing-loading">Loading...</p>
  if (!listing) return <p className="listing-loading">Listing not found.</p>

  const isRental = listing.listing_type === 'rent'
  const images: string[] = listing.images || []

  return (
    <div className="listing-detail-page">

      {/* LIGHTBOX */}
      {lightboxIndex !== null && images.length > 0 && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {/* Prev */}
          {images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prevImage() }}
              style={{
                position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(240,234,216,0.15)', border: '1px solid rgba(240,234,216,0.3)',
                color: '#f0ead8', width: '44px', height: '44px', borderRadius: '50%',
                fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >‹</button>
          )}

          {/* Image */}
          <img
            src={images[lightboxIndex]}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw', maxHeight: '88vh',
              objectFit: 'contain', borderRadius: '8px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)'
            }}
            alt=""
          />

          {/* Next */}
          {images.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); nextImage() }}
              style={{
                position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                background: 'rgba(240,234,216,0.15)', border: '1px solid rgba(240,234,216,0.3)',
                color: '#f0ead8', width: '44px', height: '44px', borderRadius: '50%',
                fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >›</button>
          )}

          {/* Close */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute', top: '16px', right: '20px',
              background: 'transparent', border: 'none',
              color: '#f0ead8', fontSize: '28px', cursor: 'pointer', lineHeight: 1
            }}
          >×</button>

          {/* Counter */}
          {images.length > 1 && (
            <p style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              color: 'rgba(240,234,216,0.6)', fontFamily: 'Barlow Condensed', fontSize: '13px',
              letterSpacing: '0.12em', margin: 0
            }}>
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
                <img
                  key={i}
                  src={url}
                  alt={listing.title}
                  className={`listing-image ${i === 0 ? 'listing-image-main' : ''}`}
                  onClick={() => setLightboxIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          ) : (
            <div className="listing-no-image">No photos</div>
          )}
        </div>

        <div className="listing-detail-info">
          {isRental && <span className="listing-rental-badge">For rent</span>}
          <h1 className="listing-detail-title">{listing.title}</h1>
          <p className="listing-detail-price">
            {listing.price} €{isRental ? '/day' : ''}
          </p>
          <div className="listing-detail-meta">
            {listing.location && <span className="listing-meta-item">📍 {listing.location}</span>}
            {listing.category && (
              <span className="listing-meta-item">
                {listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}
              </span>
            )}
            {listing.condition && (
              <span className="listing-meta-item listing-meta-cond">
                {conditionLabels[listing.condition] || listing.condition}
              </span>
            )}
          </div>
          {listing.description && <p className="listing-detail-desc">{listing.description}</p>}

          {currentUser && currentUser.id !== listing.user_id && (
            <div className="listing-contact">
              <h3 className="listing-contact-title">{isRental ? 'Ask about rental' : 'Contact seller'}</h3>
              <textarea className="form-input form-textarea" placeholder="Write a message..." value={message} onChange={e => setMessage(e.target.value)} />
              <button className="form-submit" onClick={handleSendMessage}>Send message</button>
              {messageSent && <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`}>{messageSent}</p>}
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