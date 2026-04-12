'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com', 'info@slabsend.com']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function NavBar() {
  const [user, setUser] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoReady, setLogoReady] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) checkUnread(user.id)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkUnread(session.user.id)
    })

    const tryLogo = async () => {
      const cached = sessionStorage.getItem('slabsend_logo')
      if (cached) { setLogoUrl(cached); setLogoReady(true); return }
      for (const ext of ['png', 'svg', 'webp']) {
        const { data } = await supabase.storage.from('logo').list('', { search: `logo.${ext}` })
        if (data && data.length > 0) {
          const url = `${SUPABASE_URL}/storage/v1/object/public/logo/logo.${ext}`
          sessionStorage.setItem('slabsend_logo', url)
          setLogoUrl(url)
          break
        }
      }
      setLogoReady(true)
    }
    tryLogo()
  }, [])

  const checkUnread = async (userId: string) => {
    const { data: offers } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', userId)
      .eq('is_offer', true)
      .eq('offer_status', 'pending')
      .limit(1)
    setHasUnread(!!(offers && offers.length > 0))
  }

  const isAdmin = ADMIN_EMAILS.includes(user?.email || '')

  return (
    <>
      <nav className="sb-nav">
        <a href="/" className="sb-logo">
          {logoReady && (
            logoUrl
              ? <img src={logoUrl} alt="Slabsend" className="sb-logo-img" width={180} height={45} />
              : <>Slab<span>send</span></>
          )}
        </a>

        {/* DESKTOP LINKS */}
        <div className="sb-nav-links">
          <a href="/listings" className="sb-nav-link">Listings</a>
          <a href="/service" className="sb-nav-link">Service</a>
          <a href="/messages" className="sb-nav-link" style={{ position: 'relative' }}>
            Messages
            {hasUnread && user && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-10px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#FC7038', display: 'inline-block',
              }} />
            )}
          </a>
          {isAdmin && <a href="/admin" className="sb-nav-link">Admin</a>}
        </div>

        {/* DESKTOP RIGHT */}
        <div className="sb-nav-right">
          <a href="/listings/new" className="sb-btn-sell">+ Sell / Rent</a>
          {user
            ? <a href="/profile" className="sb-btn-login">Profile</a>
            : <a href="/login" className="sb-btn-login">Sign in</a>
          }
          <button className="sb-hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>

        {/* MOBILE RIGHT — listings + messages + sell + hamburger */}
        <div className="sb-nav-mobile-right">
          <a href="/listings" className="sb-nav-link">Listings</a>
          <a href="/messages" className="sb-nav-link" style={{ position: 'relative' }}>
            Messages
            {hasUnread && user && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-10px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#FC7038', display: 'inline-block',
              }} />
            )}
          </a>
          <a href="/listings/new" style={{ fontFamily: 'Barlow Condensed', fontWeight: 400, fontSize: '18px', color: '#F5F3E6', background: '#FC7038', textDecoration: 'none', width: '26px', height: '26px', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}>+</a>
          <button className="sb-hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`sb-mobile-menu ${menuOpen ? 'open' : ''}`}>
        <button className="sb-mobile-close" onClick={() => setMenuOpen(false)}>×</button>
        <a href="/listings" onClick={() => setMenuOpen(false)}>Listings</a>
        <a href="/service" onClick={() => setMenuOpen(false)}>Service</a>
        <a href="/messages" onClick={() => setMenuOpen(false)} style={{ position: 'relative' }}>
          Messages
          {hasUnread && user && (
            <span style={{
              display: 'inline-block', width: '10px', height: '10px',
              borderRadius: '50%', background: '#FC7038',
              marginLeft: '8px', verticalAlign: 'middle'
            }} />
          )}
        </a>
        {isAdmin && <a href="/admin" onClick={() => setMenuOpen(false)}>Admin</a>}
        <a href="/listings/new" onClick={() => setMenuOpen(false)} style={{ color: '#FC7038' }}>+ Sell / Rent</a>
        {user
          ? <a href="/profile" onClick={() => setMenuOpen(false)}>Profile</a>
          : <a href="/login" onClick={() => setMenuOpen(false)}>Sign in</a>
        }
      </div>
    </>
  )
}