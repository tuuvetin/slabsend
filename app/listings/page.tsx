import { createClient } from '@/utils/supabase/server'

export const revalidate = 0

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const conditionLabels: Record<string, string> = {
  'Uusi': 'New', 'Erinomainen': 'Excellent', 'Hyvä': 'Good', 'Tyydyttävä': 'Fair', 'Huono': 'Poor',
}

const europeanCountries = [
  'All of Europe', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Nerlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom',
]

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; category?: string; country?: string }>
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
  const country = params.country || ''

  let filtered = (listings || []).filter((l: any) => (l.listing_type || 'sell') === tab)
  if (search) filtered = filtered.filter((l: any) => l.title.toLowerCase().includes(search.toLowerCase()))
  if (category) filtered = filtered.filter((l: any) => l.category === category)
  if (country) filtered = filtered.filter((l: any) => l.country === country)

  const sellHref = `/listings?tab=sell&search=${search}&category=${category}&country=${country}`
  const rentHref = `/listings?tab=rent&search=${search}&category=${category}&country=${country}`

  return (
    <div className="listings-page">

      <div style={{ maxWidth: '760px', margin: '0 auto 32px', width: '100%' }}>

        {/* SELL / RENT TOGGLE */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
          <a href={sellHref} style={{
            padding: '8px 24px', fontFamily: 'Barlow Condensed', fontSize: '13px',
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            textDecoration: 'none', borderRadius: '8px',
            background: tab === 'sell' ? '#FC7038' : 'rgba(26,20,8,0.06)',
            color: tab === 'sell' ? '#fff' : '#7a7060',
            border: tab === 'sell' ? '1px solid #FC7038' : '1px solid rgba(26,20,8,0.1)',
          }}>For sale</a>
          <a href={rentHref} style={{
            padding: '8px 24px', fontFamily: 'Barlow Condensed', fontSize: '13px',
            fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            textDecoration: 'none', borderRadius: '8px',
            background: tab === 'rent' ? '#4a7c59' : 'rgba(26,20,8,0.06)',
            color: tab === 'rent' ? '#fff' : '#7a7060',
            border: tab === 'rent' ? '1px solid #4a7c59' : '1px solid rgba(26,20,8,0.1)',
          }}>For rent</a>
        </div>

        {/* SEARCH BAR */}
        <form method="GET" action="/listings">
          <input type="hidden" name="tab" value={tab} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ede9de',
            border: '1px solid rgba(26,20,8,0.15)',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(26,20,8,0.06)',
            overflow: 'hidden',
          }}>
            <div style={{ flex: 2, borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 20px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Search</p>
              <input
                placeholder="Chalk bags, ropes, shoes..."
                name="search"
                defaultValue={search}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0 }}
              />
            </div>

            <div style={{ flex: 1, borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 20px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Category</p>
              <select name="category" defaultValue={category} style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}>
                <option value="">All categories</option>
                {Object.keys(categories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, padding: '12px 20px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Location</p>
              <select name="country" defaultValue={country} style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}>
                {europeanCountries.map(c => (
                  <option key={c} value={c === 'All of Europe' ? '' : c}>{c}</option>
                ))}
              </select>
            </div>

            <button type="submit" style={{
              background: '#FC7038', border: 'none', cursor: 'pointer',
              width: '52px', height: '52px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '6px', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
        </form>
      </div>

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
