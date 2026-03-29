'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAIL = 'samuel.trimarchi@icloud.com'

const categoryKeys = ['gear', 'shoes', 'clothing', 'wall']
const categoryLabels: Record<string, string> = {
  gear: 'Gear',
  shoes: 'Shoes',
  clothing: 'Clothing',
  wall: 'Wall equipment',
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoMessage, setLogoMessage] = useState('')
  const [heroFile, setHeroFile] = useState<File | null>(null)
  const [heroPreview, setHeroPreview] = useState<string>('')
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroMessage, setHeroMessage] = useState('')
  const [catFiles, setCatFiles] = useState<Record<string, File | null>>({})
  const [catPreviews, setCatPreviews] = useState<Record<string, string>>({})
  const [catUploading, setCatUploading] = useState<Record<string, boolean>>({})
  const [catMessages, setCatMessages] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email === ADMIN_EMAIL) {
        setAuthorized(true)
      } else {
        setAuthorized(false)
      }
    })
  }, [])

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
    if (error) setLogoMessage('Error: ' + error.message)
    else setLogoMessage('Logo updated! Refresh the page to see it.')
  }

  const handleHeroFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setHeroFile(file)
    setHeroPreview(URL.createObjectURL(file))
  }

  const uploadHero = async () => {
    if (!heroFile) return
    setHeroUploading(true)
    setHeroMessage('')
    const { error } = await supabase.storage.from('hero-image').upload('hero.jpg', heroFile, { upsert: true })
    setHeroUploading(false)
    if (error) setHeroMessage('Error: ' + error.message)
    else setHeroMessage('Hero image updated!')
  }

  const handleCatFile = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCatFiles(prev => ({ ...prev, [key]: file }))
    setCatPreviews(prev => ({ ...prev, [key]: URL.createObjectURL(file) }))
  }

  const uploadCat = async (key: string) => {
    const file = catFiles[key]
    if (!file) return
    setCatUploading(prev => ({ ...prev, [key]: true }))
    setCatMessages(prev => ({ ...prev, [key]: '' }))
    const { error } = await supabase.storage.from('category-images').upload(`${key}.jpg`, file, { upsert: true })
    setCatUploading(prev => ({ ...prev, [key]: false }))
    if (error) setCatMessages(prev => ({ ...prev, [key]: 'Error: ' + error.message }))
    else setCatMessages(prev => ({ ...prev, [key]: 'Updated!' }))
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
      <h1 className="admin-title">Image management</h1>
      <p className="admin-subtitle">Upload images for the logo, homepage hero and category cards.</p>

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

      <div className="admin-section">
        <h2 className="admin-section-title">Hero image</h2>
        <p className="admin-section-desc">Recommended size: 1600 × 700 px</p>
        <div className="admin-upload-row">
          {heroPreview && <img src={heroPreview} alt="Hero preview" className="admin-preview admin-preview-hero" />}
          <div className="admin-upload-controls">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleHeroFile} className="form-file" />
            <button className="form-submit" style={{ width: 'auto', padding: '10px 24px', marginTop: '12px' }} onClick={uploadHero} disabled={!heroFile || heroUploading}>
              {heroUploading ? 'Uploading...' : 'Upload hero image'}
            </button>
            {heroMessage && <p className={`form-message ${heroMessage.startsWith('Error') ? 'error' : 'success'}`}>{heroMessage}</p>}
          </div>
        </div>
      </div>

      <div className="admin-section">
        <h2 className="admin-section-title">Category images</h2>
        <p className="admin-section-desc">Portrait images — recommended size: 800 × 1100 px</p>
        <div className="admin-cat-grid">
          {categoryKeys.map(key => (
            <div key={key} className="admin-cat-card">
              <div className="admin-cat-label">{categoryLabels[key]}</div>
              {catPreviews[key] ? (
                <img src={catPreviews[key]} alt={key} className="admin-preview admin-preview-cat" />
              ) : (
                <div className="admin-preview-placeholder">No image</div>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleCatFile(key, e)} className="form-file" style={{ marginTop: '10px' }} />
              <button className="form-submit" style={{ width: '100%', marginTop: '10px', padding: '10px' }} onClick={() => uploadCat(key)} disabled={!catFiles[key] || catUploading[key]}>
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