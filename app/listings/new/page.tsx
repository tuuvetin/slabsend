'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

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


const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']

// Generate 30-min time slots for the full day
const ALL_TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2).toString().padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})

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

// All EU/EEA countries — used for rent listings (pickup only, no shipping restriction)
const EU_COUNTRIES = Object.keys(citiesByCountry).sort()

const packageSizes = [
    { value: 'S', label: 'Small', desc: 'Fits in a large envelope' },
    { value: 'M', label: 'Medium', desc: 'Fits in a shoe box' },
    { value: 'L', label: 'Large', desc: 'Fits in a moving box' },
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
  const [country, setCountry] = useState('Finland')
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
  const [stripeSuccess, setStripeSuccess] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pickupLocation, setPickupLocation] = useState('')
  const [pickupHoursFrom, setPickupHoursFrom] = useState('09:00')
  const [pickupHoursTo, setPickupHoursTo] = useState('20:00')
  const [weeklyDiscountPct, setWeeklyDiscountPct] = useState(0)
  const [monthlyDiscountPct, setMonthlyDiscountPct] = useState(0)
  const [securityDeposit, setSecurityDeposit] = useState('')

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

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      if (user) setIsAdmin(ADMIN_EMAILS.includes(user.email || ''))
    })
  }, [])

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
    if (!city.trim()) { setMessage('Please enter a city.'); return }
    const serviceItems = Object.entries(servicePrices).map(([name, p]) => ({ name, price: parseFloat(p) || 0 }))
    if (listingType === 'service' && serviceItems.length === 0) { setMessage('Please select at least one service type.'); return }
    if (listingType !== 'service' && shippingEnabled && !packageSize) { setMessage('Please select a package size.'); return }
    if (listingType === 'sell' && !packageWeight) { setMessage('Please enter the package weight (kg).'); return }
    if (listingType !== 'service' && croppedFiles.length === 0) { setMessage('Please add at least one photo of your item.'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    if (listingType !== 'rent') {
      // Check seller has address and is in a supported country
      const { data: profile } = await supabase.from('profiles').select('address_street, address_postcode, address_city, phone, country').eq('user_id', user.id).single()
      if (!profile?.address_street || !profile?.address_postcode || !profile?.address_city || !profile?.phone) {
        setMessage('Please fill in your home address on your profile page before publishing a listing.')
        setLoading(false)
        return
      }
      if (profile?.country && profile.country !== 'Finland') {
        setMessage('Slabsend shipping is currently only available from Finland. Sellers must be based in Finland.')
        setLoading(false)
        return
      }
    }

    const imageUrls: string[] = []
    for (const image of croppedFiles) {
      const filename = `${user.id}/${Date.now()}-${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error } = await supabase.storage.from('listing-images').upload(filename, image)
      if (!error) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(filename)
        imageUrls.push(data.publicUrl)
      }
    }

    const { data: newListing, error } = await supabase.from('listings').insert({
      user_id: user.id, title, description,
      price: listingType === 'service' ? null : (price ? parseInt(price) : null),
      location: `${city}, ${country}`,
      country, city,
      category: listingType === 'service' ? JSON.stringify(serviceItems) : category,
      subcategory: listingType !== 'service' ? subcategory : null,
      condition: listingType !== 'service' ? condition : null,
      images: imageUrls,
      listing_type: listingType,
      rental_period: listingType === 'rent' ? 'day' : null,
      shipping_enabled: listingType === 'sell' ? shippingEnabled : false,
      pickup_enabled: listingType === 'rent' ? true : (listingType !== 'service' ? pickupEnabled : false),
      package_size: listingType !== 'service' && shippingEnabled ? packageSize : null,
      package_weight: listingType !== 'service' && shippingEnabled && packageWeight ? parseFloat(packageWeight) : null,
      weight_kg: listingType !== 'service' && shippingEnabled && packageWeight ? parseFloat(packageWeight) : null,
      shipping_from_country: listingType === 'sell' ? 'FI' : null,
      pickup_location: listingType === 'rent' ? pickupLocation : null,
      pickup_hours_from: listingType === 'rent' ? pickupHoursFrom : null,
      pickup_hours_to: listingType === 'rent' ? pickupHoursTo : null,
      weekly_discount_pct: listingType === 'rent' ? weeklyDiscountPct : null,
      monthly_discount_pct: listingType === 'rent' ? monthlyDiscountPct : null,
      ...(listingType === 'rent' ? { security_deposit: securityDeposit ? parseFloat(securityDeposit) : null } : {}),
    }).select('id').single()

    setLoading(false)
    if (error) setMessage('Error: ' + error.message)
    else {
      window.location.href = `/listings/${newListing.id}?published=true`
      setTitle(''); setDescription(''); setPrice('')
      setCountry(''); setCity('')
      setCategory(''); setSubcategory(''); setCondition('')
      setServicePrices({})
      setCroppedFiles([]); setCropQueue([])
      setShippingEnabled(false); setPickupEnabled(false); setPackageSize(''); setPackageWeight('')
      setPickupLocation('')
      setWeeklyDiscountPct(0)
      setMonthlyDiscountPct(0)
      setSecurityDeposit('')
    }
  }

  const priceLabel = listingType === 'rent'
    ? 'Price per day (€)'
    : listingType === 'service'
    ? 'Starting price (€) — optional'
    : 'Price (€)'

  const activeCategoryMap = categories

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
          <p style={{ fontSize: '14px', color: '#1a4a2a', margin: 0 }}>
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
          <p style={{ color: '#f0ead8', fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Photo {cropIndex + 1} / {cropQueue.length} — Drag to crop
          </p>
          <div style={{ maxWidth: '94vw', maxHeight: '75vh', overflow: 'auto' }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
              <img ref={imgRef} src={cropQueue[cropIndex].src} onLoad={onImageLoad} style={{ maxWidth: '90vw', maxHeight: '70vh', display: 'block' }} alt="crop" />
            </ReactCrop>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button onClick={handleSkipCrop} style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'transparent', color: '#f0ead8', border: '1px solid rgba(240,234,216,0.3)', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Skip</button>
            <button onClick={handleCropConfirm} style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', background: '#cc4400', color: '#f0ead8', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer' }}>Confirm crop</button>
          </div>
        </div>
      )}

      <div className="listing-type-toggle">
        <button className={`listing-type-btn ${listingType === 'sell' ? 'active' : ''}`} onClick={() => handleTypeChange('sell')}>For sale</button>
        <button className={`listing-type-btn ${listingType === 'rent' ? 'active rent' : ''}`} onClick={() => handleTypeChange('rent')}>For rent</button>
        {/* Service listings hidden until directory launches */}
      </div>

      {listingType === 'rent' && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
            Long-term discounts (optional)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#1a1408', flex: 1 }}>Weekly discount (7+ days)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={weeklyDiscountPct || ''}
                  onChange={e => setWeeklyDiscountPct(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  placeholder="0"
                  style={{ fontSize: '14px', width: '70px', padding: '7px 10px', background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', color: '#1a1408', textAlign: 'right' }}
                />
                <span style={{ fontSize: '14px', color: '#7a7060', minWidth: '20px' }}>%</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#1a1408', flex: 1 }}>Monthly discount (30+ days)</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={monthlyDiscountPct || ''}
                  onChange={e => setMonthlyDiscountPct(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
                  placeholder="0"
                  style={{ fontSize: '14px', width: '70px', padding: '7px 10px', background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', color: '#1a1408', textAlign: 'right' }}
                />
                <span style={{ fontSize: '14px', color: '#7a7060', minWidth: '20px' }}>%</span>
              </div>
            </div>
          </div>
          {(weeklyDiscountPct > 0 || monthlyDiscountPct > 0) && (
            <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '10px', marginBottom: 0 }}>
              {weeklyDiscountPct > 0 && `7+ days: ${weeklyDiscountPct}% off`}
              {weeklyDiscountPct > 0 && monthlyDiscountPct > 0 && ' · '}
              {monthlyDiscountPct > 0 && `30+ days: ${monthlyDiscountPct}% off`}
            </p>
          )}

          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '6px' }}>Security deposit (optional)</p>
            <p style={{ fontSize: '12px', color: '#7a7060', marginBottom: '8px', lineHeight: 1.5 }}>
              Renter pays this directly to you at pickup. Returned when item is returned in good condition.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={securityDeposit}
                onChange={e => setSecurityDeposit(e.target.value)}
                style={{ fontSize: '14px', width: '100px', padding: '7px 10px', background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', color: '#1a1408', textAlign: 'right' }}
              />
              <span style={{ fontSize: '14px', color: '#7a7060' }}>€</span>
            </div>
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
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#1a1408', marginBottom: '6px', marginTop: '4px' }}>
          Free description — write whatever you want
        </p>
      )}
      <textarea className="form-input form-textarea" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />

      {listingType !== 'service' && (
        <div className="price-input-row">
          <input className="form-input" placeholder={priceLabel} value={price} onChange={e => setPrice(e.target.value)} type="number" style={{ marginBottom: 0 }} />
          {listingType === 'rent' && (
            <span className="price-period-label">€ / day</span>
          )}
        </div>
      )}

      <p style={{ fontSize: '12px', color: '#9a9080', marginBottom: '6px' }}>
        If your city isn't in the list, just type it in.
      </p>
      <div className="location-row">
        {listingType === 'rent' ? (
          <select
            className="form-input"
            value={country}
            onChange={e => { setCountry(e.target.value); setCity('') }}
            style={{ marginBottom: 0 }}
          >
            <option value="">Select country</option>
            {EU_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : (
          <div className="form-input" style={{ marginBottom: 0, background: '#f0ede3', color: '#7a7060', display: 'flex', alignItems: 'center', cursor: 'not-allowed' }}>
            🇫🇮 Finland
          </div>
        )}
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
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
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
                  <span style={{ fontSize: '14px', fontWeight: 600, color: active ? '#1a1408' : '#9a9080', flex: 1, cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleServiceType(t)}>
                    {t}
                  </span>
                  {active && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <input
                        type="number"
                        placeholder="0"
                        value={servicePrices[t]}
                        onChange={e => setServicePrices(prev => ({ ...prev, [t]: e.target.value }))}
                        style={{ fontSize: '14px', width: '90px', padding: '6px 10px', background: '#fff', border: '1px solid rgba(26,20,8,0.18)', borderRadius: '6px', color: '#1a1408', textAlign: 'right' }}
                      />
                      <span style={{ fontSize: '13px', color: '#7a7060' }}>€</span>
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

      {/* DELIVERY OPTIONS */}
      {listingType === 'sell' && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
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
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408' }}>
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
            <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1a1408' }}>
              Shipping
            </span>
          </label>
          <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '6px', marginLeft: '28px' }}>
            Buyers can choose shipping at checkout. You'll receive a shipping label by email.
          </p>

          {shippingEnabled && (
            <div style={{ marginTop: '14px', marginLeft: '28px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '10px' }}>
                Package size
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {packageSizes.map(size => (
                  <button
                    key={size.value}
                    onClick={() => setPackageSize(size.value)}
                    style={{
                      fontSize: '14px', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '14px 10px', borderRadius: '8px', cursor: 'pointer',
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
            </div>
          )}
        </div>
      )}

      {/* PACKAGE WEIGHT — pakollinen kaikille sell-ilmoituksille */}
      {listingType === 'sell' && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '4px' }}>
            Package weight <span style={{ color: '#FC7038' }}>*</span>
          </p>
          <p style={{ fontSize: '12px', color: '#9a9080', marginBottom: '12px' }}>
            Used for the shipping label. Estimate is fine.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: '0–0.5 kg', value: '0.5' },
              { label: '0.5–2 kg', value: '2' },
              { label: '2–5 kg',   value: '5' },
              { label: '5–10 kg',  value: '10' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPackageWeight(opt.value)}
                style={{
                  padding: '10px 6px',
                  borderRadius: '8px',
                  border: packageWeight === opt.value ? '2px solid #FC7038' : '1px solid rgba(26,20,8,0.15)',
                  background: packageWeight === opt.value ? '#FC7038' : '#fff',
                  color: packageWeight === opt.value ? '#F5F3E6' : '#1a1408',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {listingType === 'rent' && (
        <div style={{ background: '#F5F3E6', border: '1px solid rgba(26,20,8,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', marginBottom: '12px' }}>
            Pickup only
          </p>
          <input
            className="form-input"
            placeholder="Pickup location (e.g. Helsinki, Kallio)"
            value={pickupLocation}
            onChange={e => setPickupLocation(e.target.value)}
          />
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a7060', margin: '14px 0 8px' }}>
            Pickup hours
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={pickupHoursFrom}
              onChange={e => setPickupHoursFrom(e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.15)', fontSize: '14px', background: '#fff', color: '#1a1408' }}
            >
              {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: '13px', color: '#7a7060' }}>–</span>
            <select
              value={pickupHoursTo}
              onChange={e => setPickupHoursTo(e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: '6px', border: '1px solid rgba(26,20,8,0.15)', fontSize: '14px', background: '#fff', color: '#1a1408' }}
            >
              {ALL_TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <p style={{ fontSize: '12px', color: '#7a7060', marginTop: '6px' }}>
            The renter picks a specific time within this window when booking.
          </p>
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
        <p className={`form-message ${message.startsWith('Error') || message.startsWith('Please') || message.startsWith('Täytä') || message.startsWith('Syötä') ? 'error' : 'success'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
