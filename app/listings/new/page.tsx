'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

type StripeStatus = 'idle' | 'checking' | 'verified' | 'unverified'

const categories: Record<string, string[]> = {
  'Clothing': ['T-Shirts', 'Hoodies', 'Pants', 'Shorts', 'Jackets', 'Other clothing'],
  'Shoes': ['Climbing shoes', 'Approach shoes', 'Mountain boots', 'Other shoes'],
  'Gear': ['Harnesses', 'Ropes', 'Alpine climbing', 'Ice climbing', 'Helmets', 'Crash pads', 'Chalk bags & brushes', 'Training equipment', 'Other gear'],
  'Wall equipment': ['Climbing holds', 'Safety mats', 'Wall materials'],
}

const serviceTypeOptions = [
  'Shoe resoling',
  'Gear repair',
  'Harness inspection',
  'Rope inspection',
  'Gear cleaning',
  'Custom alterations',
  'General service',
  'Other',
]

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

const citiesByCountry: Record<string, string[]> = {
  'Austria': ['Vienna','Graz','Linz','Salzburg','Innsbruck','Klagenfurt','Villach','Wels','St. Pölten','Dornbirn'],
  'Belgium': ['Brussels','Antwerp','Ghent','Charleroi','Liège','Bruges','Namur','Leuven','Mons','Mechelen'],
  'Bulgaria': ['Sofia','Plovdiv','Varna','Burgas','Ruse','Stara Zagora','Pleven','Sliven','Dobrich','Shumen'],
  'Croatia': ['Zagreb','Split','Rijeka','Osijek','Zadar','Slavonski Brod','Pula','Karlovac','Varaždin','Šibenik'],
  'Cyprus': ['Nicosia','Limassol','Larnaca','Famagusta','Paphos','Kyrenia'],
  'Czech Republic': ['Prague','Brno','Ostrava','Plzeň','Liberec','Olomouc','Ústí nad Labem','České Budějovice','Hradec Králové','Pardubice'],
  'Denmark': ['Copenhagen','Aarhus','Odense','Aalborg','Esbjerg','Randers','Kolding','Horsens','Vejle','Roskilde'],
  'Estonia': ['Tallinn','Tartu','Narva','Pärnu','Kohtla-Järve','Viljandi','Rakvere','Maardu','Sillamäe','Kuressaare'],
  'Finland': ['Helsinki','Espoo','Tampere','Vantaa','Oulu','Turku','Jyväskylä','Lahti','Kuopio','Kouvola','Pori','Joensuu','Lappeenranta','Hämeenlinna','Vaasa','Rovaniemi','Seinäjoki','Mikkeli','Kotka','Salo'],
  'France': ['Paris','Marseille','Lyon','Toulouse','Nice','Nantes','Montpellier','Strasbourg','Bordeaux','Lille','Rennes','Reims','Le Havre','Saint-Étienne','Toulon','Grenoble','Dijon','Angers','Nîmes','Villeurbanne'],
  'Germany': ['Berlin','Hamburg','Munich','Cologne','Frankfurt','Stuttgart','Düsseldorf','Leipzig','Dortmund','Essen','Bremen','Dresden','Hanover','Nuremberg','Duisburg','Bochum','Wuppertal','Bielefeld','Bonn','Münster'],
  'Greece': ['Athens','Thessaloniki','Patras','Heraklion','Larissa','Volos','Rhodes','Ioannina','Chania','Chalcis'],
  'Hungary': ['Budapest','Debrecen','Miskolc','Szeged','Pécs','Győr','Nyíregyháza','Kecskemét','Székesfehérvár','Szombathely'],
  'Iceland': ['Reykjavik','Akureyri','Keflavik','Selfoss','Akranes','Ísafjörður'],
  'Ireland': ['Dublin','Cork','Limerick','Galway','Waterford','Drogheda','Dundalk','Swords','Bray','Navan'],
  'Italy': ['Rome','Milan','Naples','Turin','Palermo','Genoa','Bologna','Florence','Bari','Catania','Venice','Verona','Messina','Padua','Trieste','Taranto','Brescia','Parma','Prato','Modena'],
  'Latvia': ['Riga','Daugavpils','Liepāja','Jelgava','Jūrmala','Ventspils','Rēzekne','Valmiera'],
  'Liechtenstein': ['Vaduz','Schaan','Balzers','Triesen'],
  'Lithuania': ['Vilnius','Kaunas','Klaipėda','Šiauliai','Panevėžys','Alytus','Marijampolė','Mažeikiai'],
  'Luxembourg': ['Luxembourg City','Esch-sur-Alzette','Differdange','Dudelange','Ettelbruck'],
  'Malta': ['Valletta','Birkirkara','Mosta','Qormi','Naxxar','Żabbar','San Ġwann','Fgura'],
  'Netherlands': ['Amsterdam','Rotterdam','The Hague','Utrecht','Eindhoven','Tilburg','Groningen','Almere','Breda','Nijmegen','Leiden','Maastricht'],
  'Norway': ['Oslo','Bergen','Trondheim','Stavanger','Drammen','Fredrikstad','Kristiansand','Tromsø','Sandnes','Ålesund'],
  'Poland': ['Warsaw','Kraków','Łódź','Wrocław','Poznań','Gdańsk','Szczecin','Bydgoszcz','Lublin','Białystok','Katowice','Gdynia','Częstochowa','Radom','Toruń'],
  'Portugal': ['Lisbon','Porto','Vila Nova de Gaia','Amadora','Braga','Coimbra','Funchal','Setúbal','Almada','Agualva-Cacém'],
  'Romania': ['Bucharest','Cluj-Napoca','Timișoara','Iași','Constanța','Craiova','Brașov','Galați','Ploiești','Oradea'],
  'Slovakia': ['Bratislava','Košice','Prešov','Žilina','Nitra','Banská Bystrica','Trnava','Martin','Trenčín','Poprad'],
  'Slovenia': ['Ljubljana','Maribor','Celje','Kranj','Velenje','Koper','Novo Mesto','Ptuj'],
  'Spain': ['Madrid','Barcelona','Valencia','Seville','Zaragoza','Málaga','Murcia','Palma','Las Palmas','Bilbao','Alicante','Córdoba','Valladolid','Vigo','Gijón','Hospitalet','Granada','Vitoria','La Coruña','Elche'],
  'Sweden': ['Stockholm','Gothenburg','Malmö','Uppsala','Västerås','Örebro','Linköping','Helsingborg','Jönköping','Norrköping','Lund','Umeå','Gävle','Borås','Södertälje'],
  'Switzerland': ['Zurich','Geneva','Basel','Bern','Lausanne','Winterthur','Lucerne','St. Gallen','Lugano','Biel'],
  'United Kingdom': ['London','Birmingham','Leeds','Glasgow','Sheffield','Bradford','Edinburgh','Liverpool','Manchester','Bristol','Wakefield','Cardiff','Coventry','Nottingham','Leicester','Aberdeen','Belfast','Newcastle','Brighton','Plymouth'],
}

const packageSizes = [
    { value: 'XS', label: 'XS', desc: 'Max 1kg · letter size' },
    { value: 'S', label: 'S', desc: 'Max 5kg · small parcel' },
    { value: 'M', label: 'M', desc: 'Max 10kg · medium parcel' },
    { value: 'L', label: 'L', desc: 'Max 20kg · large parcel' },
  ]

function centerAspectCrop(width: number, height: number) {
  // Free crop — select 90% of image, preserving original aspect ratio
  return centerCrop({ unit: '%', width: 90, height: 90 }, width, height)
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
  const [listingType, setListingType] = useState<'sell' | 'rent' | 'service'>('sell')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [rentalPeriod, setRentalPeriod] = useState('day')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [condition, setCondition] = useState('')
  const [servicePrices, setServicePrices] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [shippingEnabled, setShippingEnabled] = useState(false)
  const [pickupEnabled, setPickupEnabled] = useState(false)
  const [packageSize, setPackageSize] = useState('')
  const [packageWeight, setPackageWeight] = useState('')
  const [stripeStatus, setStripeStatus] = useState<StripeStatus>('idle')
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeSuccess, setStripeSuccess] = useState(false)

  // Crop state
  const [cropQueue, setCropQueue] = useState<{ file: File; src: string }[]>([])
  const [cropIndex, setCropIndex] = useState(0)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [croppedFiles, setCroppedFiles] = useState<File[]>([])
  const [showCropper, setShowCropper] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const supabase = createClient()

  // Read URL params and check Stripe status on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('type') === 'service') setListingType('service')
    if (params.get('stripe') === 'success') setStripeSuccess(true)

    // Clean up stripe param from URL
    if (params.has('stripe')) {
      const clean = new URL(window.location.href)
      clean.searchParams.delete('stripe')
      window.history.replaceState({}, '', clean.toString())
    }

    // Check Stripe verification for logged-in users
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setStripeStatus('checking')
      fetch('/api/stripe/status')
        .then(r => r.json())
        .then(({ verified }) => setStripeStatus(verified ? 'verified' : 'unverified'))
        .catch(() => setStripeStatus('idle'))
    })
  }, [])

  const handleSetupPayments = async () => {
    setStripeLoading(true)
    try {
      const res = await fetch('/api/stripe/connect', { method: 'POST' })
      const { url, error } = await res.json()
      if (url) window.location.href = url
      else setMessage(error || 'Something went wrong. Please try again.')
    } catch {
      setMessage('Something went wrong. Please try again.')
    }
    setStripeLoading(false)
  }

  const handleTypeChange = (type: 'sell' | 'rent' | 'service') => {
    setListingType(type)
    setCategory('')
    setSubcategory('')
    setCondition('')
    setServicePrices({})
  }

  const toggleServiceType = (t: string) => {
    setServicePrices(prev => {
      const next = { ...prev }
      if (t in next) { delete next[t] } else { next[t] = '' }
      return next
    })
  }

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
    const serviceItems = Object.entries(servicePrices).map(([name, p]) => ({ name, price: parseFloat(p) || 0 }))
    if (listingType === 'service' && serviceItems.length === 0) { setMessage('Please select at least one service type.'); return }
    if (listingType !== 'service' && shippingEnabled && !packageSize) { setMessage('Please select a package size.'); return }
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
      price: listingType === 'service' ? null : (price ? parseInt(price) : null),
      location: `${city}, ${country}`,
      country, city,
      category: listingType === 'service' ? JSON.stringify(serviceItems) : category,
      subcategory: listingType !== 'service' ? subcategory : null,
      condition: listingType !== 'service' ? condition : null,
      images: imageUrls,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? rentalPeriod : null,
      shipping_enabled: listingType !== 'service' ? shippingEnabled : false,
      pickup_enabled: listingType !== 'service' ? pickupEnabled : false,
      package_size: listingType !== 'service' && shippingEnabled ? packageSize : null,
      package_weight: listingType !== 'service' && shippingEnabled && packageWeight ? parseFloat(packageWeight) : null,
    })

    setLoading(false)
    if (error) setMessage('Error: ' + error.message)
    else {
      setMessage('Listing published!')
      setTitle(''); setDescription(''); setPrice('')
      setCountry(''); setCity('')
      setCategory(''); setSubcategory(''); setCondition('')
      setServicePrices({})
      setCroppedFiles([]); setCropQueue([])
      setShippingEnabled(false); setPickupEnabled(false); setPackageSize(''); setPackageWeight('')
    }
  }

  const priceLabel = listingType === 'rent'
    ? rentalPeriods.find(p => p.value === rentalPeriod)?.label || 'Per day'
    : listingType === 'service'
    ? 'Starting price (€) — optional'
    : 'Price (€)'

  const activeCategoryMap = categories

  // Show Stripe gate for unverified logged-in users
  if (stripeStatus === 'unverified') {
    return (
      <div className="new-listing-page">
        <h1 className="new-listing-title">New listing</h1>
        <div style={{
          background: '#F5F3E6',
          border: '1px solid rgba(26,20,8,0.12)',
          borderRadius: '12px',
          padding: '32px 28px',
          maxWidth: '480px',
          margin: '32px auto 0',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px', textAlign: 'center' }}>🔐</div>
          <h2 style={{
            fontFamily: 'Barlow Condensed', fontSize: '20px', fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1a1408',
            textAlign: 'center', marginBottom: '14px',
          }}>
            One-time setup required
          </h2>
          <p style={{
            fontFamily: 'Barlow', fontSize: '14px', lineHeight: 1.6,
            color: '#3a3020', textAlign: 'center', marginBottom: '8px',
          }}>
            To post a listing on Slabsend, you need to verify your identity once through Stripe. This is required to receive payments securely.
          </p>
          <p style={{
            fontFamily: 'Barlow', fontSize: '14px', lineHeight: 1.6,
            color: '#7a7060', textAlign: 'center', marginBottom: '28px',
          }}>
            <strong style={{ color: '#1a1408' }}>You only need to do this once.</strong> After that, you can post listings freely.
          </p>
          <button
            onClick={handleSetupPayments}
            disabled={stripeLoading}
            style={{
              display: 'block', width: '100%',
              fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: stripeLoading ? '#9a9080' : '#FC7038',
              color: '#F5F3E6', border: 'none', borderRadius: '8px',
              padding: '14px 24px', cursor: stripeLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {stripeLoading ? 'Redirecting...' : 'Set up payments with Stripe →'}
          </button>
          <p style={{
            fontFamily: 'Barlow', fontSize: '12px', color: '#9a9080',
            textAlign: 'center', marginTop: '14px',
          }}>
            Powered by Stripe — your data is handled securely and never stored by Slabsend.
          </p>
          {message && (
            <p style={{ fontFamily: 'Barlow', fontSize: '13px', color: '#cc3300', textAlign: 'center', marginTop: '10px' }}>{message}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="new-listing-page">
      <h1 className="new-listing-title">New listing</h1>

      {/* STRIPE SUCCESS BANNER */}
      {stripeSuccess && (
        <div style={{
          background: '#e6f4ea', border: '1px solid #a8d5b0', borderRadius: '8px',
          padding: '12px 16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <span style={{ fontSize: '18px' }}>✅</span>
          <p style={{ fontFamily: 'Barlow', fontSize: '14px', color: '#1a4a2a', margin: 0 }}>
            Payment account verified! You can now publish your listing.
          </p>
        </div>
      )}

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
          <div style={{ maxWidth: '94vw', maxHeight: '75vh', overflow: 'auto' }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={cropQueue[cropIndex].src} onLoad={onImageLoad} style={{ maxWidth: '90vw', maxHeight: '70vh', display: 'block' }} alt="crop" />
            </ReactCrop>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSkipCrop} style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f0ead8', border: '1px solid rgba(240,234,216,0.3)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Skip</button>
            <button onClick={handleCropConfirm} style={{ fontFamily: 'Barlow Condensed', fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#cc4400', color: '#f0ead8', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Confirm crop</button>
          </div>
        </div>
      )}

      <div className="listing-type-toggle">
        <button className={`listing-type-btn ${listingType === 'sell' ? 'active' : ''}`} onClick={() => handleTypeChange('sell')}>For sale</button>
        <button className={`listing-type-btn ${listingType === 'rent' ? 'active rent' : ''}`} onClick={() => handleTypeChange('rent')}>For rent</button>
        <button className={`listing-type-btn ${listingType === 'service' ? 'active service' : ''}`} onClick={() => handleTypeChange('service')}>Service</button>
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

      <input
        className="form-input"
        placeholder={listingType === 'service' ? 'Business / company name' : 'Title'}
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      {listingType === 'service' && (
        <p style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '6px', marginTop: '4px' }}>
          Free description — write whatever you want
        </p>
      )}
      <textarea className="form-input form-textarea" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

      {listingType !== 'service' && (
        <div className="price-input-row">
          <input className="form-input" placeholder={priceLabel} value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ marginBottom: 0 }} />
          {listingType === 'rent' && (
            <span className="price-period-label">€ / {rentalPeriods.find(p => p.value === rentalPeriod)?.label.replace('Per ', '') || 'day'}</span>
          )}
        </div>
      )}

      <div className="location-row">
        <select className="form-input" value={country} onChange={e => { setCountry(e.target.value); setCity('') }} style={{ marginBottom: 0 }}>
          <option value="">Select country</option>
          {europeanCountries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, marginBottom: 0 }}>
          <input
            className="form-input"
            placeholder="City"
            value={city}
            onChange={e => setCity(e.target.value)}
            list={country ? `cities-${country}` : undefined}
            style={{ marginBottom: 0, width: '100%' }}
            autoComplete="off"
          />
          {country && citiesByCountry[country] && (
            <datalist id={`cities-${country}`}>
              {citiesByCountry[country].map(c => <option key={c} value={c} />)}
            </datalist>
          )}
        </div>
      </div>

      {listingType === 'service' ? (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
            Services offered &amp; pricing
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {serviceTypeOptions.map(t => {
              const active = t in servicePrices
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleServiceType(t)}
                    style={{ width: '18px', height: '18px', accentColor: '#FC7038', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 600, color: active ? '#1a1408' : '#9a9080', flex: 1, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleServiceType(t)}>
                    {t}
                  </span>
                  {active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={servicePrices[t]}
                        onChange={e => setServicePrices(prev => ({ ...prev, [t]: e.target.value }))}
                        style={{ fontFamily: 'Barlow', fontSize: '14px', width: '90px', padding: '6px 10px', background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', color: '#1a1408', textAlign: 'right' }}
                      />
                      <span style={{ fontFamily: 'Barlow Condensed', fontSize: '13px', color: '#7a7060' }}>€</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <select className="form-input" value={category} onChange={e => { setCategory(e.target.value); setSubcategory('') }}>
            <option value="">Select category</option>
            {Object.keys(activeCategoryMap).map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          {category && (
            <select className="form-input" value={subcategory} onChange={e => setSubcategory(e.target.value)}>
              <option value="">Select subcategory</option>
              {activeCategoryMap[category]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
            </select>
          )}
        </>
      )}

      {listingType !== 'service' && (
        <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
          <option value="">Select condition</option>
          {conditions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      )}

      {/* SHIPPING + PICKUP — not shown for service listings */}
      {listingType !== 'service' && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontFamily: 'Barlow Condensed', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
            Delivery options
          </p>

          {/* PICKUP */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={pickupEnabled}
              onChange={e => setPickupEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#FC7038' }}
            />
            <span style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408' }}>
              Pickup
            </span>
          </label>

          {/* SHIPPING */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={shippingEnabled}
              onChange={e => setShippingEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: '#FC7038' }}
            />
            <span style={{ fontFamily: 'Barlow Condensed', fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408' }}>
              Shipping
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
      )}

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
