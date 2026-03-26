'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).then(({ data }) => {
        setMessages(data || [])
        setLoading(false)
      })
    })
  }, [])

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1>Viestit</h1>
      {messages.length === 0 && <p>Ei viestejä.</p>}
      {messages.map(msg => (
        <div key={msg.id} style={{ border: '1px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#888' }}>{new Date(msg.created_at).toLocaleDateString('fi-FI')}</p>
          <p style={{ margin: '0 0 8px 0' }}>{msg.content}</p>
          <a href={`/listings/${msg.listing_id}`} style={{ fontSize: '12px', color: '#888' }}>Näytä ilmoitus</a>
        </div>
      ))}
    </div>
  )
}