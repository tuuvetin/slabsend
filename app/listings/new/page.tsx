'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
export default function NewListingPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()
  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { error } = await supabase.from('listings').insert({ user_id: user.id, title, description, price: parseInt(price), location })
    if (error) setMessage('Virhe: ' + error.message)
    else { setMessage('Ilmoitus lisatty!'); setTitle(''); setDescription(''); setPrice(''); setLocation('') }
  }
  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
      <h1>Uusi ilmoitus</h1>
      <input placeholder="Otsikko" value={title} onChange={e => setTitle(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <textarea placeholder="Kuvaus" value={description} onChange={e => setDescription(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', height: '100px' }} />
      <input placeholder="Hinta (EUR)" value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <input placeholder="Sijainti" value={location} onChange={e => setLocation(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <button onClick={handleSubmit} style={{ width: '100%', padding: '10px' }}>Julkaise ilmoitus</button>
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
    </div>
  )
}