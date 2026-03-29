import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Slabsend',
  description: 'The climbing gear marketplace',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  const logoFormats = ['png', 'svg', 'webp']
  let logoUrl = ''
  for (const ext of logoFormats) {
    const { data } = await supabase.storage.from('logo').list('', { search: `logo.${ext}` })
    if (data && data.length > 0) {
      logoUrl = `${supabaseUrl}/storage/v1/object/public/logo/logo.${ext}?t=${Date.now()}`
      break
    }
  }

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <nav className="sb-nav">
          <a href="/" className="sb-logo">
            {logoUrl ? (
              <img src={logoUrl} alt="Slabsend" className="sb-logo-img" width={180} height={45} />
            ) : (
              <>Slab<span>send</span></>
            )}
          </a>
          <div className="sb-nav-links">
            <a href="/listings" className="sb-nav-link">Listings</a>
            <a href="/service" className="sb-nav-link">Service</a>
            <a href="/messages" className="sb-nav-link">Messages</a>
            <a href="/profile" className="sb-nav-link">Profile</a>
            <a href="/admin" className="sb-nav-link">Admin</a>
          </div>
          <div className="sb-nav-right">
            <a href="/listings/new" className="sb-btn-sell">+ Sell / Rent</a>
            <a href="/login" className="sb-btn-login">Sign in</a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}