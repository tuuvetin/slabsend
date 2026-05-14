'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PriceTooltipIcon from '@/app/components/PriceTooltipIcon'
import FavoriteButton from '@/app/components/FavoriteButton'
import { parseSearchIntent } from '@/app/lib/searchIntent'

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

// ─── How It Works ────────────────────────────────────────────────────────────

const SELLER_STEPS = [
  { title: 'List your gear',  desc: 'Add photos and set your price. Free to list, always.' },
  { title: 'Ship it',         desc: 'Once sold, you receive a shipping code by email. Write it on the package and drop it off at your nearest pickup point.' },
  { title: 'Get paid',        desc: 'You get paid once the buyer confirms the item matches the listing — or automatically 48h after delivery.' },
]

const BUYER_STEPS = [
  { title: 'Find your gear',      desc: 'Browse climbing gear from sellers across Europe.' },
  { title: 'Buy with protection', desc: 'Pay securely. Your money is held until you confirm the item arrived as described.' },
  { title: 'Confirm & done',      desc: "Mark the item as accepted within 48h of receiving it. If it doesn't match the listing, contact us and get your money back." },
]

function HowItWorksCard({
  label, accent, steps, cta, ctaHref,
}: {
  label: string
  accent: string
  steps: { title: string; desc: string }[]
  cta: string
  ctaHref: string
}) {
  return (
    <div style={{ background: '#1a1408', borderRadius: '16px', padding: '28px 28px 24px', display: 'flex', flexDirection: 'column' }}>

      {/* Label + divider */}
      <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent, margin: '0 0 14px' }}>
        {label}
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0 0 24px' }} />

      {/* Steps */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: '16px' }}>

            {/* Number + connecting line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                border: `2px solid ${accent}`, color: accent,
                fontSize: '16px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: '2px', flex: 1, minHeight: '20px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />
              )}
            </div>

            {/* Text */}
            <div style={{ paddingTop: '8px', paddingBottom: i < steps.length - 1 ? '24px' : '0' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#F5F3E6', margin: '0 0 4px', letterSpacing: '0.01em' }}>
                {step.title}
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(245,243,230,0.55)', lineHeight: 1.6, margin: 0 }}>
                {step.desc}
              </p>
            </div>

          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href={ctaHref}
        style={{
          display: 'block', textAlign: 'center', marginTop: '28px',
          fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '14px 24px', borderRadius: '10px',
          background: accent, color: accent === '#FC7038' ? '#fff' : '#F5F3E6',
          textDecoration: 'none',
        }}
      >
        {cta} →
      </a>

    </div>
  )
}

function HowItWorks() {
  return (
    <div style={{ background: '#F5F3E6', padding: '56px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <h2 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a1408', textAlign: 'center', margin: '0 0 6px' }}>
          How it works
        </h2>
        <p style={{ textAlign: 'center', color: '#9a9080', fontSize: '13px', margin: '0 0 32px' }}>
          Buy and sell climbing gear — safe, simple, shipped.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <HowItWorksCard label="For sellers" accent="#FC7038" steps={SELLER_STEPS} cta="Start selling" ctaHref="/listings/new" />
          <HowItWorksCard label="For buyers"  accent="#5a9e6f" steps={BUYER_STEPS}  cta="Browse listings" ctaHref="/listings" />
        </div>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#9a9080', marginTop: '20px', lineHeight: 1.6 }}>
          Powered by Stripe — buyers are protected until delivery is confirmed.<br />
          Selling? <a href="/profile" style={{ color: '#FC7038', textDecoration: 'none', fontWeight: 600 }}>Connect Stripe on your profile page</a> to safely receive payouts directly to your bank.
        </p>

      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeClient({ listings, categories, heroImageUrl, catImageUrls }: Props) {
  const [heroError, setHeroError] = useState(false)
  const [catErrors, setCatErrors] = useState<Record<string, boolean>>({})
  const [searchVal, setSearchVal] = useState('')
  const [placeholder, setPlaceholder] = useState('Search for gear, brand or category...')
  const router = useRouter()
  const eyebrowRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const words = ['Scarpa..', 'Crash pads..', 'T-shirts..', 'Climbing shoes..', 'Harness..', 'La Sportiva..', 'Rent a crashpad..']
    let wordIdx = 0
    let charIdx = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      const word = words[wordIdx]
      if (!deleting) {
        charIdx++
        setPlaceholder(word.slice(0, charIdx))
        if (charIdx === word.length) {
          deleting = true
          timer = setTimeout(tick, 2400)
          return
        }
      } else {
        charIdx--
        setPlaceholder(word.slice(0, charIdx))
        if (charIdx === 0) {
          deleting = false
          wordIdx = (wordIdx + 1) % words.length
        }
      }
      timer = setTimeout(tick, deleting ? 45 : 90)
    }

    timer = setTimeout(tick, 1200)
    return () => clearTimeout(timer)
  }, [])


  useEffect(() => {
    const el = eyebrowRef.current
    if (!el) return
    // Pre-promote to own GPU layer
    el.style.willChange = 'transform, opacity'

    let rafId: number
    const onScroll = () => {
      rafId = requestAnimationFrame(() => {
        const scrollY = window.scrollY
        // Hero is 640px desktop / 520px mobile — fade+drift completes at 55% of hero
        const heroH = window.innerWidth <= 600 ? 520 : 640
        const progress = Math.min(scrollY / (heroH * 0.55), 1)
        const y = scrollY * 0.28
        const opacity = 1 - progress
        el.style.transform = `translate3d(0, ${y}px, 0)`
        el.style.opacity = String(opacity)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchVal.trim()) return
    const { tab, category, subcategory, cleanQuery } = parseSearchIntent(searchVal)
    const params = new URLSearchParams({ tab })
    if (cleanQuery) params.set('search', cleanQuery)
    if (category) params.set('category', category)
    if (subcategory) params.set('subcategory', subcategory)
    router.push(`/listings?${params.toString()}`)
  }

  return (
    <main>
      {/* HERO */}
      <div className="home-hero-full" style={{height: '640px', minHeight: '640px'}}>
        {!heroError && (
          <Image src={heroImageUrl} alt="Hero" className="home-hero-bg-img" fill priority onError={() => setHeroError(true)} style={{ objectFit: 'cover' }} />
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
            <h1 className="home-hero-title">Buy. Sell.<br/>Rent. Climb.</h1>
            <p ref={eyebrowRef} className="home-hero-eyebrow">Slabsend — Pre-owned climbing gear</p>
          </div>
          <div className="home-action-boxes">
            <a href="/listings/new" className="home-action-box-sm accent">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Sell</div>
              <div className="home-action-desc-sm">List your gear</div>
            </a>
            <a href="/listings" className="home-action-box-sm">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Buy</div>
              <div className="home-action-desc-sm">Browse listings</div>
            </a>
            <a href="/listings?tab=rent" className="home-action-box-sm blue">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Rent</div>
              <div className="home-action-desc-sm">Browse rentals</div>
            </a>
            <a href="/service" className="home-action-box-sm">
              <span className="home-action-arrow">↗</span>
              <div className="home-action-label-sm">Service</div>
              <div className="home-action-desc-sm">Find a repair shop</div>
            </a>
          </div>
        </div>
      </div>

      {/* HERO SEARCH */}
      <div className="home-hero-search-wrap">
        <form onSubmit={handleSearch} className="home-hero-search-form">
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder={searchVal ? 'Search for gear, brand or category...' : placeholder}
            className="home-hero-search-input"
          />
          <button type="submit" className="home-hero-search-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span>Search</span>
          </button>
        </form>
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
              position: 'absolute', left: '4px', top: '40%', transform: 'translateY(-50%)',
              zIndex: 10, background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.15)',
              borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: '#1a1408', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >‹</button>
          <div id="cat-scroll" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '13px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            paddingLeft: '16px',
            paddingRight: '16px',
            scrollPaddingLeft: '16px',
          }}>
            {categories.map(cat => (
              <a key={cat.key} href={cat.href} className="home-cat-card" style={{ scrollSnapAlign: 'start' }}>
                <div className="home-cat-img-wrap">
                  {!catErrors[cat.key] ? (
                    <Image
                      src={catImageUrls[cat.key]}
                      alt={cat.label}
                      className="home-cat-img"
                      fill
                      sizes="160px"
                      style={{ objectFit: 'cover' }}
                      onError={() => setCatErrors(prev => ({ ...prev, [cat.key]: true }))}
                    />
                  ) : (
                    <div className="home-cat-img-fallback" style={{ background: cat.defaultBg }} />
                  )}
                </div>
                <div className="home-cat-name" style={{ textTransform: 'uppercase' }}>{cat.label}</div>
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
              position: 'absolute', right: '4px', top: '40%', transform: 'translateY(-50%)',
              zIndex: 10, background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.15)',
              borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', color: '#1a1408', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >›</button>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <HowItWorks />

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
                <div style={{ position: 'relative' }}>
                  {listing.images && listing.images.length > 0 ? (
                    <div style={{ position: 'relative', height: '300px', overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
                      <Image src={listing.images[0]} alt={listing.title} fill sizes="(max-width: 600px) 50vw, 300px" style={{ objectFit: 'cover', objectPosition: 'top' }} />
                    </div>
                  ) : (
                    <div className="listing-card-no-img">No image</div>
                  )}
                  <FavoriteButton listingId={listing.id} />
                </div>
                <div className="listing-card-body">
                  <h3 className="listing-card-title">{listing.title}</h3>
                  {listing.category && (
                    <p className="listing-card-cat">
                      {listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}
                    </p>
                  )}
                  <p className="listing-card-price">{listing.price} €</p>
                  {listing.listing_type !== 'rent' && (
                    <p className="listing-card-price-total">
                      {(listing.price * 1.10).toFixed(2)} € incl. <PriceTooltipIcon />
                    </p>
                  )}
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
