'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
          setLogoUrl(`${SUPABASE_URL}/storage/v1/object/public/logo/logo.${ext}?t=${Date.now()}`)
          break
        }
      }
      setLogoReady(true)
    }
    tryLogo()
  }, [])

  const handleSubmit = async () => {
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMessage(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else { setMessage('Signed in!'); window.location.href = '/profile' }
    }
  }

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
        <h1 className="login-title">
          {isSignUp ? 'Create account' : 'Sign in'}
        </h1>
        <p className="login-subtitle">
          {isSignUp
            ? 'Join the climbing gear community'
            : 'Welcome back to the climbing gear marketplace'}
        </p>
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
        {message && (
          <p className={`form-message ${message.includes('Error') || message.includes('Invalid') ? 'error' : 'success'}`}>
            {message}
          </p>
        )}
        <button
          className="login-switch-btn"
          onClick={() => { setIsSignUp(!isSignUp); setMessage('') }}
        >
          {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}