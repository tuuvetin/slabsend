'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const conditions = ['New', 'Excellent', 'Good', 'Fair', 'Poor']

const rentalPeriods = [
  { value: 'hour', label: 'Per hour' },
  { value: 'day', label: 'Per day' },
  { value: 'week', label: 'Per week' },
  { value: 'weekend', label: 'Per weekend' },
  { value: 'month', label: 'Per month' },
]

const europeanCountries = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom',
]

export default function NewListingPage() {
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
  const [images, setImages] = useState<File[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).slice(0, 5)
    const converted: File[] = []
    for (const file of files) {
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
          const heic2any = (await import('heic2any')).default
          const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 }) as Blob
          const newFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' })
          converted.push(newFile)
        } catch {
          converted.push(file)
        }
      } else {
        converted.push(file)
      }
    }
    setImages(converted)
  }

  const handleSubmit = async () => {
    if (!country) { setMessage('Please select a country.'); return }
    if (!city.trim()) { setMessage('Please enter a city.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const imageUrls: string[] = []
    for (const image of images) {
      const filename = `${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage.from('listing-images').upload(filename, image)
      if (!error) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(filename)
        imageUrls.push(data.publicUrl)
      }
    }

    const { error } = await supabase.from('listings').insert({
      user_id: user.id,
      title,
      description,
      price: parseInt(price),
      location: `${city}, ${country}`,
      country,
      city,
      category,
      subcategory,
      condition,
      images: imageUrls,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? rentalPeriod : null,
    })

    setLoading(false)
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Listing published!')
      setTitle(''); setDescription(''); setPrice('')
      setCountry(''); setCity('')
      setCategory(''); setSubcategory(''); setCondition('')
      setImages([]); setRentalPeriod('day')
    }
  }

  const priceLabel = listingType === 'rent'
    ? rentalPeriods.find(p => p.value === rentalPeriod)?.label || 'Per day'
    : 'Price (€)'

  return (
    <div className="new-listing-page">
      <h1 className="new-listing-title">New listing</h1>

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

      {/* PRICE */}
      <div className="price-input-row">
        <input
          className="form-input"
          placeholder={priceLabel}
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

      {/* LOCATION */}
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

      <div className="form-images">
        <label className="form-label">Photos (max 5)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImages}
          className="form-file"
        />
        {images.length > 0 && (
          <p className="form-file-count">{images.length} photo{images.length > 1 ? 's' : ''} selected</p>
        )}
      </div>

      <button className="form-submit" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Publishing...' : 'Publish listing'}
      </button>

      {message && (
        <p className={`form-message ${message.startsWith('Error') || message.startsWith('Please') ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </div>
  )
}