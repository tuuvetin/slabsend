'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const categories: Record<string, string[]> = {
  'Vaatteet': ['Paidat', 'Hupparit', 'Housut', 'Shortsit', 'Takit', 'Muut vaatteet'],
  'Kengät': ['Kiipeilykengät', 'Lähestymis- ja vaelluskengät', 'Vuoristokengät', 'Muut kengät'],
  'Varusteet': ['Valjaat', 'Köydet', 'Vuorikiipeily', 'Jääkiipeily', 'Kypärät', 'Crashpadit', 'Mankkapussit ja harjat', 'Treenivälineet', 'Muut tarvikkeet'],
  'Kiipeilyseinätarvikkeet': ['Kiipeilyotteet', 'Turva-alustat', 'Seinämateriaalit'],
}

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('listings').select('*').order('created_at', { ascending: false }).then(({ data }) => {
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
    setFiltered(result)
  }, [search, category, subcategory, listings])

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
      <h1>Ilmoitukset</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
        <input
          placeholder="Hae ilmoituksia..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#111', color: 'white' }}
        />
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setSubcategory('') }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#111', color: 'white' }}
        >
          <option value="">Kaikki kategoriat</option>
          {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        {category && (
          <select
            value={subcategory}
            onChange={e => setSubcategory(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #333', background: '#111', color: 'white' }}
          >
            <option value="">Kaikki alakategoriat</option>
            {categories[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        )}
      </div>
      {filtered.length === 0 && <p>Ei ilmoituksia.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {filtered.map(listing => (
          <a key={listing.id} href={`/listings/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid #333', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}>
              {listing.images && listing.images.length > 0 ? (
                <img src={listing.images[0]} alt={listing.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '200px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Ei kuvaa</div>
              )}
              <div style={{ padding: '15px' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>{listing.title}</h3>
                {listing.category && <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>{listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}</p>}
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{listing.price} €</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>{listing.location}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}