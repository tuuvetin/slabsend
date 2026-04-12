'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SUPPORTED_COUNTRIES } from '@/app/lib/countries'

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

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setMessage(error.message)
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

        <button className="google-signin-btn" onClick={handleGoogleSignIn}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
          </svg>
          {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
        </button>

        <div className="login-divider"><span>or</span></div>

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
              {SUPPORTED_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
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
