import { createClient } from '@/utils/supabase/server'

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', id)
    .single()

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  const displayName = profile?.username || profile?.full_name || 'Seller'

  return (
    <div className="listings-page">
      {/* MYYJÄN PROFIILI */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(26,20,8,0.1)' }}>
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={displayName} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(26,20,8,0.1)' }} />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FC7038', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#F5F3E6', fontFamily: 'Barlow Condensed' }}>
            {displayName[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 style={{ fontFamily: 'Barlow Condensed', fontSize: '28px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408', margin: 0 }}>
            {displayName}
          </h1>
          {profile?.location && (
            <p style={{ fontSize: '13px', color: '#7a7060', margin: '4px 0 0' }}>📍 {profile.location}</p>
          )}
          <p style={{ fontSize: '13px', color: '#9a9080', margin: '4px 0 0' }}>
            {listings?.length || 0} listing{listings?.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ILMOITUKSET */}
      {(!listings || listings.length === 0) && (
        <p className="listings-empty">No listings yet.</p>
      )}
      <div className="listings-grid">
        {(listings || []).map(listing => (
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
                <p className="listing-card-meta">
                  {listing.condition && (
                    <span className="listing-card-cond">
                      {conditionLabels[listing.condition] || listing.condition}
                    </span>
                  )}
                  {listing.location && <span className="listing-card-loc">{listing.location}</span>}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}