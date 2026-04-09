'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
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
const ADMINS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

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
  const [loading, setLoading] = useState(false)
  const [existingImages, setExistingImages] = useState<string[]>([])

  // Crop state
  const [cropQueue, setCropQueue] = useState<{ file: File; src: string }[]>([])
  const [cropIndex, setCropIndex] = useState(0)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [newCroppedFiles, setNewCroppedFiles] = useState<File[]>([])
  const [showCropper, setShowCropper] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      const isAdmin = ADMINS.includes(user.email || '')
      supabase.from('listings').select('*').eq('id', params.id).single().then(({ data }) => {
        if (!data || (!isAdmin && data.user_id !== user.id)) { window.location.href = '/listings'; return }
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
        setExistingImages(data.images || [])
      })
    })
  }, [params.id])

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files).slice(0, 5 - existingImages.length)
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
      converted.push({ file: f, src: URL.createObjectURL(f) })
    }
    setCropQueue(converted)
    setCropIndex(0)
    setNewCroppedFiles([])
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
    const updated = [...newCroppedFiles, croppedFile]
    setNewCroppedFiles(updated)
    if (cropIndex + 1 < cropQueue.length) {
      setCropIndex(cropIndex + 1)
      setCrop(undefined)
    } else {
      setShowCropper(false)
    }
  }

  const handleSkipCrop = () => {
    const current = cropQueue[cropIndex]
    const updated = [...newCroppedFiles, current.file]
    setNewCroppedFiles(updated)
    if (cropIndex + 1 < cropQueue.length) {
      setCropIndex(cropIndex + 1)
      setCrop(undefined)
    } else {
      setShowCropper(false)
    }
  }

  const removeExistingImage = (url: string) => {
    setExistingImages(existingImages.filter(u => u !== url))
  }

  const handleSave = async () => {
    if (!country) { setMessage('Please select a country.'); return }
    if (!city.trim()) { setMessage('Please enter a city.'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    const newUrls: string[] = []
    for (const image of newCroppedFiles) {
      const filename = `${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage.from('listing-images').upload(filename, image)
      if (!error) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(filename)
        newUrls.push(data.publicUrl)
      }
    }

    const allImages = [...existingImages, ...newUrls]

    const { error } = await supabase.from('listings').update({
      title, description,
      price: parseInt(price),
      location: `${city}, ${country}`,
      country, city, category, subcategory, condition,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? rentalPeriod : null,
      images: allImages,
    }).eq('id', params.id)

    setLoading(false)
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Saved!')
      setTimeout(() => window.location.href = `/listings/${params.id}`, 1000)
    }
  }

  return (
    <div className="new-listing-page">

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

      <a href={`/listings/${params.id}`} className="listing-back">← Back to listing</a>
      <h1 className="new-listing-title" style={{ marginTop: '20px' }}>Edit listing</h1>

      <div className="listing-type-toggle">
        <button className={`listing-type-btn ${listingType === 'sell' ? 'active' : ''}`} onClick={() => setListingType('sell')}>For sale</button>
        <button className={`listing-type-btn ${listingType === 'rent' ? 'active rent' : ''}`} onClick={() => setListingType('rent')}>For rent</button>
      </div>

      {listingType === 'rent' && (
        <div className="rental-period-section">
          <label className="form-label">Rental period</label>
          <div className="rental-period-grid">
            {rentalPeriods.map(period => (
              <button key={period.value} className={`rental-period-btn ${rentalPeriod === period.value ? 'active' : ''}`} onClick={() => setRentalPeriod(period.value)}>{period.label}</button>
            ))}
          </div>
        </div>
      )}

      <input className="form-input" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="form-input form-textarea" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

      <div className="price-input-row">
        <input className="form-input" placeholder={listingType === 'rent' ? 'Rental price' : 'Price (€)'} value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ marginBottom: 0 }} />
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
          {(categories[category] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
        </select>
      )}

      <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
        <option value="">Select condition</option>
        {conditions.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* EXISTING IMAGES */}
      {existingImages.length > 0 && (
        <div className="form-images">
          <label className="form-label">Current photos</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {existingImages.map((url, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={url} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.15)' }} alt="" />
                <button onClick={() => removeExistingImage(url)} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#aa2200', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NEW IMAGES */}
      <div className="form-images">
        <label className="form-label">Add photos {existingImages.length > 0 ? `(${5 - existingImages.length} more allowed)` : '(max 5)'}</label>
        <input type="file" accept="image/*" multiple onChange={handleImages} className="form-file" />
        {newCroppedFiles.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
            {newCroppedFiles.map((f, i) => (
              <img key={i} src={URL.createObjectURL(f)} style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.15)' }} alt="" />
            ))}
          </div>
        )}
      </div>

      <button className="form-submit" onClick={handleSave} disabled={loading}>
        {loading ? 'Saving...' : 'Save changes'}
      </button>

      {message && (
        <p className={`form-message ${message.startsWith('Error') || message.startsWith('Please') ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </div>
  )
}