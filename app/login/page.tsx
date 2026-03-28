'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

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
        <div className="login-logo">Slab<span>send</span></div>
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