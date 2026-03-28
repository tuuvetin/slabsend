'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const serviceTypes = [
  'Shoe resoling',
  'Gear repair',
  'Harness inspection',
  'Rope inspection',
  'General service',
  'Other',
]

const europeanCountries = [
  'All of Europe',
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic',
  'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal',
  'Romania', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
  'United Kingdom',
]

export default function ServicePage() {
  const [services, setServices] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [contact, setContact] = useState('')
  const [website, setWebsite] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
    supabase.from('services').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      setServices(data || [])
      setFiltered(data || [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let result = services
    if (filterType) result = result.filter(s => s.service_type === filterType)
    if (filterCountry && filterCountry !== 'All of Europe') result = result.filter(s => s.country === filterCountry)
    setFiltered(result)
  }, [filterType, filterCountry, services])

  const handleSubmit = async () => {
    if (!name.trim() || !serviceType || !country || !city.trim()) {
      setMessage('Please fill in all required fields.')
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { error } = await supabase.from('services').insert({
      user_id: user.id, name, description,
      service_type: serviceType,
      location: `${city}, ${country}`,
      country, city, contact, website,
    })
    setSaving(false)
    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      setMessage('Service listed successfully!')
      setName(''); setDescription(''); setServiceType('')
      setCountry(''); setCity(''); setContact(''); setWebsite('')
      setShowForm(false)
      supabase.from('services').select('*').order('created_at', { ascending: false }).then(({ data }) => {
        setServices(data || [])
      })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this service listing?')) return
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="service-page">
      <div className="service-header">
        <div>
          <h1 className="service-title">Service & Repair</h1>
          <p className="service-subtitle">Find a resoler, repair shop, or gear inspector near you</p>
        </div>
        {currentUser ? (
          <button
            className="form-submit"
            style={{ width: 'auto', padding: '10px 24px' }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ List your service'}
          </button>
        ) : (
          <a href="/login" className="sb-btn-sell">Sign in to list a service</a>
        )}
      </div>

      {showForm && (
        <div className="service-form">
          <h2 className="service-form-title">List your service</h2>
          <input className="form-input" placeholder="Business / name *" value={name} onChange={e => setName(e.target.value)} />
          <textarea className="form-input form-textarea" placeholder="Description — what do you offer?" value={description} onChange={e => setDescription(e.target.value)} />
          <select className="form-input" value={serviceType} onChange={e => setServiceType(e.target.value)}>
            <option value="">Select service type *</option>
            {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="location-row">
            <select className="form-input" value={country} onChange={e => setCountry(e.target.value)} style={{ marginBottom: 0 }}>
              <option value="">Select country *</option>
              {europeanCountries.filter(c => c !== 'All of Europe').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input className="form-input" placeholder="City *" value={city} onChange={e => setCity(e.target.value)} style={{ marginBottom: 0 }} />
          </div>
          <input className="form-input" placeholder="Contact (email or phone)" value={contact} onChange={e => setContact(e.target.value)} />
          <input className="form-input" placeholder="Website (optional)" value={website} onChange={e => setWebsite(e.target.value)} />
          <button className="form-submit" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Publish listing'}
          </button>
          {message && (
            <p className={`form-message ${message.startsWith('Error') || message.startsWith('Please') ? 'error' : 'success'}`}>
              {message}
            </p>
          )}
        </div>
      )}

      <div className="service-filters">
        <select className="listings-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All service types</option>
          {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="listings-select" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
          {europeanCountries.map(c => (
            <option key={c} value={c === 'All of Europe' ? '' : c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && <p className="listing-loading">Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div className="service-empty">
          <p>No service providers listed yet.</p>
          <p>Be the first to list your service.</p>
        </div>
      )}

      <div className="service-grid">
        {filtered.map(service => (
          <div key={service.id} className="service-card">
            <div className="service-card-header">
              <div>
                <h3 className="service-card-name">{service.name}</h3>
                <span className="service-card-type">{service.service_type}</span>
              </div>
              {currentUser && currentUser.id === service.user_id && (
                <button className="service-delete-btn" onClick={() => handleDelete(service.id)}>Delete</button>
              )}
            </div>
            {service.description && <p className="service-card-desc">{service.description}</p>}
            <div className="service-card-meta">
              {service.location && <span>📍 {service.location}</span>}
              {service.contact && <span>✉ {service.contact}</span>}
              {service.website && (
                <a href={service.website} target="_blank" rel="noopener noreferrer" className="service-card-link">
                  {service.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}