'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ListingPage() {
  const params = useParams()
  const [listing, setListing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!params.id) return
    supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
      setListing(data)
      setLoading(false)
    })
  }, [params.id])

  if (loading) return <p style={{ padding: '20px' }}>Ladataan...</p>
  if (!listing) return <p style={{ padding: '20px' }}>Ilmoitusta ei loydy.</p>

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <a href="/listings" style={{ color: '#888', fontSize: '14px' }}>← Takaisin ilmoituksiin</a>
      <h1 style={{ marginTop: '20px' }}>{listing.title}</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '10px 0' }}>{listing.price} €</p>
      <p style={{ color: '#888', marginBottom: '20px' }}>{listing.location}</p>
      <p style={{ lineHeight: '1.6' }}>{listing.description}</p>
    </div>
  )
}