'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

const ADMIN_EMAILS = ['samuel.trimarchi@icloud.com', 'nelli.anttila@gmail.com']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

export default function NavBar() {
  const [user, setUser] = useState<any>(null)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [logoReady, setLogoReady] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
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

  const checkUnread = async (userId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id')
      .eq('receiver_id', userId)
      .eq('read', false)
      .limit(1)

    if (data && data.length > 0) { setHasUnread(true); return }

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
    <nav className="sb-nav">
      <a href="/" className="sb-logo">
        {logoReady && (
          logoUrl
            ? <img src={logoUrl} alt="Slabsend" className="sb-logo-img" width={180} height={45} />
            : <>Slab<span>send</span></>
        )}
      </a>

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