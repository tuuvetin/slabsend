'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const conditions = ['New', 'Excellent', 'Good', 'Fair', 'Poor']

const europeanCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom',
]

const rentalPeriods = [
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'weekend', label: 'Per weekend' },
  { value: 'month', label: 'Per month' },
]

export default function EditListingPage() {
  const params = useParams()
  const [listingType, setListingType] = useState<'sell' | 'rent'>('sell')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [rentalPeriod, setRentalPeriod] = useState('day')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
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
        setCountry(data.country || '')
        setCity(data.city || '')
        setCategory(data.category || '')
        setSubcategory(data.subcategory || '')
        setCondition(data.condition || '')
        setListingType(data.listing_type || 'sell')
        setRentalPeriod(data.rental_period || 'day')
      })
    })
  }, [params.id])

  const handleSave = async () => {
    if (!country) { setMessage('Please select a country.'); return }
    if (!city.trim()) { setMessage('Please enter a city.'); return }

    const { error } = await supabase.from('listings').update({
      title,
      description,
      price: parseInt(price),
      location: `${city}, ${country}`,
      country,
      city,
      category,
      subcategory,
      condition,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? rentalPeriod : null,
    }).eq('id', params.id)

    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Saved!')
      setTimeout(() => window.location.href = `/listings/${params.id}`, 1000)
    }
  }

  return (
    <div className="new-listing-page">
      <a href={`/listings/${params.id}`} className="listing-back">← Back to listing</a>
      <h1 className="new-listing-title" style={{ marginTop: '20px' }}>Edit listing</h1>

      {/* SELL / RENT TOGGLE */}
      <div className="listing-type-toggle">
        <button
          className={`listing-type-btn ${listingType === 'sell' ? 'active' : ''}`}
          onClick={() => setListingType('sell')}
        >
          For sale
        </button>
        <button
          className={`listing-type-btn ${listingType === 'rent' ? 'active rent' : ''}`}
          onClick={() => setListingType('rent')}
        >
          For rent
        </button>
      </div>

      {/* RENTAL PERIOD */}
      {listingType === 'rent' && (
        <div className="rental-period-section">
          <label className="form-label">Rental period</label>
          <div className="rental-period-grid">
            {rentalPeriods.map(period => (
              <button
                key={period.value}
                className={`rental-period-btn ${rentalPeriod === period.value ? 'active' : ''}`}
                onClick={() => setRentalPeriod(period.value)}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        className="form-input"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <textarea
        className="form-input form-textarea"
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <div className="price-input-row">
        <input
          className="form-input"
          placeholder={listingType === 'rent' ? 'Rental price' : 'Price (€)'}
          value={price}
          onChange={e => setPrice(e.target.value)}
          type="number"
          style={{ marginBottom: 0 }}
        />
        {listingType === 'rent' && (
          <span className="price-period-label">
            € / {rentalPeriods.find(p => p.value === rentalPeriod)?.label.replace('Per ', '') || 'day'}
          </span>
        )}
      </div>

      <div className="location-row">
        <select
          className="form-input"
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{ marginBottom: 0 }}
        >
          <option value="">Select country</option>
          {europeanCountries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          className="form-input"
          placeholder="City"
          value={city}
          onChange={e => setCity(e.target.value)}
          style={{ marginBottom: 0 }}
        />
      </div>

      <select
        className="form-input"
        value={category}
        onChange={e => { setCategory(e.target.value); setSubcategory('') }}
      >
        <option value="">Select category</option>
        {Object.keys(categories).map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {category && (
        <select
          className="form-input"
          value={subcategory}
          onChange={e => setSubcategory(e.target.value)}
        >
          <option value="">Select subcategory</option>
          {categories[category].map(sub => (
            <option key={sub} value={sub}>{sub}</option>
          ))}
        </select>
      )}

      <select
        className="form-input"
        value={condition}
        onChange={e => setCondition(e.target.value)}
      >
        <option value="">Select condition</option>
        {conditions.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <button className="form-submit" onClick={handleSave}>
        Save changes
      </button>

      {message && (
        <p className={`form-message ${message.startsWith('Error') || message.startsWith('Please') ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </div>
  )
}