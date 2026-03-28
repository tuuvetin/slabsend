'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const conditionLabels: Record<string, string> = {
  'Uusi': 'New',
  'Erinomainen': 'Excellent',
  'Hyvä': 'Good',
  'Tyydyttävä': 'Fair',
  'Huono': 'Poor',
}

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [location, setLocation] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setListings(data || [])
        setFiltered(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    let result = listings
    if (search) result = result.filter(l => l.title.toLowerCase().includes(search.toLowerCase()))
    if (category) result = result.filter(l => l.category === category)
    if (subcategory) result = result.filter(l => l.subcategory === subcategory)
    if (minPrice) result = result.filter(l => l.price >= parseInt(minPrice))
    if (maxPrice) result = result.filter(l => l.price <= parseInt(maxPrice))
    if (location) result = result.filter(l => l.location?.toLowerCase().includes(location.toLowerCase()))
    setFiltered(result)
  }, [search, category, subcategory, minPrice, maxPrice, location, listings])

  if (loading) return <p className="listings-loading">Loading listings...</p>

  return (
    <div className="listings-page">
      <h1 className="listings-title">Listings</h1>

      <div className="listings-search-row">
        <input
          className="listings-input"
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input
          className="listings-input listings-input-sm"
          placeholder="Location"
          value={location}
          onChange={e => setLocation(e.target.value)}
        />
      </div>

      <div className="listings-filter-row">
        <select
          className="listings-select"
          value={category}
          onChange={e => { setCategory(e.target.value); setSubcategory('') }}
        >
          <option value="">All categories</option>
          {Object.keys(categories).map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {category && (
          <select
            className="listings-select"
            value={subcategory}
            onChange={e => setSubcategory(e.target.value)}
          >
            <option value="">All subcategories</option>
            {categories[category].map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        )}

        <input
          className="listings-input listings-input-xs"
          placeholder="Min price €"
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          type="number"
        />
        <input
          className="listings-input listings-input-xs"
          placeholder="Max price €"
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          type="number"
        />
      </div>

      {filtered.length === 0 && (
        <p className="listings-empty">No listings found.</p>
      )}

      <div className="listings-grid">
        {filtered.map(listing => (
          <a key={listing.id} href={`/listings/${listing.id}`} className="listing-card-link">
            <div className="listing-card">
              {listing.images && listing.images.length > 0 ? (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="listing-card-img"
                />
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
                <p className="listing-card-price">{listing.price} €</p>
                <p className="listing-card-meta">
                  {listing.condition && (
                    <span className="listing-card-cond">
                      {conditionLabels[listing.condition] || listing.condition}
                    </span>
                  )}
                  {listing.location && (
                    <span className="listing-card-loc">{listing.location}</span>
                  )}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}