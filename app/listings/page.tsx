import { createClient } from '@/utils/supabase/server'
import ListingsSearch from '@/app/components/ListingsSearch'
import PriceTooltipIcon from '@/app/components/PriceTooltipIcon'
import FavoriteButton from '@/app/components/FavoriteButton'

export const revalidate = 0

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; category?: string; subcategory?: string; country?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = ADMIN_EMAILS.includes(user?.email || '')

  let query = supabase.from('listings').select('*').order('created_at', { ascending: false })
  if (!isAdmin) query = query.neq('sold', true)

  const { data: listings } = await query

  const userIds = [...new Set((listings || []).map((l: any) => l.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, username, full_name, avatar_url').in('user_id', userIds)
    : { data: [] }

  // Fetch all user favorites in one query
  const favoriteIds = new Set<string>()
  if (user) {
    const { data: favs } = await supabase.from('favorites').select('listing_id').eq('user_id', user.id)
    for (const f of favs || []) favoriteIds.add(String(f.listing_id))
  }

  const profileMap: Record<string, any> = {}
  for (const p of profiles || []) profileMap[p.user_id] = p

  const tab = params.tab || 'sell'
  const search = params.search || ''
  const category = params.category || ''
  const subcategory = params.subcategory || ''
  const country = params.country || ''

  let filtered = (listings || []).filter((l: any) => (l.listing_type || 'sell') === tab)
  if (search) filtered = filtered.filter((l: any) => l.title.toLowerCase().includes(search.toLowerCase()))
  if (category) filtered = filtered.filter((l: any) => l.category === category)
  if (subcategory) filtered = filtered.filter((l: any) => l.subcategory === subcategory)
  if (country) filtered = filtered.filter((l: any) => l.country === country)

  return (
    <div className="listings-page">

      <ListingsSearch tab={tab} search={search} category={category} subcategory={subcategory} country={country} />

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: '32px', marginBottom: '12px' }}>🏔</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1a1408', marginBottom: '8px' }}>
            Nothing here yet
          </p>
          <p style={{ fontSize: '14px', color: '#9a9080', marginBottom: '24px' }}>
            {search
              ? `No results for "${search}" — try a different search term.`
              : category
              ? `No listings in this category yet. Be the first to add one!`
              : 'No listings yet. Be the first to add one!'}
          </p>
          <a
            href="/listings/new"
            style={{ display: 'inline-block', background: '#FC7038', color: '#fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '11px 22px', borderRadius: '8px', textDecoration: 'none' }}
          >
            Add listing
          </a>
        </div>
      )}

      <div className="listings-grid">
        {filtered.map((listing: any) => {
          const profile = profileMap[listing.user_id]
          const displayName = profile?.username || profile?.full_name || ''

          return (
            <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card-link">
              <div className="listing-card" style={listing.sold ? { opacity: 0.6 } : undefined}>
                <div style={{ position: 'relative' }}>
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} className="listing-card-img" />
                  ) : (
                    <div className="listing-card-no-img">No image</div>
                  )}
                  <FavoriteButton listingId={listing.id} initialFavorited={favoriteIds.has(String(listing.id))} />
                  {isAdmin && (
                    <a
                      href={`/listings/${listing.id}/edit`}
                      style={{ position: 'absolute', top: '8px', left: '8px', background: '#1a1408', color: '#FC7038', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: '4px', textDecoration: 'none', zIndex: 2 }}
                    >
                      Edit
                    </a>
                  )}
                </div>
                <div className="listing-card-body">
                  {listing.sold && (
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff', background: '#aa2200', display: 'inline-block', padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>Sold</p>
                  )}
                  {!listing.sold && listing.listing_type === 'rent' && (
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F5F3E6', background: '#5a7a84', display: 'inline-block', padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>Rent</p>
                  )}
                  <h3 className="listing-card-title">{listing.title}</h3>
                  {listing.category && (
                    <p className="listing-card-cat">
                      {listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}
                    </p>
                  )}
                  <p className="listing-card-price">
                    {listing.listing_type === 'service'
                      ? (listing.price ? `from ${listing.price} €` : '')
                      : `${listing.price} €${listing.listing_type === 'rent' && listing.rental_period ? `/${listing.rental_period}` : ''}`
                    }
                  </p>
                  {listing.listing_type !== 'rent' && listing.listing_type !== 'service' && listing.price && (
                    <p className="listing-card-price-total">
                      {(listing.price * 1.08).toFixed(2)} € incl. <PriceTooltipIcon />
                    </p>
                  )}
                  <p className="listing-card-meta">
                    {listing.condition && (
                      <span className="listing-card-cond">
                        {conditionLabels[listing.condition] || listing.condition}
                      </span>
                    )}
                    {listing.location && <span className="listing-card-loc">{listing.location}</span>}
                  </p>
                  {displayName && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(26,20,8,0.06)' }}>
                      <span style={{ fontSize: '11px', color: '#7a7060', letterSpacing: '0.05em' }}>
                        {displayName}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}