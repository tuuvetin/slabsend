'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return <p>Ladataan...</p>

  if (!user) {
    window.location.href = '/login'
    return null
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Profiili</h1>
      <p>Sähköposti: {user.email}</p>
      <p>Käyttäjä ID: {user.id}</p>
      <button onClick={handleSignOut} style={{ padding: '10px 20px', marginTop: '20px' }}>
        Kirjaudu ulos
      </button>
    </div>
  )
}
