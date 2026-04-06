'use client'
import { useEffect, useState, useRef } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { createClient } from '@/utils/supabase/client'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [usernameSet, setUsernameSet] = useState(false)
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [message, setMessage] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [bankName, setBankName] = useState('')
  const [bankIban, setBankIban] = useState('')
  const [bankBic, setBankBic] = useState('')
  const [bankCountry, setBankCountry] = useState('')
  const [bankMessage, setBankMessage] = useState('')
  const [bankSaving, setBankSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Crop
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<any>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)

      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setUsername(data.username || '')
          setUsernameSet(!!data.username)
          setFullName(data.full_name || '')
          setLocation(data.location || '')
          setAvatarUrl(data.avatar_url || '')
          setBankName(data.bank_name || '')
          setBankIban(data.bank_iban || '')
          setBankBic(data.bank_bic || '')
          setBankCountry(data.bank_country || '')
        }
      })

      supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        setListings(data || [])
      })
    })
  }, [])

  const handleSave = async () => {
    if (!user) return

    // Tarkistetaan onko username jo otettu
    if (!usernameSet && username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .neq('user_id', user.id)
        .single()

      if (existing) {
        setMessage('Error: Username is already taken')
        return
      }
    }

    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        username: usernameSet ? username : username,
        full_name: fullName,
        location
      },
      { onConflict: 'user_id' }
    )
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Profile saved!')
      if (username) setUsernameSet(true)
    }
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) { setPasswordMessage('Password must be at least 6 characters'); return }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) setPasswordMessage('Error: ' + error.message)
    else { setPasswordMessage('Password updated!'); setNewPassword('') }
  }

  const handleSaveBank = async () => {
    if (!user) return
    setBankSaving(true)
    const { error } = await supabase.from('profiles').upsert(
      { user_id: user.id, bank_name: bankName, bank_iban: bankIban.replace(/\s/g, '').toUpperCase(), bank_bic: bankBic.replace(/\s/g, '').toUpperCase(), bank_country: bankCountry },
      { onConflict: 'user_id' }
    )
    setBankSaving(false)
    if (error) setBankMessage('Error: ' + error.message)
    else setBankMessage('Bank details saved!')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCropSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget
    const c = centerCrop(
      makeAspectCrop({ unit: '%', width: 80 }, 1, width, height),
      width, height
    )
    setCrop(c)
  }

  const getCroppedBlob = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = imgRef.current
      if (!image || !completedCrop) return reject('No crop')
      const canvas = document.createElement('canvas')
      const size = 400
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')!
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.clip()
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0, 0, size, size
      )
      canvas.toBlob(blob => blob ? resolve(blob) : reject('Canvas empty'), 'image/jpeg', 0.9)
    })
  }

  const handleAvatarUpload = async () => {
    if (!user || !completedCrop) return
    setAvatarUploading(true)
    try {
      const blob = await getCroppedBlob()
      const path = `avatars/${user.id}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithCache = `${publicUrl}?t=${Date.now()}`

      const { error: updateError } = await supabase.from('profiles').upsert(
        { user_id: user.id, avatar_url: urlWithCache },
        { onConflict: 'user_id' }
      )
      if (updateError) throw updateError

      setAvatarUrl(urlWithCache)
      setCropSrc(null)
      setMessage('Profile picture updated!')
    } catch (err: any) {
      setMessage('Error uploading avatar: ' + (err.message || err))
    }
    setAvatarUploading(false)
  }

  if (!user) return <p className="listing-loading">Loading...</p>

  return (
    <div className="profile-page">

      <div className="profile-header">
        <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(26,20,8,0.1)' }} />
          ) : (
            <div className="profile-avatar">
              {(fullName || user.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#FC7038', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #F5F3E6', fontSize: '11px' }}>✏️</div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

        <div>
          <h1 className="profile-name">{fullName || username || 'Your profile'}</h1>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      {/* CROP-TYÖKALU */}
      {cropSrc && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '12px', padding: '20px', marginBottom: '24px', maxWidth: '480px' }}>
          <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
            Crop profile picture
          </p>
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
            <img ref={imgRef} src={cropSrc} onLoad={onImageLoad} style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain' }} alt="crop" />
          </ReactCrop>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button className="form-submit" onClick={handleAvatarUpload} disabled={avatarUploading} style={{ flex: 1 }}>
              {avatarUploading ? 'Uploading...' : 'Save picture'}
            </button>
            <button onClick={() => setCropSrc(null)} style={{ flex: 1, fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', background: 'transparent', color: '#7a7060', border: '1px solid rgba(26,20,8,0.15)', borderRadius: '8px', padding: '14px' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="profile-grid">

        {/* SETTINGS */}
        <div className="profile-section">
          <h2 className="profile-section-title">Account settings</h2>

          {/* USERNAME — lukittu jos jo asetettu */}
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              placeholder="Username"
              value={username}
              onChange={e => !usernameSet && setUsername(e.target.value)}
              readOnly={usernameSet}
              style={{ opacity: usernameSet ? 0.6 : 1, cursor: usernameSet ? 'not-allowed' : 'text' }}
            />
            {usernameSet && (
              <p style={{ fontSize: '11px', color: '#9a9080', marginTop: '-8px', marginBottom: '12px' }}>
                Username cannot be changed after it's set.
              </p>
            )}
          </div>

          <input className="form-input" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
          <input className="form-input" placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
          <button className="form-submit" onClick={handleSave}>Save changes</button>
          {message && (
            <p className={`form-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>
          )}

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Bank account for payouts</h2>
            <p style={{ fontSize: '13px', color: '#7a7060', lineHeight: '1.5', marginBottom: '16px' }}>
              When you sell an item, we'll transfer your payment to the bank account below. If you have any questions, email us at <a href="mailto:info@slabsend.com" style={{ color: '#FC7038' }}>info@slabsend.com</a>
            </p>

            <input
              className="form-input"
              placeholder="Full name (account holder)"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
            />
            <input
              className="form-input"
              placeholder="IBAN (e.g. FI21 1234 5600 0007 85)"
              value={bankIban}
              onChange={e => setBankIban(e.target.value)}
              style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
            />
            <input
              className="form-input"
              placeholder="BIC / SWIFT code (e.g. OKOYFIHH)"
              value={bankBic}
              onChange={e => setBankBic(e.target.value)}
              style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
            />
            <input
              className="form-input"
              placeholder="Country (e.g. Finland)"
              value={bankCountry}
              onChange={e => setBankCountry(e.target.value)}
            />

            <button className="form-submit" onClick={handleSaveBank} disabled={bankSaving}>
              {bankSaving ? 'Saving...' : 'Save bank details'}
            </button>
            {bankMessage && (
              <p className={`form-message ${bankMessage.startsWith('Error') ? 'error' : 'success'}`}>{bankMessage}</p>
            )}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Change password</h2>
            <input
              className="form-input"
              type="password"
              placeholder="New password (min. 6 characters)"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            <button className="form-submit" onClick={handleChangePassword} disabled={passwordSaving}>
              {passwordSaving ? 'Saving...' : 'Update password'}
            </button>
            {passwordMessage && (
              <p className={`form-message ${passwordMessage.startsWith('Error') ? 'error' : 'success'}`}>{passwordMessage}</p>
            )}
          </div>

          <button className="profile-signout-btn" onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}>
            Sign out
          </button>
        </div>

        {/* MY LISTINGS */}
        <div className="profile-section">
          <h2 className="profile-section-title">My listings</h2>
          {listings.length === 0 && <p className="profile-empty">No listings yet.</p>}
          <div className="profile-listings">
            {listings.map(listing => (
              <a key={listing.id} href={`/listings/${listing.id}`} className="profile-listing-link">
                <div className="profile-listing-card">
                  {listing.images && listing.images.length > 0 ? (
                    <img src={listing.images[0]} alt={listing.title} className="profile-listing-img" />
                  ) : (
                    <div className="profile-listing-no-img" />
                  )}
                  <div className="profile-listing-info">
                    <p className="profile-listing-title">{listing.title}</p>
                    <p className="profile-listing-meta">
                      {listing.price} €{listing.listing_type === 'rent' ? '/day' : ''} · {listing.location}
                    </p>
                    {listing.listing_type === 'rent' && (
                      <span className="listing-rental-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>For rent</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}