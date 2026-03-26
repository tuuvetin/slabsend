'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [messageSent, setMessageSent] = useState('')
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

  const handleSendMessage = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (!message.trim()) return
    const { error } = await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: listing.user_id,
      listing_id: listing.id,
      content: message
    })
    if (error) setMessageSent('Virhe: ' + error.message)
    else { setMessageSent('Viesti lahetetty!'); setMessage('') }
  }

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>
  if (!listing) return <p style={{ padding: '20px' }}>Ilmoitusta ei loydy.</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <a href="/listings" style={{ color: '#888', fontSize: '14px' }}>← Takaisin ilmoituksiin</a>
      <h1 style={{ marginTop: '20px' }}>{listing.title}</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{listing.price} €</p>
      <p style={{ color: '#888', marginBottom: '5px' }}>{listing.location}</p>
      {listing.category && <p style={{ color: '#888', fontSize: '14px', marginBottom: '5px' }}>{listing.category}{listing.subcategory ? ` › ${listing.subcategory}` : ''}</p>}
      {listing.condition && <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>Kunto: <strong>{listing.condition}</strong></p>}
      {listing.images && listing.images.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
          {listing.images.map((url: string, i: number) => (
            <img key={i} src={url} alt={listing.title} style={{ width: '100%', borderRadius: '8px', objectFit: 'cover', aspectRatio: '1' }} />
          ))}
        </div>
      )}
      <p style={{ lineHeight: '1.6', marginBottom: '30px' }}>{listing.description}</p>

      {currentUser && currentUser.id !== listing.user_id && (
        <div style={{ borderTop: '1px solid #333', paddingTop: '20px' }}>
          <h3>Ota yhteytta myyjaan</h3>
          <textarea
            placeholder="Kirjoita viesti..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginBottom: '10px', height: '100px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
          />
          <button onClick={handleSendMessage} style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Laheta viesti
          </button>
          {messageSent && <p style={{ color: 'green', marginTop: '10px' }}>{messageSent}</p>}
        </div>
      )}

      {currentUser && currentUser.id === listing.user_id && (
        <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
          <button onClick={() => window.location.href = `/listings/${listing.id}/edit`} style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Muokkaa ilmoitusta
          </button>
          <button onClick={handleDelete} style={{ padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Poista ilmoitus
          </button>
        </div>
      )}
    </div>
  )
}