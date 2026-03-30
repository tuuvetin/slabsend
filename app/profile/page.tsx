'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [stripeOnboarded, setStripeOnboarded] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setUsername(data.username || '')
          setFullName(data.full_name || '')
          setLocation(data.location || '')
          setStripeOnboarded(data.stripe_onboarded || false)
        }
      })

      supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        setListings(data || [])
      })
    })

    // Tarkistetaan Stripe-paluuparametrit
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe') === 'success') {
      setMessage('Stripe connected successfully!')
    } else if (params.get('stripe') === 'refresh') {
      setMessage('Stripe connection was interrupted. Please try again.')
    }
  }, [])

  const handleSave = () => {
    supabase.from('profiles').upsert({
        user_id: user.id,
        username,
        full_name: fullName,
        location
      }).then(({ error }) => {
      if (error) setMessage('Error: ' + error.message)
      else setMessage('Profile saved!')
    })
  }

  const handleConnectStripe = async () => {
    setStripeLoading(true)
    const res = await fetch('/api/stripe/connect', { method: 'POST' })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      setMessage('Error connecting Stripe: ' + data.error)
      setStripeLoading(false)
    }
  }

  if (!user) return <p className="listing-loading">Loading...</p>

  return (
    <div className="profile-page">

      <div className="profile-header">
        <div className="profile-avatar">
          {(fullName || user.email || '?')[0].toUpperCase()}
        </div>
        <div>
          <h1 className="profile-name">{fullName || username || 'Your profile'}</h1>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      <div className="profile-grid">

        {/* SETTINGS */}
        <div className="profile-section">
          <h2 className="profile-section-title">Account settings</h2>
          <input className="form-input" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
          <input className="form-input" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <input className="form-input" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <button className="form-submit" onClick={handleSave}>Save changes</button>
          {message && (
            <p className={`form-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>
          )}

          {/* STRIPE */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Payments</h2>
            {stripeOnboarded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                <span style={{ color: '#2a6a2a', fontSize: '14px' }}>✓ Stripe connected — you can receive payments</span>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: '#7a7060', marginBottom: '12px', lineHeight: '1.5' }}>
                  Connect your Stripe account to receive payments from buyers directly to your bank account.
                </p>
                <button
                  className="form-submit"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                  style={{ background: '#635BFF' }}
                >
                  {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
                </button>
              </div>
            )}
          </div>

          <button
            className="profile-signout-btn"
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
          >
            Sign out
          </button>
        </div>

        {/* MY LISTINGS */}
        <div className="profile-section">
          <h2 className="profile-section-title">My listings</h2>
          {listings.length === 0 && <p className="profile-empty">No listings yet.</p>}
          <div className="profile-listings">
            {listings.map(listing => (
              <a key={listing.id} href={`/listings/${listing.id}`} className="profile-listing-link">
                <div className="profile-listing-card">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} className="profile-listing-img" />
                  ) : (
                    <div className="profile-listing-no-img" />
                  )}
                  <div className="profile-listing-info">
                    <p className="profile-listing-title">{listing.title}</p>
                    <p className="profile-listing-meta">
                      {listing.price} €{listing.listing_type === 'rent' ? '/day' : ''} · {listing.location}
                    </p>
                    {listing.listing_type === 'rent' && (
                      <span className="listing-rental-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>For rent</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}