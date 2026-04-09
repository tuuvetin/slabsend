import { createClient } from '@/utils/supabase/server'
import PriceTooltipIcon from '@/app/components/PriceTooltipIcon'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

function StarDisplay({ rating, size = 16 }: { rating: number, size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} style={{ fontSize: `${size}px`, color: s <= Math.round(rating) ? '#FC7038' : '#d0c8b8', lineHeight: 1 }}>★</span>
      ))}
    </span>
  )
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: profile }, { data: listings }, { data: reviewsData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', id).single(),
    supabase.from('listings').select('*').eq('user_id', id).order('created_at', { ascending: false }),
    supabase.from('reviews').select('*').eq('seller_id', id).order('created_at', { ascending: false }),
  ])

  const reviews = reviewsData || []
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : null

  // Fetch reviewer profiles
  let reviewerProfiles: Record<string, any> = {}
  if (reviews.length > 0) {
    const reviewerIds = [...new Set(reviews.map((r: any) => r.reviewer_id))]
    const { data: rProfiles } = await supabase
      .from('profiles')
      .select('user_id, username, full_name, avatar_url')
      .in('user_id', reviewerIds)
    ;(rProfiles || []).forEach((p: any) => { reviewerProfiles[p.user_id] = p })
  }

  const displayName = profile?.username || profile?.full_name || 'Seller'

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '0 0 60px' }}>

      {/* HERO BANNER */}
      {profile?.hero_url ? (
        <div style={{ width: '100%', height: '220px', position: 'relative', overflow: 'hidden', borderRadius: '0 0 12px 12px', marginBottom: '24px' }}>
          <img src={profile.hero_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100px', background: 'linear-gradient(135deg, #3a5460 0%, #1a1408 100%)', borderRadius: '0 0 12px 12px', marginBottom: '24px' }} />
      )}

      {/* PROFILE HEADER */}
      <div style={{ padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(26,20,8,0.1)' }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={displayName} style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #F5F3E6', flexShrink: 0, marginTop: profile?.hero_url ? '-36px' : 0, background: '#F5F3E6' }} />
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', fontWeight: 700, color: '#F5F3E6', fontFamily: 'Barlow Condensed', border: '3px solid #F5F3E6', flexShrink: 0, marginTop: profile?.hero_url ? '-36px' : 0 }}>
              {displayName[0].toUpperCase()}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '26px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408', margin: '0 0 4px' }}>
              {displayName}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {(profile?.location || profile?.country) && (
                <span style={{ fontSize: '13px', color: '#7a7060' }}>
                  📍 {[profile.location, profile.country].filter(Boolean).join(', ')}
                </span>
              )}
              <span style={{ fontSize: '13px', color: '#9a9080' }}>
                {listings?.length || 0} listing{listings?.length !== 1 ? 's' : ''}
              </span>
              {avgRating !== null && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <StarDisplay rating={avgRating} size={14} />
                  <span style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', color: '#7a7060', fontWeight: 600 }}>
                    {avgRating.toFixed(1)} ({reviews.length})
                  </span>
                </span>
              )}
            </div>
            {profile?.bio && (
              <p style={{ fontSize: '14px', color: '#3a3428', lineHeight: 1.6, marginTop: '10px', marginBottom: 0 }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* LISTINGS */}
        <h2 style={{ fontFamily: 'Barlow Condensed', fontSize: '16px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '14px' }}>
          Listings
        </h2>

        {(!listings || listings.length === 0) && (
          <p style={{ fontSize: '14px', color: '#9a9080', marginBottom: '32px' }}>No listings yet.</p>
        )}
        <div className="listings-grid" style={{ marginBottom: '40px' }}>
          {(listings || []).map((listing: any) => (
            <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card-link">
              <div className="listing-card">
                {listing.images && listing.images.length > 0 ? (
                  <img src={listing.images[0]} alt={listing.title} className="listing-card-img" />
                ) : (
                  <div className="listing-card-no-img">No image</div>
                )}
                <div className="listing-card-body">
                  <h3 className="listing-card-title">{listing.title}</h3>
                  {listing.category && (
                    <p className="listing-card-cat">
                      {listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}
                    </p>
                  )}
                  <p className="listing-card-price">
                    {listing.price} €{listing.listing_type === 'rent' && listing.rental_period ? `/${listing.rental_period}` : ''}
                  </p>
                  {listing.listing_type !== 'rent' && (
                    <p className="listing-card-price-total">
                      {(listing.price * 1.08).toFixed(2)} € incl. <PriceTooltipIcon />
                    </p>
                  )}
                  <p className="listing-card-meta">
                    {listing.condition && <span className="listing-card-cond">{conditionLabels[listing.condition] || listing.condition}</span>}
                    {listing.location && <span className="listing-card-loc">{listing.location}</span>}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* REVIEWS */}
        {reviews.length > 0 && (
          <>
            <div style={{ borderTop: '1px solid rgba(26,20,8,0.1)', paddingTop: '32px', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'Barlow Condensed', fontSize: '16px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', margin: 0 }}>
                  Reviews
                </h2>
                {avgRating !== null && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <StarDisplay rating={avgRating} size={16} />
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, color: '#1a1408' }}>
                      {avgRating.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '13px', color: '#9a9080' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviews.map((review: any) => {
                  const rp = reviewerProfiles[review.reviewer_id]
                  const rName = rp?.username || rp?.full_name || 'Anonymous'
                  return (
                    <div key={review.id} style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.08)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        {rp?.avatar_url ? (
                          <img src={rp.avatar_url} alt={rName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#c8a84a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#F5F3E6', fontFamily: 'Barlow Condensed', flexShrink: 0 }}>
                            {rName[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1a1408', margin: 0 }}>{rName}</p>
                          <p style={{ fontSize: '11px', color: '#9a9080', margin: '1px 0 0' }}>
                            {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <StarDisplay rating={review.rating} size={15} />
                        </div>
                      </div>
                      {review.comment && (
                        <p style={{ fontSize: '13px', color: '#3a3428', margin: 0, lineHeight: 1.6 }}>{review.comment}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
