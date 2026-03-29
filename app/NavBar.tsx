'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAIL = 'samuel.trimarchi@icloud.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function NavBar() {
  const [user, setUser] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))

    const tryLogo = async () => {
      for (const ext of ['png', 'svg', 'webp']) {
        const { data } = await supabase.storage.from('logo').list('', { search: `logo.${ext}` })
        if (data && data.length > 0) {
          setLogoUrl(`${SUPABASE_URL}/storage/v1/object/public/logo/logo.${ext}?t=${Date.now()}`)
          break
        }
      }
    }
    tryLogo()
  }, [])

  const isAdmin = user?.email === ADMIN_EMAIL

  return (
    <nav className="sb-nav">
      <a href="/" className="sb-logo">
        {logoUrl
          ? <img src={logoUrl} alt="Slabsend" className="sb-logo-img" width={180} height={45} />
          : <>Slab<span>send</span></>
        }
      </a>

      <div className="sb-nav-links">
        <a href="/listings" className="sb-nav-link">Listings</a>
        <a href="/service" className="sb-nav-link">Service</a>
        <a href="/messages" className="sb-nav-link">Messages</a>
        {isAdmin && <a href="/admin" className="sb-nav-link">Admin</a>}
      </div>

      <div className="sb-nav-right">
        <a href="/listings/new" className="sb-btn-sell">+ Sell / Rent</a>
        {user
          ? <a href="/profile" className="sb-btn-login">Profile</a>
          : <a href="/login" className="sb-btn-login">Sign in</a>
        }
      </div>
    </nav>
  )
}