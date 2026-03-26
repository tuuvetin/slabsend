'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('messages').select('*').or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order('created_at', { ascending: false }).then(({ data }) => {
        const seen = new Set()
        const unique = (data || []).filter(msg => {
          if (seen.has(msg.listing_id)) return false
          seen.add(msg.listing_id)
          return true
        })
        setConversations(unique)
        setLoading(false)
      })
    })
  }, [])

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <h1>Viestit</h1>
      {conversations.length === 0 && <p>Ei viestejä.</p>}
      {conversations.map(msg => (
        <a key={msg.id} href={`/messages/${msg.listing_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #333', borderRadius: '8px', padding: '15px', marginBottom: '10px', cursor: 'pointer' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Ilmoitus #{msg.listing_id}</p>
            <p style={{ margin: '0 0 8px 0', color: '#aaa' }}>{msg.content.substring(0, 60)}...</p>
            <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>{new Date(msg.created_at).toLocaleDateString('fi-FI')}</p>
          </div>
        </a>
      ))}
    </div>
  )
}