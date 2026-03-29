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
      <div className="home-hero-full" style={{height: '640px', minHeight: '640px'}}>
        {!heroError && (
          <img
            src={heroImageUrl}
            alt="Hero"
            className="home-hero-bg-img"
            onError={() => setHeroError(true)}
          />
        )}
        <svg className="home-topo" viewBox="0 0 1400 640" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <rect width="1400" height="640" fill="#3a5460"/>
          <g fill="none" stroke="#c8a84a" strokeWidth="0.9" opacity="0.22">
            <path d="M-10,520 Q160,480 320,500 Q480,520 640,485 Q800,450 960,470 Q1120,490 1280,460 Q1360,445 1420,430"/>
            <path d="M-10,460 Q140,422 310,442 Q480,462 638,428 Q796,394 958,414 Q1120,434 1280,404 Q1360,390 1420,374"/>
            <path d="M-10,400 Q145,365 315,383 Q485,401 642,368 Q799,335 960,354 Q1121,373 1280,344 Q1361,330 1420,316"/>
            <path d="M-10,342 Q148,308 318,325 Q488,342 644,310 Q800,278 962,296 Q1124,314 1280,286 Q1362,272 1420,260"/>
            <path d="M-10,285 Q150,252 320,268 Q490,284 645,253 Q800,222 963,239 Q1126,256 1280,229 Q1362,216 1420,205"/>
            <path d="M-10,228 Q152,197 322,212 Q492,227 646,197 Q800,167 964,183 Q1128,199 1280,173 Q1362,160 1420,150"/>
            <path d="M-10,173 Q154,144 324,158 Q494,172 648,143 Q802,114 966,129 Q1130,144 1280,119 Q1362,106 1420,97"/>
            <path d="M240,-10 Q232,80 244,172 Q256,264 244,356 Q232,424 236,640"/>
            <path d="M520,-10 Q512,78 523,170 Q534,262 522,354 Q510,422 514,640"/>
            <path d="M800,-10 Q792,76 803,168 Q814,260 802,352 Q790,420 794,640"/>
            <path d="M1080,-10 Q1072,74 1083,166 Q1094,258 1082,350 Q1070,418 1074,640"/>
          </g>
        </svg>
        <div className="home-hero-dim-full" />
        <div className="home-hero-content-full">
          <div className="home-hero-text">
            <p className="home-hero-eyebrow">Slabsend — Pre-owned climbing gear</p>
            <h1 className="home-hero-title">Buy. Sell.<br/>Rent. Climb.</h1>
          </div>
          <div className="home-action-boxes">
            <a href="/listings/new?type=sell" className="home-action-box-sm accent">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Sell</div>
              <div className="home-action-desc-sm">List your gear</div>
            </a>
            <a href="/listings" className="home-action-box-sm">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Buy</div>
              <div className="home-action-desc-sm">Browse listings</div>
            </a>
            <a href="/listings/new?type=rent" className="home-action-box-sm blue">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Rent</div>
              <div className="home-action-desc-sm">Rent or offer gear</div>
            </a>
            <a href="/service" className="home-action-box-sm">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Service</div>
              <div className="home-action-desc-sm">Find a repair shop</div>
            </a>
          </div>
        </div>
      </div>

{/* CATEGORIES */}
<div className="home-section full-bleed">
        <div className="home-section-header">
          <h2 className="home-section-title">Browse by category</h2>
          <a href="/listings" className="home-see-all">View all →</a>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              const el = document.getElementById('cat-scroll')
              if (el) el.scrollBy({ left: -320, behavior: 'smooth' })
            }}
            style={{
              position: 'absolute', left: '-16px', top: '40%', transform: 'translateY(-50%)',
              zIndex: 10, background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.15)',
              borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: '#1a1408', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >‹</button>
          <div id="cat-scroll" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '13px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingLeft: '0',
          }}>
            {categories.map(cat => (
              <a key={cat.key} href={cat.href} className="home-cat-card" style={{ scrollSnapAlign: 'start' }}>
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
                <div className="home-cat-shop-btn">Shop</div>
              </a>
            ))}
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('cat-scroll')
              if (el) el.scrollBy({ left: 320, behavior: 'smooth' })
            }}
            style={{
              position: 'absolute', right: '-16px', top: '40%', transform: 'translateY(-50%)',
              zIndex: 10, background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.15)',
              borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: '#1a1408', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >›</button>
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