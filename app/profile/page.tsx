'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) { setUsername(data.username || ''); setFullName(data.full_name || ''); setLocation(data.location || '') }
      })
      supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        setListings(data || [])
      })
    })
  }, [])

  const handleSave = () => {
    supabase.from('profiles').upsert({ user_id: user.id, username, full_name: fullName, location }).then(({ error }) => {
      if (error) setMessage('Virhe: ' + error.message)
      else setMessage('Profiili tallennettu!')
    })
  }

  if (!user) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1>Profiili</h1>
      <p style={{ color: '#888' }}>{user.email}</p>
      <input placeholder="Kayttajanimi" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <input placeholder="Koko nimi" value={fullName} onChange={e => setFullName(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <input placeholder="Sijainti" value={location} onChange={e => setLocation(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <button onClick={handleSave} style={{ width: '100%', padding: '10px', marginBottom: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Tallenna</button>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} style={{ width: '100%', padding: '10px', marginTop: '10px', background: 'none', border: '1px solid #333', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>Kirjaudu ulos</button>

      <h2 style={{ marginTop: '40px' }}>Omat ilmoitukset</h2>
      {listings.length === 0 && <p style={{ color: '#888' }}>Ei ilmoituksia vielä.</p>}
      <div style={{ display: 'grid', gap: '15px', marginTop: '15px' }}>
        {listings.map(listing => (
          <a key={listing.id} href={`/listings/${listing.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid #333', borderRadius: '8px', padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              {listing.images && listing.images.length > 0 ? (
                <img src={listing.images[0]} alt={listing.title} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', background: '#222', borderRadius: '4px' }} />
              )}
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>{listing.title}</p>
                <p style={{ margin: '0', color: '#888', fontSize: '14px' }}>{listing.price} € · {listing.location}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}