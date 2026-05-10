'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SUPPORTED_COUNTRIES } from '@/app/lib/countries'

export default function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const returnTo = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('returnTo') || '/listings'
    : '/listings'

  useEffect(() => {
    // Redirect to login if not authenticated
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/login'
    })
  }, [])

  const handleSubmit = async () => {
    if (!username.trim()) { setMessage('Username is required'); return }
    if (!country) { setMessage('Please select your country'); return }
    if (!termsAccepted) { setMessage('Please accept the Terms & Privacy Policy'); return }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }

    // Check username uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username.trim().toLowerCase())
      .maybeSingle()

    if (existing && existing.user_id !== user.id) {
      setMessage('Username is already taken')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('profiles').upsert(
      { user_id: user.id, username: username.trim().toLowerCase(), country },
      { onConflict: 'user_id' }
    )

    if (error) {
      setMessage('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    window.location.href = returnTo
  }

  const isError = message.toLowerCase().includes('required') ||
    message.toLowerCase().includes('taken') ||
    message.toLowerCase().includes('wrong') ||
    message.toLowerCase().includes('select')

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Almost there!</h1>
        <p className="login-subtitle">
          Choose a username and your country to complete your account setup.
        </p>

        <input
          className="form-input"
          type="text"
          placeholder="Username (unique, cannot be changed later)"
          value={username}
          onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          disabled={loading}
        />

        <select
          className="form-input"
          value={country}
          onChange={e => setCountry(e.target.value)}
          style={{ color: country ? '#1a1408' : '#9a9080' }}
          disabled={loading}
        >
          <option value="">Country *</option>
          {SUPPORTED_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={e => setTermsAccepted(e.target.checked)}
            disabled={loading}
            style={{ width: '16px', height: '16px', accentColor: '#FC7038', marginTop: '2px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '13px', color: '#3a3428', lineHeight: 1.5 }}>
            I agree to Slabsend's{' '}
            <a href="/privacy" target="_blank" style={{ color: '#FC7038', fontWeight: 600 }}>Terms of Service & Privacy Policy</a>
          </span>
        </label>

        <button
          className="form-submit"
          onClick={handleSubmit}
          disabled={loading}
          style={loading ? { opacity: 0.6 } : undefined}
        >
          {loading ? 'Setting up...' : 'Complete setup'}
        </button>

        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>{message}</p>
        )}

        <p style={{ marginTop: '16px', fontSize: '12px', color: '#9a9080', textAlign: 'center', lineHeight: 1.5 }}>
          Your username will be visible to other users. Your email is private and never shown.
        </p>
      </div>
    </div>
  )
}
