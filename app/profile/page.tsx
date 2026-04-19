'use client'
import { useEffect, useState, useRef } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { createClient } from '@/utils/supabase/client'
import { SUPPORTED_COUNTRIES } from '@/app/lib/countries'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [usernameSet, setUsernameSet] = useState(false)
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [country, setCountry] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressPostcode, setAddressPostcode] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [message, setMessage] = useState('')
  const [listings, setListings] = useState<any[]>([])
  const [favorites, setFavorites] = useState<any[]>([])
  const [stripeOnboarded, setStripeOnboarded] = useState<boolean | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Profile page customization
  const [bio, setBio] = useState('')
  const [heroUrl, setHeroUrl] = useState('')
  const [heroUploading, setHeroUploading] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

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

      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(async ({ data }) => {
        // If profile is missing or username not set, restore from auth metadata
        const metaUsername = user.user_metadata?.username || ''
        if (!data || !data.username) {
          if (metaUsername) {
            await supabase.from('profiles').upsert(
              { user_id: user.id, username: metaUsername },
              { onConflict: 'user_id' }
            )
            setUsername(metaUsername)
            setUsernameSet(true)
          }
        }
        if (data) {
          setUsername(data.username || metaUsername)
          setUsernameSet(!!(data.username || metaUsername))
          setFullName(data.full_name || '')
          setLocation(data.location || '')
          setCountry(data.country || '')
          setAvatarUrl(data.avatar_url || '')
          setBio(data.bio || '')
          setHeroUrl(data.hero_url || '')
          setAddressStreet(data.address_street || '')
          setAddressPostcode(data.address_postcode || '')
          setAddressCity(data.address_city || '')
          setPhone(data.phone || '')
        }

        // Check Stripe status
        fetch('/api/stripe/status')
          .then(r => r.json())
          .then(({ verified }) => setStripeOnboarded(verified))
      })

      supabase.from('listings').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        setListings(data || [])
      })

      supabase.from('favorites').select('listing_id').eq('user_id', user.id).order('created_at', { ascending: false }).then(async ({ data: favData }) => {
        const ids = (favData || []).map((f: any) => f.listing_id)
        if (ids.length === 0) return
        const { data: listingData } = await supabase.from('listings').select('*').in('id', ids)
        setFavorites(listingData || [])
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
        location,
        country: country || null,
        bio: bio.trim() || null,
        address_street: addressStreet.trim() || null,
        address_postcode: addressPostcode.trim() || null,
        address_city: addressCity.trim() || null,
        address_country: 'FI',
        phone: phone.trim() || null,
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

  const handleConnectStripe = async () => {
    setStripeLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else setMessage(error || 'Something went wrong.')
    } catch {
      setMessage('Something went wrong.')
    }
    setStripeLoading(false)
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

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setHeroUploading(true)
    const path = `avatars/${user.id}_hero.jpg`
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      await supabase.from('profiles').upsert({ user_id: user.id, hero_url: url }, { onConflict: 'user_id' })
      setHeroUrl(url)
    }
    setHeroUploading(false)
  }

  if (!user) return <p className="listing-loading">Loading...</p>

  return (
    <>
      {/* HERO */}
      <div className="seller-hero-wrap">
        <div className="seller-hero">
          {heroUrl && <img src={heroUrl} alt="Cover" className="seller-hero-img" />}
          <div className="seller-hero-gradient" />
        </div>
        <div className="seller-hero-av-wrap">
          <div style={{ position: 'relative' }} onClick={() => fileInputRef.current?.click()}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Avatar" className="seller-hero-av" style={{ cursor: 'pointer' }} />
              : <div className="seller-hero-av-placeholder" style={{ cursor: 'pointer' }}>{(fullName || username || '?')[0].toUpperCase()}</div>
            }
            <div className="seller-hero-av-edit">✏️</div>
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />

      <div className="profile-page" style={{ paddingTop: '72px' }}>

        {/* NAME ROW */}
        <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid rgba(26,20,8,0.1)' }}>
          <h1 className="profile-name">{fullName || username || 'Your profile'}</h1>
          <p className="profile-email" style={{ fontSize: '12px', color: '#b0a898' }}>{user.email} <span style={{ opacity: 0.6 }}>· used for login and notifications · not visible to other users</span></p>
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

          <select
            className="form-input"
            value={country}
            onChange={e => setCountry(e.target.value)}
            style={{ color: country ? '#1a1408' : '#9a9080' }}
          >
            <option value="">Country</option>
            {SUPPORTED_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input className="form-input" placeholder="City" value={location} onChange={e => setLocation(e.target.value)} />
          <button className="form-submit" onClick={handleSave}>Save changes</button>
          {message && (
            <p className={`form-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>
          )}

          {/* PROFILE PAGE CUSTOMIZATION */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Profile page</h2>

            {/* HERO IMAGE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7060', margin: 0 }}>Cover image</p>
              <p style={{ fontSize: '11px', color: '#b0a898', margin: 0 }}>Recommended: 1920 × 400 px</p>
            </div>
            <div
              onClick={() => heroInputRef.current?.click()}
              style={{ width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', background: heroUrl ? 'transparent' : '#e8e0d0', border: '2px dashed rgba(26,20,8,0.15)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px', position: 'relative' }}
            >
              {heroUrl ? (
                <>
                  <img src={heroUrl} alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
                      {heroUploading ? 'Uploading...' : 'Change cover'}
                    </span>
                  </div>
                </>
              ) : (
                <span style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9a9080' }}>
                  {heroUploading ? 'Uploading...' : '+ Add cover image'}
                </span>
              )}
            </div>
            <input ref={heroInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHeroUpload} />

            <textarea
              className="form-input"
              placeholder="Bio — tell something about yourself (optional)"
              value={bio}
              onChange={e => setBio(e.target.value)}
              style={{ resize: 'vertical', minHeight: '80px', fontFamily: 'Barlow', fontSize: '14px', marginTop: '12px' }}
            />
            <button className="form-submit" onClick={handleSave} style={{ marginTop: '10px' }}>Save changes</button>
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Shipping address</h2>
            <p style={{ fontSize: '12px', color: '#9a9080', marginBottom: '14px', lineHeight: 1.5 }}>
              Näkyy lähetystietoina pakettitarrassa. Pakollinen ennen ilmoituksen julkaisua.
            </p>
            <input className="form-input" placeholder="Katuosoite *" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
              <input className="form-input" placeholder="Postinumero *" value={addressPostcode} onChange={e => setAddressPostcode(e.target.value)} style={{ marginBottom: 0 }} />
              <input className="form-input" placeholder="Kaupunki *" value={addressCity} onChange={e => setAddressCity(e.target.value)} style={{ marginBottom: 0 }} />
            </div>
            <input className="form-input" placeholder="Puhelinnumero * (+358...)" value={phone} onChange={e => setPhone(e.target.value)} style={{ marginTop: '10px' }} />
            <div style={{ background: '#f0ede3', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '6px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#7a7060' }}>
              🇫🇮 Maa: Suomi (toistaiseksi vain suomalaiset myyjät)
            </div>
            <button className="form-submit" onClick={handleSave}>Tallenna</button>
            {message && (
              <p className={`form-message ${message.startsWith('Error') ? 'error' : 'success'}`}>{message}</p>
            )}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(26,20,8,0.1)' }}>
            <h2 className="profile-section-title">Payments</h2>
            {stripeOnboarded === null ? (
              <p style={{ fontSize: '13px', color: '#9a9080' }}>Checking payment status...</p>
            ) : stripeOnboarded ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#e6f4ea', border: '1px solid #a8d5b0', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>✅</span>
                <div>
                  <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a4a2a', margin: 0 }}>Stripe verified</p>
                  <p style={{ fontSize: '12px', color: '#3a7a4a', margin: '2px 0 0' }}>Your account is set up to receive payments.</p>
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#7a7060', lineHeight: '1.5', marginBottom: '16px' }}>
                  Connect your Stripe account to receive payments when you sell items. This is a one-time setup — you only need to do it once.
                </p>
                <button className="form-submit" onClick={handleConnectStripe} disabled={stripeLoading}>
                  {stripeLoading ? 'Redirecting...' : 'Connect Stripe →'}
                </button>
              </>
            )}
            {stripeOnboarded && (
              <button
                onClick={handleConnectStripe}
                disabled={stripeLoading}
                style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'transparent', color: '#9a9080', border: '1px solid rgba(26,20,8,0.15)', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', marginTop: '8px' }}
              >
                {stripeLoading ? 'Redirecting...' : 'Manage Stripe account'}
              </button>
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

        {/* RIGHT COLUMN: MY LISTINGS + SAVED ITEMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          {/* SAVED ITEMS */}
          <div className="profile-section">
            <h2 className="profile-section-title">Saved items</h2>
            {favorites.length === 0 && <p className="profile-empty">No saved items yet. Tap ★ on any listing to save it.</p>}
            <div className="profile-listings">
              {favorites.map((listing: any) => (
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
                        {listing.price} €{listing.listing_type === 'rent' ? '/day' : ''}{listing.location ? ` · ${listing.location}` : ''}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
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
    </div>
    </>
  )
}