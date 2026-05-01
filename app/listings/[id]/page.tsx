'use client'
import RentalCalendar from '@/app/components/RentalCalendar'
import FavoriteButton from '@/app/components/FavoriteButton'
import ReviewForm from '@/app/components/ReviewForm'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

const ADMINS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

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
  const [showMessage, setShowMessage] = useState(false)
  const [buyLoading, setBuyLoading] = useState(false)
  const [offerLoading, setOfferLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const [buyerOrderId, setBuyerOrderId] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [togglingSOLD, setTogglingSOLD] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [justPublished, setJustPublished] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
      if (user) setIsAdmin(ADMINS.includes(user.email || ''))

      // localStorage tarkistetaan vain kirjautuneelle käyttäjälle
      if (user) {
        const cached = localStorage.getItem(`order_${params.id}`)
        if (cached) {
          const parsedOrder = JSON.parse(cached)
          if (parsedOrder.status === 'paid') { setOrder(parsedOrder); setBuyerOrderId(parsedOrder.id) }
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
        if (urlParams.get('published') === 'true') {
          setJustPublished(true)
          window.history.replaceState({}, '', window.location.pathname)
        }
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
            setBuyerOrderId(orderData.id)
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
    const isAdmin = ADMINS.includes(currentUser.email || '')
    const deleteQuery = supabase.from('listings').delete().eq('id', listing.id)
    const { error } = isAdmin ? await deleteQuery : await deleteQuery.eq('user_id', currentUser.id)
    if (error) { alert('Error deleting listing: ' + error.message); setDeleting(false); return }
    window.location.href = '/listings'
  }

  const handleSendMessage = async () => {
    if (!currentUser) { window.location.href = `/login?returnTo=/listings/${listing.id}`; return }
    if (!message.trim()) return
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id, receiver_id: listing.user_id,
      listing_id: listing.id, content: message
    })
    if (error) setMessageSent('Error: ' + error.message)
    else { setMessageSent('Message sent!'); setMessage('') }
  }

  const handleBuyNow = async () => {
    if (!currentUser) { window.location.href = `/login?returnTo=/listings/${listing.id}`; return }
    proceedToCheckout()
  }

  const proceedToCheckout = async () => {
    setBuyLoading(true)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listingId: listing.id,
        amount: listing.price,
      }),
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
    if (!currentUser) { window.location.href = `/login?returnTo=/listings/${listing.id}`; return }
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
      window.location.href = `/messages/${listing.id}/${listing.user_id}`
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

  const handleToggleSold = async () => {
    if (!listing) return
    setTogglingSOLD(true)
    const { error } = await supabase.from('listings').update({ sold: !listing.sold }).eq('id', listing.id)
    if (!error) setListing({ ...listing, sold: !listing.sold })
    setTogglingSOLD(false)
  }

  if (loading) return <p className="listing-loading">Loading...</p>
  if (!listing) return <p className="listing-loading">Listing not found.</p>

  const isRental = listing.listing_type === 'rent'
  const isService = listing.listing_type === 'service'
  const images: string[] = listing.images || []
  const sellerName = sellerProfile?.username || sellerProfile?.full_name || ''

  // Parse service items — supports both old string[] and new {name,price}[] format
  function parseServiceItems(raw: string | null): { name: string; price: number }[] {
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return []
        if (typeof parsed[0] === 'string') return parsed.map((n: string) => ({ name: n, price: 0 }))
        return parsed
      }
    } catch {}
    return []
  }
  const serviceItems = isService ? parseServiceItems(listing.category) : []

  const serviceTotal = serviceItems.filter(i => selectedServices.includes(i.name)).reduce((s, i) => s + i.price, 0)
  const hasServiceSelection = selectedServices.length > 0

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
            <p style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(240,234,216,0.6)', fontSize: '13px', letterSpacing: '0.12em', margin: 0 }}>
              {lightboxIndex + 1} / {images.length}
            </p>
          )}
        </div>
      )}

      <a href="/listings" className="listing-back">← Back to listings</a>

      {justPublished && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: '#e6f4ea', border: '1px solid #a8d5b0', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '16px' }}>🎉</span>
          <p style={{ fontSize: '14px', color: '#1a4a2a', margin: 0 }}>
            Your listing is live!
          </p>
        </div>
      )}

      <div className="listing-detail-grid">

        {/* ── LEFT: IMAGES ── */}
        <div className="listing-detail-images">
          {images.length > 0 ? (
            <>
              {/* Main image */}
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#e8e4d8', cursor: 'pointer' }} onClick={() => setLightboxIndex(0)}>
                <img
                  src={images[lightboxIndex ?? 0] ?? images[0]}
                  alt={listing.title}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                />
                <FavoriteButton listingId={listing.id} />
                {images.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); setLightboxIndex(0) }}
                    style={{ position: 'absolute', bottom: '12px', right: '12px', background: 'rgba(26,20,8,0.55)', color: '#F5F3E6', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', padding: '6px 12px', cursor: 'pointer' }}
                  >
                    View all photos ({images.length})
                  </button>
                )}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      onClick={() => setLightboxIndex(i)}
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: (lightboxIndex ?? 0) === i ? '2px solid #FC7038' : '2px solid transparent', opacity: (lightboxIndex ?? 0) === i ? 1 : 0.7, transition: 'all 0.15s' }}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ width: '100%', aspectRatio: '4/3', background: '#e8e4d8', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9a9080', fontSize: '14px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>No photos</div>
          )}

          {/* Review form */}
          {buyerOrderId && currentUser && listing && (
            <div style={{ marginTop: '24px' }}>
              <ReviewForm orderId={buyerOrderId} sellerId={listing.user_id} />
            </div>
          )}
        </div>

        {/* ── RIGHT: INFO PANEL ── */}
        <div className="listing-detail-info">
          {/* Single Vinted-style card */}
          <div style={{ border: '1px solid rgba(26,20,8,0.12)', borderRadius: '16px', background: '#F5F3E6', overflow: 'hidden' }}>

          {/* ── CARD TOP: title, seller, price ── */}
          <div style={{ padding: '24px 24px 20px' }}>

          {/* Title + status badges */}
          {(isRental || isService || listing.sold) && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {isRental && <span className="listing-rental-badge">For rent</span>}
              {isService && <span className="listing-rental-badge" style={{ background: '#1a1408', color: '#FC7038' }}>Service</span>}
              {listing.sold && <span className="listing-rental-badge" style={{ background: '#aa2200', color: '#fff' }}>Sold</span>}
            </div>
          )}
          <h1 className="listing-detail-title" style={{ marginBottom: '16px' }}>{listing.title}</h1>

          {/* Price block — sell/rent */}
          {!isService && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#9a9080' }}>{listing.price}{isRental ? '/day' : ''} €</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1408' }}>
                  {(listing.price * 1.08).toFixed(2)}{isRental ? '/day' : ''} €
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ position: 'relative' }} className="info-tooltip-wrap">
                  <span style={{ fontSize: '13px', color: '#2a6a2a', cursor: 'default', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    🛡️ Includes buyer protection
                    <button className="info-btn" style={{ fontSize: '10px', width: '15px', height: '15px' }}>i</button>
                  </span>
                  <div className="info-tooltip">
                    Your purchase is protected. The seller receives payment only after you confirm the item is as described. If something goes wrong, contact info@slabsend.com within 48h.
                  </div>
                </div>
                {!isRental && listing.shipping_enabled !== false && (
                  <span style={{ fontSize: '13px', color: '#7a7060', display: 'inline-flex', alignItems: 'center', gap: '5px', paddingLeft: '20px' }}>Shipping from €8.90</span>
                )}
              </div>
            </div>
          )}
          {isRental && (listing.weekly_discount_pct > 0 || listing.monthly_discount_pct > 0) && (
            <div style={{ fontSize: '12px', color: '#2a6a2a', marginTop: '8px', background: '#f0f7f0', borderRadius: '6px', padding: '6px 10px', display: 'inline-block' }}>
              {listing.weekly_discount_pct > 0 && <span>7+ days: <strong>{listing.weekly_discount_pct}%</strong> off</span>}
              {listing.weekly_discount_pct > 0 && listing.monthly_discount_pct > 0 && <span> · </span>}
              {listing.monthly_discount_pct > 0 && <span>30+ days: <strong>{listing.monthly_discount_pct}%</strong> off</span>}
            </div>
          )}
          </div>{/* end card top padding */}

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />

          {/* ── SELLER ── */}
          {sellerProfile && (
            <div style={{ padding: '16px 24px' }}>
              <a
                href={`/sellers/${listing.user_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '10px 12px', borderRadius: '12px', background: 'rgba(26,20,8,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(26,20,8,0.10)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(26,20,8,0.05)')}
              >
                {sellerProfile.avatar_url ? (
                  <img src={sellerProfile.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d0c8b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#7a7060', flexShrink: 0 }}>
                    {(sellerName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408' }}>{sellerName}</div>
                  <div style={{ fontSize: '11px', color: '#9a9080' }}>View profile →</div>
                </div>
              </a>
            </div>
          )}

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />

          {/* ── ATTRIBUTES ── */}
          {!isService && (listing.condition || listing.location || (isAdmin || (currentUser && currentUser.id === listing.user_id))) && (
            <div style={{ padding: '4px 24px 8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {listing.condition && (
                    <tr style={{ borderBottom: '1px solid rgba(26,20,8,0.07)' }}>
                      <td style={{ padding: '10px 0', fontSize: '13px', color: '#9a9080', width: '42%' }}>Condition</td>
                      <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: 600, color: '#1a1408' }}>{conditionLabels[listing.condition] || listing.condition}</td>
                    </tr>
                  )}
                  {listing.location && (
                    <tr style={{ borderBottom: listing.weight_kg && (isAdmin || (currentUser && currentUser.id === listing.user_id)) ? '1px solid rgba(26,20,8,0.07)' : 'none' }}>
                      <td style={{ padding: '10px 0', fontSize: '13px', color: '#9a9080' }}>Location</td>
                      <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: 600, color: '#1a1408' }}>{listing.location}</td>
                    </tr>
                  )}
                  {listing.weight_kg && currentUser && (currentUser.id === listing.user_id || isAdmin) && (
                    <tr>
                      <td style={{ padding: '10px 0', fontSize: '13px', color: '#9a9080' }}>Weight</td>
                      <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: 600, color: '#1a1408' }}>{listing.weight_kg} kg</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Rental pickup info */}
          {isRental && (listing.pickup_location || listing.pickup_hours_from) && (
            <div style={{ padding: '0 24px 16px', fontSize: '13px', color: '#3a3020', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {listing.pickup_location && <span>Pickup: <strong>{listing.pickup_location}</strong></span>}
              {listing.pickup_hours_from && listing.pickup_hours_to && <span>Hours: <strong>{listing.pickup_hours_from} – {listing.pickup_hours_to}</strong></span>}
            </div>
          )}

          {/* ── DESCRIPTION ── */}
          {listing.description && (
            <>
              <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#3a3020', margin: 0 }}>{listing.description}</p>
              </div>
            </>
          )}

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />

          {/* SERVICE items */}
          {isService && serviceItems.length > 0 && (
            <div style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>Select services</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {serviceItems.map(item => {
                  const checked = selectedServices.includes(item.name)
                  return (
                    <label key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => setSelectedServices(prev => prev.includes(item.name) ? prev.filter(s => s !== item.name) : [...prev, item.name])}
                        style={{ width: '18px', height: '18px', accentColor: '#FC7038', flexShrink: 0 }}
                      />
                      <span style={{ flex: 1, fontSize: '14px', color: '#1a1408' }}>{item.name}</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: item.price > 0 ? '#1a1408' : '#9a9080' }}>
                        {item.price > 0 ? `${item.price} €` : '—'}
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── DIVIDER ── */}
          <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />

          {/* ── ACTIONS SECTION ── */}
          <div style={{ padding: '20px 24px' }}>

            {/* Payment confirmed banner */}
            {order && !confirmDone && (
              <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '6px' }}>Payment confirmed</p>
                <p style={{ fontSize: '13px', color: '#3a3428', lineHeight: 1.5, marginBottom: '12px' }}>
                  Confirm receipt once you have the item. The seller is paid after your confirmation or automatically after 48h.
                </p>
                <button className="form-submit" onClick={handleConfirmReceipt} disabled={confirmLoading} style={{ background: '#2a6a2a', width: '100%', marginBottom: '6px' }}>
                  {confirmLoading ? 'Confirming...' : 'Item received'}
                </button>
                <p style={{ fontSize: '11px', color: '#7a7060', textAlign: 'center', margin: 0 }}>
                  Problem? <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a> within 48h
                </p>
              </div>
            )}
            {confirmDone && (
              <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a6a2a', marginBottom: '4px' }}>Receipt confirmed — thank you!</p>
                <p style={{ fontSize: '13px', color: '#3a3428', margin: 0 }}>The seller will receive their payment shortly.</p>
              </div>
            )}

            {/* Buy now + offer + ask seller — buyer only, pre-purchase */}
            {!listing.sold && !order && currentUser && currentUser.id !== listing.user_id && (
              <>
                {/* Buy now — sell */}
                {!isRental && !isService && (
                  <button className="form-submit" onClick={handleBuyNow} disabled={buyLoading} style={{ width: '100%', marginBottom: '10px' }}>
                    {buyLoading ? 'Loading...' : 'Buy now'}
                  </button>
                )}

                {/* Buy now — service */}
                {isService && serviceItems.length > 0 && (
                  <button
                    className="form-submit"
                    disabled={buyLoading || !hasServiceSelection || serviceTotal === 0}
                    onClick={() => {
                      if (!hasServiceSelection || serviceTotal === 0) return
                      setBuyLoading(true)
                      fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ listingId: listing.id, amount: serviceTotal }) })
                        .then(r => r.json()).then(d => { if (d.url) window.location.href = d.url; else { alert(d.error || 'Payment error'); setBuyLoading(false) } })
                    }}
                    style={{ width: '100%', marginBottom: '10px', opacity: (!hasServiceSelection || serviceTotal === 0) ? 0.45 : 1 }}
                  >
                    {buyLoading ? 'Loading...' : hasServiceSelection && serviceTotal > 0 ? `Buy now — ${(serviceTotal * 1.08).toFixed(2)} €` : 'Select services above'}
                  </button>
                )}

                {/* Make an offer */}
                {!isRental && !isService && (
                  <button onClick={() => setShowOffer(!showOffer)} style={{ width: '100%', marginBottom: '10px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', color: '#FC7038', border: '1.5px solid #FC7038', borderRadius: '8px', padding: '13px', transition: 'all 0.15s' }}>
                    Make an offer
                  </button>
                )}

                {showOffer && (
                  <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '8px', padding: '16px', marginBottom: '10px' }}>
                    <p style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '10px' }}>
                      Your offer (asking price: {listing.price} €)
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input className="form-input" type="number" placeholder={`Max ${listing.price} €`} value={offerAmount} onChange={e => setOfferAmount(e.target.value)} style={{ marginBottom: 0 }} />
                      <button className="form-submit" onClick={handleSendOffer} disabled={offerLoading} style={{ width: 'auto', padding: '0 20px', whiteSpace: 'nowrap' }}>
                        {offerLoading ? 'Sending...' : 'Send offer'}
                      </button>
                    </div>
                    {offerAmount && !isNaN(Number(offerAmount)) && Number(offerAmount) > 0 && (
                      <div style={{ background: '#fff', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.08)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '4px' }}><span>Your offer</span><span>{Number(offerAmount).toFixed(2)} €</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '4px' }}><span>Buyer protection</span><span>{(Number(offerAmount) * 0.08).toFixed(2)} €</span></div>
                        <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#1a1408' }}><span>Total you pay</span><span>{(Number(offerAmount) * 1.08).toFixed(2)} €</span></div>
                      </div>
                    )}
                  </div>
                )}

                {/* Ask seller toggle */}
                {!showMessage ? (
                  <button onClick={() => setShowMessage(true)} style={{ width: '100%', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', color: '#1a1408', border: '1.5px solid rgba(26,20,8,0.2)', borderRadius: '8px', padding: '13px', transition: 'all 0.15s' }}>
                    Ask seller
                  </button>
                ) : (
                  <div>
                    {messageSent && <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`} style={{ marginBottom: '8px' }}>{messageSent}</p>}
                    <textarea className="form-input form-textarea" placeholder={isRental ? 'Ask about rental...' : 'Ask the seller a question...'} value={message} onChange={e => setMessage(e.target.value)} style={{ marginBottom: '8px' }} autoFocus />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="form-submit" onClick={handleSendMessage} style={{ flex: 1, background: 'transparent', color: '#1a1408', border: '1.5px solid rgba(26,20,8,0.2)' }}>
                        Send message
                      </button>
                      <button onClick={() => { setShowMessage(false); setMessage('') }} style={{ padding: '0 16px', fontSize: '13px', fontWeight: 700, background: 'transparent', color: '#9a9080', border: '1px solid rgba(26,20,8,0.12)', borderRadius: '8px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Message after purchase */}
            {order && currentUser && currentUser.id !== listing.user_id && (
              <div>
                {messageSent && <p className={`form-message ${messageSent.startsWith('Error') ? 'error' : 'success'}`} style={{ marginBottom: '8px' }}>{messageSent}</p>}
                <textarea className="form-input form-textarea" placeholder="Write a message to the seller..." value={message} onChange={e => setMessage(e.target.value)} style={{ marginBottom: '8px' }} />
                <button className="form-submit" onClick={handleSendMessage} style={{ width: '100%', background: 'transparent', color: '#1a1408', border: '1.5px solid rgba(26,20,8,0.2)' }}>
                  Send message
                </button>
              </div>
            )}

            {/* Not logged in */}
            {!currentUser && !listing.sold && (
              <a href="/login" className="form-submit" style={{ display: 'block', textAlign: 'center' }}>Sign in to buy or contact seller</a>
            )}


          </div>{/* end actions padding */}
          </div>{/* end card */}

          {/* Rental calendar — visible to both owner (toggle availability) and renters */}
          {isRental && currentUser && (
            <RentalCalendar
              listingId={listing.id}
              pricePerDay={listing.price}
              rentalPeriod={listing.rental_period || 'day'}
              isOwner={currentUser.id === listing.user_id}
              currentUserId={currentUser.id}
              weeklyDiscountPct={listing.weekly_discount_pct || 0}
              monthlyDiscountPct={listing.monthly_discount_pct || 0}
              pickupHoursFrom={listing.pickup_hours_from || '09:00'}
              pickupHoursTo={listing.pickup_hours_to || '20:00'}
            />
          )}

          {/* Owner / Admin actions */}
          {currentUser && (currentUser.id === listing.user_id || isAdmin) && (
            <div className="listing-owner-actions">
              {isAdmin && (
                <div style={{ background: '#1a1408', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#FC7038' }}>Admin</span>
                  <button onClick={handleToggleSold} disabled={togglingSOLD} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', background: listing.sold ? '#2a6a2a' : '#aa2200', color: '#F5F3E6', border: 'none', borderRadius: '6px', padding: '6px 16px' }}>
                    {togglingSOLD ? '...' : listing.sold ? 'Mark as available' : 'Mark as sold'}
                  </button>
                </div>
              )}
              <button className="listing-edit-btn" onClick={() => window.location.href = `/listings/${listing.id}/edit`}>Edit listing</button>
              <button className="listing-delete-btn" onClick={handleDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete listing'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}