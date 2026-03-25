'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) { setUsername(data.username || ''); setFullName(data.full_name || ''); setLocation(data.location || '') }
      })
    })
  }, [])
  const handleSave = () => {
    supabase.from('profiles').upsert({ user_id: user.id, username, full_name: fullName, location }).then(({ error }) => {
      if (error) setMessage('Virhe: ' + error.message)
      else setMessage('Profiili tallennettu!')
    })
  }
  if (!user) return <p>Ladataan...</p>
  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Profiili</h1>
      <p style={{ color: 'gray' }}>{user.email}</p>
      <input placeholder="Kayttajanimi" value={username} onChange={e => setUsername(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <input placeholder="Koko nimi" value={fullName} onChange={e => setFullName(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <input placeholder="Sijainti" value={location} onChange={e => setLocation(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px' }} />
      <button onClick={handleSave} style={{ width: '100%', padding: '10px', marginBottom: '10px' }}>Tallenna</button>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')} style={{ width: '100%', padding: '10px', marginTop: '20px' }}>Kirjaudu ulos</button>
    </div>
  )
}