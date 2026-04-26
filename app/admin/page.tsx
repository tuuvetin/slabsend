'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']
const categoryKeys = ['gear', 'shoes', 'clothing', 'wall', 'crashpads']
const categoryLabels: Record<string, string> = {
  gear: 'Gear', shoes: 'Shoes', clothing: 'Clothing', wall: 'Wall equipment', crashpads: 'Crash pads',
}

function centerAspectCrop(width: number, height: number, aspect: number) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height)
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

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMessage, setLogoMessage] = useState('')
  const [catMessages, setCatMessages] = useState<Record<string, string>>({})
  const [catUploading, setCatUploading] = useState<Record<string, boolean>>({})

  // Cropper state
  const [cropSrc, setCropSrc] = useState<string>('')
  const [cropAspect, setCropAspect] = useState<number>(1)
  const [cropTarget, setCropTarget] = useState<string>('') // 'hero' | cat key
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [showCropper, setShowCropper] = useState(false)
  const [croppedPreviews, setCroppedPreviews] = useState<Record<string, string>>({})
  const [croppedBlobs, setCroppedBlobs] = useState<Record<string, Blob>>({})
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroMessage, setHeroMessage] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthorized(!!(user && ADMIN_EMAILS.includes(user.email || '')))
    })
  }, [])

  const openCropper = (file: File, target: string, aspect: number) => {
    const src = URL.createObjectURL(file)
    setCropSrc(src)
    setCropTarget(target)
    setCropAspect(aspect)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setShowCropper(true)
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, cropAspect))
  }

  const handleCropConfirm = async () => {
    if (!imgRef.current || !completedCrop) return
    const blob = await getCroppedBlob(imgRef.current, completedCrop)
    const previewUrl = URL.createObjectURL(blob)
    setCroppedPreviews(prev => ({ ...prev, [cropTarget]: previewUrl }))
    setCroppedBlobs(prev => ({ ...prev, [cropTarget]: blob }))
    setShowCropper(false)
  }

  const handleSkipCrop = () => {
    const img = imgRef.current
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const previewUrl = URL.createObjectURL(blob)
      setCroppedPreviews(prev => ({ ...prev, [cropTarget]: previewUrl }))
      setCroppedBlobs(prev => ({ ...prev, [cropTarget]: blob }))
    }, 'image/jpeg', 0.92)
    setShowCropper(false)
  }

  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const uploadLogo = async () => {
    if (!logoFile) return
    setLogoUploading(true)
    setLogoMessage('')
    const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png'
    const { error } = await supabase.storage.from('logo').upload(`logo.${ext}`, logoFile, { upsert: true })
    setLogoUploading(false)
    setLogoMessage(error ? 'Error: ' + error.message : 'Logo updated! Refresh to see it.')
  }

  const uploadHero = async () => {
    const blob = croppedBlobs['hero']
    if (!blob) return
    setHeroUploading(true)
    setHeroMessage('')
    const file = new File([blob], 'hero.jpg', { type: 'image/jpeg' })
    const { error } = await supabase.storage.from('hero-image').upload('hero.jpg', file, { upsert: true, cacheControl: '1' })
    setHeroUploading(false)
    if (error) { setHeroMessage('Error: ' + error.message); return }
    setHeroMessage('Hero image updated! Refresh the front page to see it.')
  }

  
  const uploadCat = async (key: string) => {
    const blob = croppedBlobs[key]
    if (!blob) return
    setCatUploading(prev => ({ ...prev, [key]: true }))
    setCatMessages(prev => ({ ...prev, [key]: '' }))
    const file = new File([blob], `${key}.jpg`, { type: 'image/jpeg' })
    const { error } = await supabase.storage.from('category-images').upload(`${key}.jpg`, file, { upsert: true, cacheControl: '1' })
    setCatUploading(prev => ({ ...prev, [key]: false }))
    setCatMessages(prev => ({ ...prev, [key]: error ? 'Error: ' + error.message : 'Updated! Refresh the front page to see it.' }))
  }

  if (authorized === null) return <p className="listing-loading">Loading...</p>

  if (!authorized) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', textAlign: 'center', padding: '32px' }}>
        <h1 className="new-listing-title">Access denied</h1>
        <p style={{ color: '#9a9080', marginTop: '12px' }}>You don't have permission to view this page.</p>
        <a href="/" className="sb-btn-sell" style={{ display: 'inline-block', marginTop: '24px' }}>Go home</a>
      </div>
    )
  }

  return (
    <div className="admin-page">

      {/* CROPPER MODAL */}
      {showCropper && cropSrc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 1000, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <p style={{ color: '#f0ead8', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Drag to crop — {cropTarget === 'hero' ? 'Hero image' : categoryLabels[cropTarget]}
          </p>
          <div style={{ maxWidth: '90vw', maxHeight: '60vh', overflow: 'hidden' }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={cropAspect}>
              <img ref={imgRef} src={cropSrc} onLoad={onImageLoad} style={{ maxWidth: '80vw', maxHeight: '55vh', display: 'block' }} alt="crop" />
            </ReactCrop>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSkipCrop} style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f0ead8', border: '1px solid rgba(240,234,216,0.3)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Skip</button>
            <button onClick={handleCropConfirm} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#cc4400', color: '#f0ead8', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Confirm crop</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <a href="/admin/orders" style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#FC7038', color: '#fff', padding: '9px 18px', borderRadius: 6, textDecoration: 'none' }}>Orders →</a>
      </div>

      <h1 className="admin-title">Image management</h1>
      <p className="admin-subtitle">Upload images for the logo, homepage hero and category cards.</p>

      {/* LOGO */}
      <div className="admin-section">
        <h2 className="admin-section-title">Logo</h2>
        <p className="admin-section-desc">Recommended: PNG with transparent background, 640 × 160 px.</p>
        <div className="admin-upload-row">
          {logoPreview && (
            <div style={{ background: '#e8e0d0', padding: '12px', borderRadius: '8px', border: '1px solid rgba(26,20,8,0.1)' }}>
              <img src={logoPreview} alt="Logo preview" style={{ height: '40px', display: 'block' }} />
            </div>
          )}
          <div className="admin-upload-controls">
            <input type="file" accept="image/png,image/svg+xml,image/webp" onChange={handleLogoFile} className="form-file" />
            <button className="form-submit" style={{ width: 'auto', padding: '10px 24px', marginTop: '12px' }} onClick={uploadLogo} disabled={!logoFile || logoUploading}>
              {logoUploading ? 'Uploading...' : 'Upload logo'}
            </button>
            {logoMessage && <p className={`form-message ${logoMessage.startsWith('Error') ? 'error' : 'success'}`}>{logoMessage}</p>}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div className="admin-section">
        <h2 className="admin-section-title">Hero image</h2>
        <p className="admin-section-desc">Recommended size: 1600 × 700 px. Select a file to crop before uploading.</p>
        <div className="admin-upload-row">
          {croppedPreviews['hero'] && (
            <img src={croppedPreviews['hero']} alt="Hero preview" className="admin-preview admin-preview-hero" />
          )}
          <div className="admin-upload-controls">
            <input type="file" accept="image/jpeg,image/png,image/webp" className="form-file"
              onChange={e => { const f = e.target.files?.[0]; if (f) openCropper(f, 'hero', 16/7) }} />
            <button className="form-submit" style={{ width: 'auto', padding: '10px 24px', marginTop: '12px' }} onClick={uploadHero} disabled={!croppedBlobs['hero'] || heroUploading}>
              {heroUploading ? 'Uploading...' : 'Upload hero image'}
            </button>
            {heroMessage && <p className={`form-message ${heroMessage.startsWith('Error') ? 'error' : 'success'}`}>{heroMessage}</p>}
          </div>
        </div>
      </div>

      {/* CATEGORIES */}
      <div className="admin-section">
        <h2 className="admin-section-title">Category images</h2>
        <p className="admin-section-desc">Square images — select a file to crop before uploading.</p>
        <div className="admin-cat-grid">
          {categoryKeys.map(key => (
            <div key={key} className="admin-cat-card">
              <div className="admin-cat-label">{categoryLabels[key]}</div>
              {croppedPreviews[key] ? (
                <img src={croppedPreviews[key]} alt={key} className="admin-preview admin-preview-cat" />
              ) : (
                <div className="admin-preview-placeholder">No image</div>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="form-file" style={{ marginTop: '10px' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) openCropper(f, key, 1) }} />
              <button className="form-submit" style={{ width: '100%', marginTop: '10px', padding: '10px' }} onClick={() => uploadCat(key)} disabled={!croppedBlobs[key] || catUploading[key]}>
                {catUploading[key] ? 'Uploading...' : 'Upload'}
              </button>
              {catMessages[key] && <p className={`form-message ${catMessages[key].startsWith('Error') ? 'error' : 'success'}`}>{catMessages[key]}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}