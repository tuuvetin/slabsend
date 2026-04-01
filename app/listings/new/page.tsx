'use client'
import { useState, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

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

const packageSizes = [
  { value: 'XS', label: 'XS', desc: 'Max 1kg · kirjekoko' },
  { value: 'S', label: 'S', desc: 'Max 5kg · pieni paketti' },
  { value: 'M', label: 'M', desc: 'Max 10kg · keskikokoinen' },
  { value: 'L', label: 'L', desc: 'Max 20kg · iso paketti' },
]

function centerAspectCrop(width: number, height: number) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height)
}

async function getCroppedBlob(imgEl: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const scaleX = imgEl.naturalWidth / imgEl.width
  const scaleY = imgEl.naturalHeight / imgEl.height
  const srcWidth = crop.width * scaleX
  const srcHeight = crop.height * scaleY
  const minSize = 1400
  const scale = srcWidth < minSize ? minSize / srcWidth : 1
  canvas.width = Math.round(srcWidth * scale)
  canvas.height = Math.round(srcHeight * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(imgEl, crop.x * scaleX, crop.y * scaleY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height)
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.95))
}

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
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [shippingEnabled, setShippingEnabled] = useState(false)
  const [packageSize, setPackageSize] = useState('')
  const [packageWeight, setPackageWeight] = useState('')

  // Crop state
  const [cropQueue, setCropQueue] = useState<{ file: File; src: string }[]>([])
  const [cropIndex, setCropIndex] = useState(0)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [croppedFiles, setCroppedFiles] = useState<File[]>([])
  const [showCropper, setShowCropper] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const supabase = createClient()

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).slice(0, 5)
    const converted: { file: File; src: string }[] = []
    for (const file of files) {
      let f = file
      if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
          const heic2any = (await import('heic2any')).default
          const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 }) as Blob
          f = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' })
        } catch { f = file }
      }
      const src = URL.createObjectURL(f)
      converted.push({ file: f, src })
    }
    setCropQueue(converted)
    setCropIndex(0)
    setCroppedFiles([])
    setShowCropper(true)
    setCrop(undefined)
  }

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height))
  }, [])

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return
    const blob = await getCroppedBlob(imgRef.current, completedCrop)
    const current = cropQueue[cropIndex]
    const croppedFile = new File([blob], current.file.name, { type: 'image/jpeg' })
    const newCropped = [...croppedFiles, croppedFile]
    setCroppedFiles(newCropped)
    if (cropIndex + 1 < cropQueue.length) {
      setCropIndex(cropIndex + 1)
      setCrop(undefined)
    } else {
      setShowCropper(false)
    }
  }

  const handleSkipCrop = () => {
    const current = cropQueue[cropIndex]
    const newCropped = [...croppedFiles, current.file]
    setCroppedFiles(newCropped)
    if (cropIndex + 1 < cropQueue.length) {
      setCropIndex(cropIndex + 1)
      setCrop(undefined)
    } else {
      setShowCropper(false)
    }
  }

  const handleSubmit = async () => {
    if (!country) { setMessage('Please select a country.'); return }
    if (!city.trim()) { setMessage('Please enter a city.'); return }
    if (shippingEnabled && !packageSize) { setMessage('Please select a package size.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const imageUrls: string[] = []
    for (const image of croppedFiles) {
      const filename = `${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage.from('listing-images').upload(filename, image)
      if (!error) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(filename)
        imageUrls.push(data.publicUrl)
      }
    }

    const { error } = await supabase.from('listings').insert({
      user_id: user.id, title, description,
      price: parseInt(price),
      location: `${city}, ${country}`,
      country, city, category, subcategory, condition,
      images: imageUrls,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? rentalPeriod : null,
      shipping_enabled: shippingEnabled,
      package_size: shippingEnabled ? packageSize : null,
      package_weight: shippingEnabled && packageWeight ? parseFloat(packageWeight) : null,
    })

    setLoading(false)
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Listing published!')
      setTitle(''); setDescription(''); setPrice('')
      setCountry(''); setCity('')
      setCategory(''); setSubcategory(''); setCondition('')
      setCroppedFiles([]); setCropQueue([])
      setShippingEnabled(false); setPackageSize(''); setPackageWeight('')
    }
  }

  const priceLabel = listingType === 'rent'
    ? rentalPeriods.find(p => p.value === rentalPeriod)?.label || 'Per day'
    : 'Price (€)'

  return (
    <div className="new-listing-page">
      <h1 className="new-listing-title">New listing</h1>

      {/* CROPPER MODAL */}
      {showCropper && cropQueue[cropIndex] && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <p style={{ color: '#f0ead8', fontFamily: 'Barlow Condensed', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Photo {cropIndex + 1} / {cropQueue.length} — Drag to crop
          </p>
          <div style={{ maxWidth: '90vw', maxHeight: '60vh', overflow: 'hidden' }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
              <img ref={imgRef} src={cropQueue[cropIndex].src} onLoad={onImageLoad} style={{ maxWidth: '80vw', maxHeight: '55vh', display: 'block' }} alt="crop" />
            </ReactCrop>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSkipCrop} style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f0ead8', border: '1px solid rgba(240,234,216,0.3)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Skip</button>
            <button onClick={handleCropConfirm} style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#cc4400', color: '#f0ead8', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Confirm crop</button>
          </div>
        </div>
      )}

      <div className="listing-type-toggle">
        <button className={`listing-type-btn ${listingType === 'sell' ? 'active' : ''}`} onClick={() => setListingType('sell')}>For sale</button>
        <button className={`listing-type-btn ${listingType === 'rent' ? 'active rent' : ''}`} onClick={() => setListingType('rent')}>For rent</button>
      </div>

      {listingType === 'rent' && (
        <div className="rental-period-section">
          <label className="form-label">Rental period</label>
          <div className="rental-period-grid">
            {rentalPeriods.map(period => (
              <button key={period.value} className={`rental-period-btn ${rentalPeriod === period.value ? 'active' : ''}`} onClick={() => setRentalPeriod(period.value)}>
                {period.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <input className="form-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="form-input form-textarea" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

      <div className="price-input-row">
        <input className="form-input" placeholder={priceLabel} value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ marginBottom: 0 }} />
        {listingType === 'rent' && (
          <span className="price-period-label">€ / {rentalPeriods.find(p => p.value === rentalPeriod)?.label.replace('Per ', '') || 'day'}</span>
        )}
      </div>

      <div className="location-row">
        <select className="form-input" value={country} onChange={e => setCountry(e.target.value)} style={{ marginBottom: 0 }}>
          <option value="">Select country</option>
          {europeanCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="form-input" placeholder="City" value={city} onChange={e => setCity(e.target.value)} style={{ marginBottom: 0 }} />
      </div>

      <select className="form-input" value={category} onChange={e => { setCategory(e.target.value); setSubcategory('') }}>
        <option value="">Select category</option>
        {Object.keys(categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>

      {category && (
        <select className="form-input" value={subcategory} onChange={e => setSubcategory(e.target.value)}>
          <option value="">Select subcategory</option>
          {categories[category].map(sub => <option key={sub} value={sub}>{sub}</option>)}
        </select>
      )}

      <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
        <option value="">Select condition</option>
        {conditions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* SHIPPING */}
      <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={shippingEnabled}
            onChange={e => setShippingEnabled(e.target.checked)}
            style={{ width: '18px', height: '18px', accentColor: '#FC7038' }}
          />
          <span style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408' }}>
            Offer shipping
          </span>
        </label>
        <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '6px', marginLeft: '28px' }}>
          Buyers can choose shipping at checkout. You'll receive a shipping label by email.
        </p>

        {shippingEnabled && (
          <div style={{ marginTop: '14px', marginLeft: '28px' }}>
            <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '10px' }}>
              Package size
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
              {packageSizes.map(size => (
                <button
                  key={size.value}
                  onClick={() => setPackageSize(size.value)}
                  style={{
                    fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    padding: '10px 8px', borderRadius: '8px', cursor: 'pointer',
                    border: packageSize === size.value ? '2px solid #FC7038' : '1px solid rgba(26,20,8,0.15)',
                    background: packageSize === size.value ? '#FC7038' : '#fff',
                    color: packageSize === size.value ? '#F5F3E6' : '#1a1408',
                    textAlign: 'center'
                  }}
                >
                  <div>{size.label}</div>
                  <div style={{ fontSize: '10px', fontWeight: 400, marginTop: '2px', opacity: 0.8 }}>{size.desc}</div>
                </button>
              ))}
            </div>
            <input
              className="form-input"
              type="number"
              placeholder="Weight in kg (e.g. 0.5)"
              value={packageWeight}
              onChange={e => setPackageWeight(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>
        )}
      </div>

      <div className="form-images">
        <label className="form-label">Photos (max 5)</label>
        <input type="file" accept="image/*" multiple onChange={handleImages} className="form-file" />
        {croppedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {croppedFiles.map((f, i) => (
              <img key={i} src={URL.createObjectURL(f)} style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.15)' }} alt="" />
            ))}
          </div>
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