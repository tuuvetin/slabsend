'use client'
import { useState } from 'react'

interface Category {
  key: string
  label: string
  subcategories: string[]
  defaultBg: string
  href: string
}

interface Props {
  listings: any[]
  categories: Category[]
  heroImageUrl: string
  catImageUrls: Record<string, string>
}

export default function HomeClient({ listings, categories, heroImageUrl, catImageUrls }: Props) {
  const [heroError, setHeroError] = useState(false)
  const [catErrors, setCatErrors] = useState<Record<string, boolean>>({})

  return (
    <main>
      {/* HERO */}
      <div className="home-hero">
        <div className="home-hero-img">
          {!heroError && (
            <img
              src={heroImageUrl}
              alt="Hero"
              className="home-hero-bg-img"
              onError={() => setHeroError(true)}
            />
          )}
          <svg className="home-topo" viewBox="0 0 700 520" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
            <rect width="700" height="520" fill="#3a5460"/>
            <g fill="none" stroke="#c8a84a" strokeWidth="0.9" opacity="0.25">
              <path d="M-10,460 Q80,420 180,440 Q280,460 390,425 Q500,390 620,410 Q700,425 730,400"/>
              <path d="M-10,400 Q70,362 175,382 Q280,400 388,365 Q496,330 618,350 Q700,364 730,342"/>
              <path d="M-10,342 Q75,306 178,324 Q281,342 388,308 Q495,274 618,292 Q700,306 730,285"/>
              <path d="M-10,284 Q78,250 180,267 Q282,284 389,251 Q496,218 619,234 Q700,248 730,228"/>
              <path d="M-10,228 Q80,196 182,211 Q284,228 390,196 Q496,164 620,178 Q700,192 730,173"/>
              <path d="M-10,173 Q82,143 184,157 Q286,171 391,141 Q496,111 620,124 Q700,137 730,119"/>
              <path d="M-10,120 Q85,92 187,104 Q289,116 393,88 Q497,60 621,72 Q700,84 730,67"/>
              <path d="M120,-10 Q112,65 124,145 Q136,225 125,305 Q114,365 118,530"/>
              <path d="M300,-10 Q292,63 303,143 Q314,222 303,302 Q292,362 296,530"/>
              <path d="M490,-10 Q482,62 493,141 Q504,220 493,300 Q482,360 486,530"/>
            </g>
          </svg>
          <div className="home-hero-dim" />
          <div className="home-hero-caption">
            <p>Slabsend — The climbing gear marketplace</p>
            <h1 className="home-hero-title">Buy. Sell.<br/>Climb.</h1>
          </div>
        </div>

        <div className="home-actions">
          <a href="/listings/new?type=sell" className="home-action-box accent">
            <span className="home-action-arrow">↗</span>
            <div className="home-action-label">Sell</div>
            <div className="home-action-desc">List your gear for sale</div>
          </a>
          <a href="/listings" className="home-action-box">
            <span className="home-action-arrow">↗</span>
            <div className="home-action-label">Buy</div>
            <div className="home-action-desc">Browse all listings</div>
          </a>
          <a href="/listings/new?type=rent" className="home-action-box blue">
            <span className="home-action-arrow">↗</span>
            <div className="home-action-label">Rent</div>
            <div className="home-action-desc">Rent or offer gear</div>
          </a>
          <a href="/service" className="home-action-box">
            <span className="home-action-arrow">↗</span>
            <div className="home-action-label">Service</div>
            <div className="home-action-desc">Find a resoler or repair shop</div>
          </a>
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Browse by category</h2>
          <a href="/listings" className="home-see-all">View all →</a>
        </div>
        <div className="home-cat-grid">
          {categories.map(cat => (
            <a key={cat.key} href={cat.href} className="home-cat-card">
              <div className="home-cat-img-wrap">
                {!catErrors[cat.key] ? (
                  <img
                    src={catImageUrls[cat.key]}
                    alt={cat.label}
                    className="home-cat-img"
                    onError={() => setCatErrors(prev => ({ ...prev, [cat.key]: true }))}
                  />
                ) : (
                  <div className="home-cat-img-fallback" style={{ background: cat.defaultBg }} />
                )}
              </div>
              <div className="home-cat-name">{cat.label}</div>
              <div className="home-cat-links">
                {cat.subcategories.map(sub => (
                  <span key={sub} className="home-cat-link">{sub}</span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* LATEST LISTINGS */}
      <div className="home-section" style={{ paddingTop: 0 }}>
        <div className="home-section-header">
          <h2 className="home-section-title">Latest listings</h2>
          <a href="/listings" className="home-see-all">View all →</a>
        </div>
        <div className="home-listings-grid">
          {listings.map((listing: any) => (
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
                  <p className="listing-card-price">{listing.price} €</p>
                  <p className="listing-card-meta">
                    {listing.location && <span className="listing-card-loc">{listing.location}</span>}
                  </p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}