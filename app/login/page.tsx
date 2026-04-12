'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [country, setCountry] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoReady, setLogoReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const tryLogo = async () => {
      for (const ext of ['png', 'svg', 'webp']) {
        const { data } = await supabase.storage.from('logo').list('', { search: `logo.${ext}` })
        if (data && data.length > 0) {
          setLogoUrl(`${SUPABASE_URL}/storage/v1/object/public/logo/logo.${ext}`)
          break
        }
      }
      setLogoReady(true)
    }
    tryLogo()
  }, [])

  const handleSubmit = async () => {
    if (isSignUp) {
      if (!username.trim()) { setMessage('Username is required'); return }
      if (!country) { setMessage('Please select your country'); return }

      const { data: existing } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle()

      if (existing) { setMessage('Username is already taken'); return }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: username.trim().toLowerCase() } },
      })
      if (error) { setMessage(error.message); return }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          { user_id: data.user.id, username: username.trim().toLowerCase(), country },
          { onConflict: 'user_id' }
        )
        if (profileError) console.error('Profile creation error:', profileError.message)
      }
      setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else window.location.href = '/profile'
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) { setMessage('Enter your email address above first'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile?reset=true`,
    })
    if (error) setMessage(error.message)
    else setMessage('Password reset link sent! Check your email.')
  }

  const isError = message.toLowerCase().includes('error') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('taken') || message.toLowerCase().includes('required')

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          {logoReady && (
            logoUrl
              ? <img src={logoUrl} alt="Slabsend" style={{ width: '220px', height: 'auto' }} />
              : <>Slab<span>send</span></>
          )}
        </div>
        <h1 className="login-title">{isSignUp ? 'Create account' : 'Sign in'}</h1>
        <p className="login-subtitle">
          {isSignUp ? 'Join the climbing gear community' : 'Welcome back to the climbing gear marketplace'}
        </p>

        {isSignUp && (
          <>
            <input
              className="form-input"
              type="text"
              placeholder="Username (unique, cannot be changed later)"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            />
            <select
              className="form-input"
              value={country}
              onChange={e => setCountry(e.target.value)}
              style={{ color: country ? '#1a1408' : '#9a9080' }}
            >
              <option value="">Country *</option>
              <option value="Finland">Finland</option>
              <option value="Sweden">Sweden</option>
              <option value="Norway">Norway</option>
              <option value="Denmark">Denmark</option>
              <option value="Estonia">Estonia</option>
              <option value="Latvia">Latvia</option>
              <option value="Lithuania">Lithuania</option>
              <option value="Germany">Germany</option>
              <option value="Austria">Austria</option>
              <option value="Switzerland">Switzerland</option>
              <option value="France">France</option>
              <option value="Spain">Spain</option>
              <option value="Italy">Italy</option>
              <option value="Netherlands">Netherlands</option>
              <option value="Belgium">Belgium</option>
              <option value="Poland">Poland</option>
              <option value="Czech Republic">Czech Republic</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Ireland">Ireland</option>
              <option value="Portugal">Portugal</option>
              <option value="Greece">Greece</option>
              <option value="Hungary">Hungary</option>
              <option value="Slovakia">Slovakia</option>
              <option value="Slovenia">Slovenia</option>
              <option value="Croatia">Croatia</option>
              <option value="Romania">Romania</option>
              <option value="Bulgaria">Bulgaria</option>
              <option value="Iceland">Iceland</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="New Zealand">New Zealand</option>
              <option value="Japan">Japan</option>
              <option value="Other">Other</option>
            </select>
          </>
        )}

        <input
          className="form-input"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />

        <button className="form-submit" onClick={handleSubmit}>
          {isSignUp ? 'Create account' : 'Sign in'}
        </button>

        {!isSignUp && (
          <button className="login-forgot-btn" onClick={handleForgotPassword}>
            Forgot your password?
          </button>
        )}

        {message && (
          <p className={`form-message ${isError ? 'error' : 'success'}`}>{message}</p>
        )}

        <button
          className="login-switch-btn"
          onClick={() => { setIsSignUp(!isSignUp); setMessage(''); setUsername(''); setCountry('') }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}
