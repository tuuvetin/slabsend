import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Slabsend',
  description: 'The climbing gear marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
            Slab<span>send</span>
          </a>
          <div className="sb-nav-links">
            <a href="/listings" className="sb-nav-link">Listings</a>
            <a href="/service" className="sb-nav-link">Service</a>
            <a href="/messages" className="sb-nav-link">Messages</a>
            <a href="/profile" className="sb-nav-link">Profile</a>
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