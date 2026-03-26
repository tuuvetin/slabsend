'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ListingsPage() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('listings').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setListings(data || [])
      setLoading(false)
    })
  }, [])

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '20px' }}>
      <h1>Ilmoitukset</h1>
      {listings.length === 0 && <p>Ei ilmoituksia vielä.</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {listings.map(listing => (
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