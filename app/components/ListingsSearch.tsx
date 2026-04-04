'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  country: string
}

export default function ListingsSearch({ tab, search, category, country }: Props) {
  const router = useRouter()
  const [searchVal, setSearchVal] = useState(search)
  const [categoryVal, setCategoryVal] = useState(category)
  const [countryVal, setCountryVal] = useState(country)

  const sellHref = `/listings?tab=sell&search=${searchVal}&category=${categoryVal}&country=${countryVal}`
  const rentHref = `/listings?tab=rent&search=${searchVal}&category=${categoryVal}&country=${countryVal}`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/listings?tab=${tab}&search=${searchVal}&category=${categoryVal}&country=${countryVal}`)
  }

  return (
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
      <form onSubmit={handleSubmit}>
        <div style={{
          display: 'flex', alignItems: 'stretch',
          background: '#ede9de', border: '1px solid rgba(26,20,8,0.15)',
          borderRadius: '12px', boxShadow: '0 2px 8px rgba(26,20,8,0.06)',
          overflow: 'hidden', flexWrap: 'wrap',
        }}>

          {/* SEARCH */}
          <div style={{ flex: '2 1 160px', borderRight: '1px solid rgba(26,20,8,0.1)', borderBottom: '0', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }} className="search-label">Search</p>
            <input
              placeholder="Chalk bags, ropes..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0 }}
            />
          </div>

          {/* CATEGORY */}
          <div style={{ flex: '1 1 120px', borderRight: '1px solid rgba(26,20,8,0.1)', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }} className="search-label">Category</p>
            <select
              value={categoryVal}
              onChange={e => setCategoryVal(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Barlow', fontSize: '14px', color: '#1a1408', width: '100%', padding: 0, cursor: 'pointer', appearance: 'none' }}
            >
              <option value="">All</option>
              {Object.keys(categories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* LOCATION */}
          <div style={{ flex: '1 1 120px', padding: '12px 16px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a9080', marginBottom: '2px' }} className="search-label">Location</p>
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
      </form>
    </div>
  )
}
