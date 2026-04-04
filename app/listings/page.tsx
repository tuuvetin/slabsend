import { createClient } from '@/utils/supabase/server'
import ListingsSearch from '@/app/components/ListingsSearch'

export const revalidate = 0

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

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('sold', false)
    .order('created_at', { ascending: false })

  const userIds = [...new Set((listings || []).map((l: any) => l.user_id))]
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('user_id, username, full_name, avatar_url').in('user_id', userIds)
    : { data: [] }

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

      {filtered.length === 0 && <p className="listings-empty">No listings found.</p>}

      <div className="listings-grid">
        {filtered.map((listing: any) => {
          const profile = profileMap[listing.user_id]
          const displayName = profile?.username || profile?.full_name || ''

          return (
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
                      {(listing.price * 1.08).toFixed(2)} € incl.
                      <span className="info-tooltip-wrap" tabIndex={0} style={{ position: 'relative', display: 'inline-block', cursor: 'default' }}>
                        🛡️
                        <span className="info-tooltip price-tooltip">
                          Your purchase is covered by Slabsend Buyer Protection. The seller receives payment only after you confirm the item arrived as described.
                        </span>
                      </span>
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
                      <span style={{ fontSize: '11px', color: '#7a7060', fontFamily: 'Barlow Condensed', letterSpacing: '0.05em' }}>
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