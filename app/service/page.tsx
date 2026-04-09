'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

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
  try { return JSON.parse(raw) } catch { return [raw] }
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

      <div className="service-grid">
        {filtered.map(listing => {
          const image = listing.images?.[0]
          const location = [listing.city, listing.country].filter(Boolean).join(', ')
          const cats = parseCategories(listing.category)
          const visibleCats = cats.slice(0, 2)
          const extraCount = cats.length - 2

          return (
            <a key={listing.id} href={`/listings/${listing.id}`} className="service-card-link-wrap">
              <div className="service-card service-card-dark">
                {image && (
                  <div className="service-card-image">
                    <img src={image} alt={listing.title} />
                  </div>
                )}
                <div className="service-card-body">
                  <div className="service-card-header">
                    <h3 className="service-card-name">{listing.title}</h3>
                    {listing.price && (
                      <span className="service-card-price">from €{listing.price}</span>
                    )}
                  </div>

                  {cats.length > 0 && (
                    <div className="service-card-tags">
                      {visibleCats.map(cat => (
                        <span key={cat} className="service-card-tag">{cat}</span>
                      ))}
                      {extraCount > 0 && (
                        <span className="service-card-tag service-card-tag-more">+{extraCount}</span>
                      )}
                    </div>
                  )}

                  {listing.description && (
                    <p className="service-card-desc">
                      {listing.description.length > 90 ? listing.description.substring(0, 90) + '…' : listing.description}
                    </p>
                  )}

                  {location && (
                    <div className="service-card-location">
                      <span>📍</span>
                      <span>{location}</span>
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
