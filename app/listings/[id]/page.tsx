'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New',
  'Erinomainen': 'Excellent',
  'Hyvä': 'Good',
  'Tyydyttävä': 'Fair',
  'Huono': 'Poor',
}

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState('')
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
      setListing(data)
      setLoading(false)
    })
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    setDeleting(true)

    // Poistetaan kuvat storagesta ensin
    if (listing.images && listing.images.length > 0) {
      const paths = listing.images.map((url: string) => {
        const parts = url.split('/listing-images/')
        return parts[1] || ''
      }).filter(Boolean)
      if (paths.length > 0) {
        await supabase.storage.from('listing-images').remove(paths)
      }
    }

    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', listing.id)
      .eq('user_id', currentUser.id)

    if (error) {
      alert('Error deleting listing: ' + error.message)
      setDeleting(false)
      return
    }

    window.location.href = '/listings'
  }

  const handleSendMessage = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (!message.trim()) return
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: listing.user_id,
      listing_id: listing.id,
      content: message
    })
    if (error) setMessageSent('Error: ' + error.message)
    else { setMessageSent('Message sent!'); setMessage('') }
  }

  if (loading) return <p className="listing-loading">Loading...</p>
  if (!listing) return <p className="listing-loading">Listing not found.</p>

  const isRental = listing.listing_type === 'rent'

  return (
    <div className="listing-detail-page">
      <a href="/listings" className="listing-back">← Back to listings</a>

      <div className="listing-detail-grid">

        <div className="listing-detail-images">
          {listing.images && listing.images.length > 0 ? (
            <div className="listing-images-grid">
              {listing.images.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt={listing.title}
                  className={`listing-image ${i === 0 ? 'listing-image-main' : ''}`}
                />
              ))}
            </div>
          ) : (
            <div className="listing-no-image">No photos</div>
          )}
        </div>

        <div className="listing-detail-info">
          {isRental && (
            <span className="listing-rental-badge">For rent</span>
          )}

          <h1 className="listing-detail-title">{listing.title}</h1>

          <p className="listing-detail-price">
            {listing.price} €{isRental ? '/day' : ''}
          </p>

          <div className="listing-detail-meta">
            {listing.location && (
              <span className="listing-meta-item">📍 {listing.location}</span>
            )}
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

          {listing.description && (
            <p className="listing-detail-desc">{listing.description}</p>
          )}

          {currentUser && currentUser.id !== listing.user_id && (
            <div className="listing-contact">
              <h3 className="listing-contact-title">
                {isRental ? 'Ask about rental' : 'Contact seller'}
              </h3>
              <textarea
                className="form-input form-textarea"
                placeholder="Write a message..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
              <button className="form-submit" onClick={handleSendMessage}>
                Send message
              </button>
              {messageSent && (
                <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`}>
                  {messageSent}
                </p>
              )}
            </div>
          )}

          {!currentUser && (
            <div className="listing-contact">
              <a href="/login" className="form-submit" style={{ display: 'block', textAlign: 'center' }}>
                Sign in to contact seller
              </a>
            </div>
          )}

          {currentUser && currentUser.id === listing.user_id && (
            <div className="listing-owner-actions">
              <button
                className="listing-edit-btn"
                onClick={() => window.location.href = `/listings/${listing.id}/edit`}
              >
                Edit listing
              </button>
              <button
                className="listing-delete-btn"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete listing'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}