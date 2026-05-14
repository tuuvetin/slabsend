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
  const [activeImage, setActiveImage] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
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
  // Address prompt for first-time sellers
  const [addrStreet, setAddrStreet] = useState('')
  const [addrPostcode, setAddrPostcode] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrPhone, setAddrPhone] = useState('')
  const [addrSaving, setAddrSaving] = useState(false)
  const [addrSaved, setAddrSaved] = useState(false)
  const [rentalBooking, setRentalBooking] = useState<any>(null)
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

      if (!data) {
        window.location.href = '/listings'
        return
      }

      // Rental listings are always accessible — only calendar dates get blocked
      // For sold sell/service listings: only buyer, seller or admin can view
      if (data.sold && data.listing_type !== 'rent') {
        const isAdmin = user && ADMINS.includes(user.email || '')
        const isSellerOfThis = user && data.user_id === user.id
        if (!isAdmin && !isSellerOfThis) {
          const { data: orderData } = user
            ? await supabase.from('orders').select('buyer_id').eq('listing_id', data.id).single()
            : { data: null }
          const isBuyerOfThis = orderData?.buyer_id === user?.id
          if (!isBuyerOfThis) {
            window.location.href = '/listings'
            return
          }
        }
      }

      // Load confirmed rental booking for current user (for rentals already booked)
      if (data.listing_type === 'rent' && user) {
        const { data: rb } = await supabase
          .from('rental_bookings')
          .select('*')
          .eq('listing_id', data.id)
          .eq('renter_id', user.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (rb) setRentalBooking(rb)
      }

      setListing(data)
      setLoading(false)

      if (data?.user_id) {
        supabase.from('profiles').select('username, full_name, avatar_url, location, address_street, address_postcode, address_city, phone').eq('user_id', data.user_id).single().then(({ data: p }) => setSellerProfile(p))
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
            // Load rental booking details if this is a rental
            if (data.listing_type === 'rent') {
              const { data: rb } = await supabase
                .from('rental_bookings')
                .select('*')
                .eq('listing_id', data.id)
                .eq('renter_id', user.id)
                .eq('status', 'confirmed')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (rb) setRentalBooking(rb)
            }
          }
        }
      }
    }

    init()
  }, [params.id])

  const prevImage = useCallback(() => {
    if (!listing?.images) return
    setActiveImage(i => i === 0 ? listing.images.length - 1 : i - 1)
  }, [listing])
  const nextImage = useCallback(() => {
    if (!listing?.images) return
    setActiveImage(i => i === listing.images.length - 1 ? 0 : i + 1)
  }, [listing])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage()
      else if (e.key === 'ArrowRight') nextImage()
      else if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevImage, nextImage])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    setDeleting(true)
    if (isAdmin) {
      // Admin: use server-side API route that bypasses RLS
      const res = await fetch('/api/admin/delete-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, imageUrls: listing.images || [] }),
      })
      const data = await res.json()
      if (!res.ok) { alert('Error deleting listing: ' + data.error); setDeleting(false); return }
    } else {
      if (listing.images && listing.images.length > 0) {
        const paths = listing.images.map((url: string) => {
          const parts = url.split('/listing-images/')
          return parts[1] || ''
        }).filter(Boolean)
        if (paths.length > 0) await supabase.storage.from('listing-images').remove(paths)
      }
      const { error } = await supabase.from('listings').delete().eq('id', listing.id).eq('user_id', currentUser.id)
      if (error) { alert('Error deleting listing: ' + error.message); setDeleting(false); return }
    }
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

  const handleSaveAddress = async () => {
    if (!addrStreet.trim() || !addrPostcode.trim() || !addrCity.trim()) return
    setAddrSaving(true)
    await supabase.from('profiles').upsert(
      { user_id: currentUser.id, address_street: addrStreet.trim(), address_postcode: addrPostcode.trim(), address_city: addrCity.trim(), ...(addrPhone.trim() ? { phone: addrPhone.trim() } : {}) },
      { onConflict: 'user_id' }
    )
    setAddrSaving(false)
    setAddrSaved(true)
    setSellerProfile((prev: any) => ({ ...prev, address_street: addrStreet.trim() }))
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
              {/* Lightbox */}
              {lightboxOpen && (
                <div onClick={() => setLightboxOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {images.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); prevImage() }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(245,243,230,0.15)', border: '1px solid rgba(245,243,230,0.25)', color: '#F5F3E6', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  )}
                  <img src={images[activeImage]} onClick={e => e.stopPropagation()} style={{ maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '6px' }} alt="" />
                  {images.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); nextImage() }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(245,243,230,0.15)', border: '1px solid rgba(245,243,230,0.25)', color: '#F5F3E6', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  )}
                  <button onClick={() => setLightboxOpen(false)} style={{ position: 'absolute', top: '16px', right: '20px', background: 'transparent', border: 'none', color: '#F5F3E6', fontSize: '28px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  {images.length > 1 && (
                    <p style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(245,243,230,0.55)', fontSize: '13px', letterSpacing: '0.1em', margin: 0 }}>{activeImage + 1} / {images.length}</p>
                  )}
                </div>
              )}

              {/* Main swiper */}
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
                <img
                  src={images[activeImage]}
                  alt={listing.title}
                  onClick={() => setLightboxOpen(true)}
                  style={{ width: '100%', height: '480px', display: 'block', cursor: 'zoom-in', objectFit: 'cover', objectPosition: 'center' }}
                />
                <FavoriteButton listingId={listing.id} />
                {images.length > 1 && (<>
                  <button onClick={prevImage} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(26,20,8,0.45)', border: 'none', color: '#F5F3E6', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                  <button onClick={nextImage} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(26,20,8,0.45)', border: 'none', color: '#F5F3E6', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                  <p style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(26,20,8,0.45)', color: '#F5F3E6', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', padding: '3px 10px', borderRadius: '20px', margin: 0 }}>
                    {activeImage + 1} / {images.length}
                  </p>
                </>)}
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                  {images.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      onClick={() => setActiveImage(i)}
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: activeImage === i ? '2px solid #FC7038' : '2px solid transparent', opacity: activeImage === i ? 1 : 0.6, transition: 'all 0.15s' }}
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
          {(isRental || isService || (listing.sold && !isRental)) && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {isRental && <span className="listing-rental-badge">For rent</span>}
              {isService && <span className="listing-rental-badge" style={{ background: '#1a1408', color: '#FC7038' }}>Service</span>}
              {listing.sold && !isRental && <span className="listing-rental-badge" style={{ background: '#aa2200', color: '#fff' }}>Sold</span>}
            </div>
          )}
          <h1 className="listing-detail-title" style={{ marginBottom: '16px' }}>{listing.title}</h1>

          {/* Price block — sell/rent */}
          {!isService && (
            <div style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', color: '#9a9080' }}>{listing.price}{isRental ? '/day' : ''} €</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#1a1408' }}>
                  {(listing.price * 1.10).toFixed(2)}{isRental ? '/day' : ''} €
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
                  <span style={{ fontSize: '13px', color: '#7a7060', display: 'inline-flex', alignItems: 'center', gap: '5px', paddingLeft: '20px' }}>Shipping from 8.90 €</span>
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

          {/* Rental pickup info + deposit */}
          {isRental && (listing.pickup_location || listing.pickup_hours_from || listing.security_deposit) && (
            <div style={{ padding: '0 24px 16px', fontSize: '13px', color: '#3a3020', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {listing.pickup_location && <span>Pickup: <strong>{listing.pickup_location}</strong></span>}
              {listing.pickup_hours_from && listing.pickup_hours_to && <span>Hours: <strong>{listing.pickup_hours_from} – {listing.pickup_hours_to}</strong></span>}
              {listing.security_deposit > 0 && (
                <span style={{ marginTop: '2px' }}>
                  Security deposit: <strong>{listing.security_deposit} €</strong>
                  <span style={{ color: '#7a7060', fontSize: '12px' }}> — paid directly at pickup, returned on return</span>
                </span>
              )}
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

            {/* Rental booking confirmation card */}
            {isRental && rentalBooking && (
              <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '16px', marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2a6a2a', marginBottom: '12px' }}>Rental confirmed</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize: '12px', color: '#7a7060', padding: '4px 0', width: '40%' }}>From</td>
                      <td style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408', padding: '4px 0' }}>{rentalBooking.start_date}</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize: '12px', color: '#7a7060', padding: '4px 0' }}>To</td>
                      <td style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408', padding: '4px 0' }}>{rentalBooking.end_date}</td>
                    </tr>
                    {rentalBooking.pickup_time && (
                      <tr>
                        <td style={{ fontSize: '12px', color: '#7a7060', padding: '4px 0' }}>Pickup time</td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408', padding: '4px 0' }}>{rentalBooking.pickup_time}</td>
                      </tr>
                    )}
                    {rentalBooking.return_time && (
                      <tr>
                        <td style={{ fontSize: '12px', color: '#7a7060', padding: '4px 0' }}>Return time</td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408', padding: '4px 0' }}>{rentalBooking.return_time}</td>
                      </tr>
                    )}
                    {listing.pickup_location && (
                      <tr>
                        <td style={{ fontSize: '12px', color: '#7a7060', padding: '4px 0' }}>Pickup location</td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#1a1408', padding: '4px 0' }}>{listing.pickup_location}</td>
                      </tr>
                    )}
                    {listing.security_deposit > 0 && (
                      <tr style={{ borderTop: '1px solid rgba(26,20,8,0.08)', marginTop: '4px' }}>
                        <td style={{ fontSize: '12px', color: '#9a6030', padding: '8px 0 4px', fontWeight: 600 }}>Security deposit</td>
                        <td style={{ fontSize: '13px', fontWeight: 700, color: '#9a6030', padding: '8px 0 4px' }}>{listing.security_deposit} €</td>
                      </tr>
                    )}
                    {listing.security_deposit > 0 && (
                      <tr>
                        <td colSpan={2} style={{ fontSize: '11px', color: '#7a7060', padding: '0 0 6px', lineHeight: 1.5 }}>
                          Pay this directly to the owner at pickup. Returned when the item is returned in good condition.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <a
                  href={`/messages/${listing.id}/${listing.user_id}`}
                  className="form-submit"
                  style={{ display: 'block', textAlign: 'center', background: '#1a1408', marginBottom: '8px' }}
                >
                  Message the owner
                </a>
                <p style={{ fontSize: '11px', color: '#7a7060', textAlign: 'center', margin: 0 }}>
                  Questions? <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a>
                </p>
              </div>
            )}

            {/* Payment confirmed banner — for purchases (not rentals) */}
            {!isRental && order && !confirmDone && (
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
            {!isRental && confirmDone && (
              <div style={{ background: '#F0F7F0', border: '1px solid rgba(42,106,42,0.2)', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#2a6a2a', marginBottom: '4px' }}>Receipt confirmed — thank you!</p>
                <p style={{ fontSize: '13px', color: '#3a3428', margin: 0 }}>The seller will receive their payment shortly.</p>
              </div>
            )}

            {/* Buy now + offer + ask seller — buyer only, pre-purchase */}
            {!listing.sold && !(order && !isRental) && !rentalBooking && currentUser && currentUser.id !== listing.user_id && (
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
                    {buyLoading ? 'Loading...' : hasServiceSelection && serviceTotal > 0 ? `Buy now — ${(serviceTotal * 1.10).toFixed(2)} €` : 'Select services above'}
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#7a7060', marginBottom: '4px' }}><span>Buyer protection</span><span>{(Number(offerAmount) * 0.10).toFixed(2)} €</span></div>
                        <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, color: '#1a1408' }}><span>Total you pay</span><span>{(Number(offerAmount) * 1.10).toFixed(2)} €</span></div>
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

            {/* Message after purchase — for non-rentals only */}
            {!isRental && order && currentUser && currentUser.id !== listing.user_id && (
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
              securityDeposit={listing.security_deposit || 0}
            />
          )}

          {/* Address prompt — first-time seller without address */}
          {currentUser?.id === listing.user_id && sellerProfile && !sellerProfile.address_street && !addrSaved && (
            <>
              <div style={{ height: '1px', background: 'rgba(26,20,8,0.08)' }} />
              <div style={{ padding: '16px 24px' }}>
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '6px' }}>Add your shipping address</p>
                <p style={{ fontSize: '12px', color: '#7a7060', marginBottom: '12px', lineHeight: 1.5 }}>Needed to generate Matkahuolto labels automatically when you sell.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input className="form-input" placeholder="Street address" value={addrStreet} onChange={e => setAddrStreet(e.target.value)} style={{ marginBottom: 0, fontSize: '13px', padding: '9px 12px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input className="form-input" placeholder="Postal code" value={addrPostcode} onChange={e => setAddrPostcode(e.target.value)} style={{ marginBottom: 0, fontSize: '13px', padding: '9px 12px', width: '38%' }} />
                    <input className="form-input" placeholder="City" value={addrCity} onChange={e => setAddrCity(e.target.value)} style={{ marginBottom: 0, fontSize: '13px', padding: '9px 12px', flex: 1 }} />
                  </div>
                  <input className="form-input" placeholder="Phone number" value={addrPhone} onChange={e => setAddrPhone(e.target.value)} style={{ marginBottom: 0, fontSize: '13px', padding: '9px 12px' }} />
                  <button
                    onClick={handleSaveAddress}
                    disabled={addrSaving || !addrStreet.trim() || !addrPostcode.trim() || !addrCity.trim()}
                    style={{ background: '#FC7038', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: (!addrStreet.trim() || !addrPostcode.trim() || !addrCity.trim()) ? 0.45 : 1 }}
                  >
                    {addrSaving ? 'Saving...' : 'Save address'}
                  </button>
                </div>
              </div>
            </>
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