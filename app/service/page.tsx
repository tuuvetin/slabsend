'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import FavoriteButton from '@/app/components/FavoriteButton'

const serviceTypes = [
  'Shoe resoling',
  'Gear repair',
  'Harness inspection',
  'Rope inspection',
  'Gear cleaning',
  'Custom alterations',
  'General service',
  'Other',
]

const europeanCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom',
]

function parseCategories(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    if (parsed.length === 0) return []
    if (typeof parsed[0] === 'string') return parsed
    return parsed.map((i: any) => i.name).filter(Boolean)
  } catch { return [raw] }
}

export default function ServicePage() {
  const [services, setServices] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [filterType, setFilterType] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    supabase
      .from('listings')
      .select('*')
      .eq('listing_type', 'service')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setServices(data || [])
        setFiltered(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let result = services
    if (filterType) result = result.filter(s => parseCategories(s.category).includes(filterType))
    if (filterCountry) result = result.filter(s => s.country === filterCountry)
    setFiltered(result)
  }, [filterType, filterCountry, services])

  return (
    <div className="service-page">
      <div className="service-header">
        <div>
          <h1 className="service-title">Service & Repair</h1>
          <p className="service-subtitle">Find a resoler, repair shop, or gear inspector near you</p>
        </div>
        {currentUser ? (
          <a
            href="/listings/new?type=service"
            className="form-submit"
            style={{ width: 'auto', padding: '10px 24px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            + List your service
          </a>
        ) : (
          <a href="/login" className="sb-btn-sell">Sign in to list a service</a>
        )}
      </div>

      <div className="service-filters">
        <select className="listings-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All service types</option>
          {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="listings-select" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
          <option value="">All countries</option>
          {europeanCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && <p className="listing-loading">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="service-empty">
          <p>No service providers listed yet.</p>
          <p>Be the first to list your service.</p>
        </div>
      )}

      <div className="listings-grid">
        {filtered.map(listing => {
          const cats = parseCategories(listing.category)
          const visibleCats = cats.slice(0, 2)
          const extraCount = cats.length - 2
          const location = [listing.city, listing.country].filter(Boolean).join(', ')

          return (
            <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card-link">
              <div className="listing-card">
                <div style={{ position: 'relative' }}>
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} className="listing-card-img" />
                  ) : (
                    <div className="listing-card-no-img">No image</div>
                  )}
                  <FavoriteButton listingId={listing.id} />
                </div>
                <div className="listing-card-body">
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F5F3E6', background: '#1a1408', display: 'inline-block', padding: '2px 8px', borderRadius: 4, marginBottom: 6 }}>
                    Service
                  </p>
                  <h3 className="listing-card-title">{listing.title}</h3>

                  {cats.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                      {visibleCats.map(cat => (
                        <span key={cat} className="listing-card-cat" style={{ margin: 0, background: 'rgba(26,20,8,0.06)', padding: '1px 7px', borderRadius: 20 }}>{cat}</span>
                      ))}
                      {extraCount > 0 && (
                        <span className="listing-card-cat" style={{ margin: 0, background: 'rgba(26,20,8,0.06)', padding: '1px 7px', borderRadius: 20 }}>+{extraCount}</span>
                      )}
                    </div>
                  )}

                  {listing.price
                    ? <p className="listing-card-price">from {listing.price} €</p>
                    : <p className="listing-card-price" style={{ color: '#c0b8a8' }}>Price on request</p>
                  }
                  <p className="listing-card-meta">
                    {location && <span className="listing-card-loc">📍 {location}</span>}
                  </p>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
