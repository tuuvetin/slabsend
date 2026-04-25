'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseSearchIntent } from '@/app/lib/searchIntent'

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const europeanCountries = [
  'All of Europe', 'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'United Kingdom',
]

interface Props {
  tab: string
  search: string
  category: string
  subcategory: string
  country: string
}

export default function ListingsSearch({ tab, search, category, subcategory, country }: Props) {
  const router = useRouter()
  const [searchVal, setSearchVal] = useState(search)
  const [categoryVal, setCategoryVal] = useState(category)
  const [subcategoryVal, setSubcategoryVal] = useState(subcategory)
  const [countryVal, setCountryVal] = useState(country)

  const subcategories = categoryVal ? categories[categoryVal] || [] : []

  const buildHref = (t: string) =>
    `/listings?tab=${t}&search=${searchVal}&category=${categoryVal}&subcategory=${subcategoryVal}&country=${countryVal}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchVal.trim()) {
      const { tab: intentTab, category: intentCat, subcategory: intentSub, cleanQuery } = parseSearchIntent(searchVal)
      // Use intent-detected values when the dropdowns haven't been manually set
      const resolvedTab = intentTab
      const resolvedCat = intentCat || categoryVal
      const resolvedSub = intentSub || subcategoryVal
      router.push(`/listings?tab=${resolvedTab}&search=${encodeURIComponent(cleanQuery)}&category=${encodeURIComponent(resolvedCat)}&subcategory=${encodeURIComponent(resolvedSub)}&country=${encodeURIComponent(countryVal)}`)
    } else {
      router.push(buildHref(tab))
    }
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto 32px', width: '100%' }}>

      {/* SELL / RENT TOGGLE */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center' }}>
        <a href={buildHref('sell')} style={{
          padding: '8px 24px', fontFamily: 'Barlow Condensed', fontSize: '13px',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none', borderRadius: '8px',
          background: tab === 'sell' ? '#FC7038' : 'rgba(26,20,8,0.06)',
          color: tab === 'sell' ? '#fff' : '#7a7060',
          border: tab === 'sell' ? '1px solid #FC7038' : '1px solid rgba(26,20,8,0.1)',
        }}>For sale</a>
        <a href={buildHref('rent')} style={{
          padding: '8px 24px', fontFamily: 'Barlow Condensed', fontSize: '13px',
          fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none', borderRadius: '8px',
          background: tab === 'rent' ? '#4a7c59' : 'rgba(26,20,8,0.06)',
          color: tab === 'rent' ? '#fff' : '#7a7060',
          border: tab === 'rent' ? '1px solid #4a7c59' : '1px solid rgba(26,20,8,0.1)',
        }}>For rent</a>
      </div>

      {/* SEARCH BAR */}
      <form onSubmit={handleSubmit}>
        <div className="search-box" style={{
          display: 'flex', alignItems: 'stretch',
          background: '#ede9de', border: '1px solid rgba(26,20,8,0.15)',
          borderRadius: '12px', boxShadow: '0 2px 8px rgba(26,20,8,0.06)',
          overflow: 'hidden', flexWrap: 'wrap',
        }}>

          {/* SEARCH */}
          <div className="search-field-search" style={{ flex: '2 1 140px', borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 16px' }}>
            <p className="search-field-label" style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Search</p>
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search gear..."
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0 }}
            />
          </div>

          {/* CATEGORY */}
          <div className="search-field-cat" style={{ flex: '1 1 100px', borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 16px' }}>
            <p className="search-field-label" style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Category</p>
            <select
              value={categoryVal}
              onChange={e => { setCategoryVal(e.target.value); setSubcategoryVal('') }}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}
            >
              <option value="">All</option>
              {Object.keys(categories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* SUBCATEGORY */}
          {subcategories.length > 0 && (
            <div className="search-field-sub" style={{ flex: '1 1 100px', borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 16px' }}>
              <p className="search-field-label" style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Type</p>
              <select
                value={subcategoryVal}
                onChange={e => setSubcategoryVal(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}
              >
                <option value="">All</option>
                {subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* LOCATION */}
          <div className="search-field-loc" style={{ flex: '1 1 100px', padding: '12px 16px' }}>
            <p className="search-field-label" style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }}>Location</p>
            <select
              value={countryVal}
              onChange={e => setCountryVal(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}
            >
              {europeanCountries.map(c => (
                <option key={c} value={c === 'All of Europe' ? '' : c}>{c}</option>
              ))}
            </select>
          </div>

          {/* BUTTON */}
          <div className="search-btn-outer">
            <button type="submit" style={{
              background: '#FC7038', border: 'none', cursor: 'pointer',
              width: '52px', minHeight: '52px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '6px', flexShrink: 0, alignSelf: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}