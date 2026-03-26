'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
      setListing(data)
      setLoading(false)
    })
  }, [params.id])

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa ilmoituksen?')) return
    await supabase.from('listings').delete().eq('id', listing.id)
    window.location.href = '/listings'
  }

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>
  if (!listing) return <p style={{ padding: '20px' }}>Ilmoitusta ei loydy.</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <a href="/listings" style={{ color: '#888', fontSize: '14px' }}>← Takaisin ilmoituksiin</a>
      <h1 style={{ marginTop: '20px' }}>{listing.title}</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{listing.price} €</p>
      <p style={{ color: '#888', marginBottom: '5px' }}>{listing.location}</p>
      {listing.category && <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>{listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}</p>}
      {listing.images && listing.images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {listing.images.map((url: string, i: number) => (
            <img key={i} src={url} alt={listing.title} style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', aspectRatio: '1' }} />
          ))}
        </div>
      )}
      <p style={{ lineHeight: '1.6' }}>{listing.description}</p>
      {currentUser && currentUser.id === listing.user_id && (
        <button onClick={handleDelete} style={{ marginTop: '30px', padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Poista ilmoitus
        </button>
      )}
    </div>
  )
}