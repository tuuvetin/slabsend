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
            <div style={{ border: '1px solid #333', borderRadius: '8px', padding: '15px', cursor: 'pointer' }}>
              <h3 style={{ margin: '0 0 8px 0' }}>{listing.title}</h3>
              <p style={{ margin: '0 0 8px 0', color: '#aaa', fontSize: '14px' }}>{listing.description}</p>
              <p style={{ margin: '0', fontWeight: 'bold' }}>{listing.price} €</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>{listing.location}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}