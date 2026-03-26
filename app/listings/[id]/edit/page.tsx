'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const categories: Record<string, string[]> = {
  'Vaatteet': ['Paidat', 'Hupparit', 'Housut', 'Shortsit', 'Takit', 'Muut vaatteet'],
  'Kengät': ['Kiipeilykengät', 'Lähestymis- ja vaelluskengät', 'Vuoristokengät', 'Muut kengät'],
  'Varusteet': ['Valjaat', 'Köydet', 'Vuorikiipeily', 'Jääkiipeily', 'Kypärät', 'Crashpadit', 'Mankkapussit ja harjat', 'Treenivälineet', 'Muut tarvikkeet'],
  'Kiipeilyseinätarvikkeet': ['Kiipeilyotteet', 'Turva-alustat', 'Seinämateriaalit'],
}

const conditions = ['Uusi', 'Erinomainen', 'Hyvä', 'Tyydyttävä', 'Huono']

export default function EditListingPage() {
  const params = useParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [condition, setCondition] = useState('')
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
        if (!data || data.user_id !== user.id) { window.location.href = '/listings'; return }
        setTitle(data.title || '')
        setDescription(data.description || '')
        setPrice(data.price?.toString() || '')
        setLocation(data.location || '')
        setCategory(data.category || '')
        setSubcategory(data.subcategory || '')
        setCondition(data.condition || '')
      })
    })
  }, [params.id])

  const handleSave = async () => {
    const { error } = await supabase.from('listings').update({ title, description, price: parseInt(price), location, category, subcategory, condition }).eq('id', params.id)
    if (error) setMessage('Virhe: ' + error.message)
    else { setMessage('Tallennettu!'); setTimeout(() => window.location.href = `/listings/${params.id}`, 1000) }
  }

  return (
    <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
      <a href={`/listings/${params.id}`} style={{ color: '#888', fontSize: '14px' }}>← Takaisin ilmoitukseen</a>
      <h1 style={{ marginTop: '20px' }}>Muokkaa ilmoitusta</h1>
      <input placeholder="Otsikko" value={title} onChange={e => setTitle(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <textarea placeholder="Kuvaus" value={description} onChange={e => setDescription(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', height: '100px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <input placeholder="Hinta (EUR)" value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <input placeholder="Sijainti" value={location} onChange={e => setLocation(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }} />
      <select value={category} onChange={e => { setCategory(e.target.value); setSubcategory('') }} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}>
        <option value="">Valitse kategoria</option>
        {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>
      {category && (
        <select value={subcategory} onChange={e => setSubcategory(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}>
          <option value="">Valitse alakategoria</option>
          {categories[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
        </select>
      )}
      <select value={condition} onChange={e => setCondition(e.target.value)} style={{ display: 'block', width: '100%', marginBottom: '10px', padding: '8px', background: '#111', color: 'white', border: '1px solid #333', borderRadius: '4px' }}>
        <option value="">Valitse kunto</option>
        {conditions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button onClick={handleSave} style={{ width: '100%', padding: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Tallenna muutokset</button>
      {message && <p style={{ color: 'green', marginTop: '10px' }}>{message}</p>}
    </div>
  )
}