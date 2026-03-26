'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ConversationPage() {
  const params = useParams()
  const [messages, setMessages] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState('')
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setCurrentUser(user)

      supabase.from('messages')
        .select('*')
        .eq('listing_id', params.id)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setMessages(data || [])
          if (data && data.length > 0) {
            supabase.from('listings').select('*').eq('id', data[0].listing_id).single().then(({ data: l }) => setListing(l))
          }
          setLoading(false)
        })

      const channel = supabase
        .channel('messages')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${params.id}`
        }, (payload) => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    })
  }, [params.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || messages.length === 0) return
    const otherUserId = messages[0].sender_id === currentUser.id ? messages[0].receiver_id : messages[0].sender_id
    await supabase.from('messages').insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      listing_id: params.id,
      content: newMessage
    })
    setNewMessage('')
  }

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <a href="/messages" style={{ color: '#888', fontSize: '14px' }}>← Takaisin viesteihin</a>
      {listing && <h2 style={{ marginTop: '10px' }}>{listing.title}</h2>}
      <div style={{ border: '1px solid #333', borderRadius: '8px', padding: '15px', marginTop: '20px', height: '400px', overflowY: 'auto', marginBottom: '15px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ marginBottom: '15px', textAlign: msg.sender_id === currentUser?.id ? 'right' : 'left' }}>
            <div style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '8px', background: msg.sender_id === currentUser?.id ? '#333' : '#222', maxWidth: '80%' }}>
              <p style={{ margin: 0 }}>{msg.content}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888' }}>{new Date(msg.created_at).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <input
          placeholder="Kirjoita viesti..."
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          style={{ flex: 1, padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}
        />
        <button onClick={handleSend} style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Lähetä
        </button>
      </div>
    </div>
  )
}