import type { Metadata } from 'next'
import './globals.css'
import NavBar from './NavBar'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'Slabsend',
  description: 'The climbing gear marketplace',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Condensed:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavBar />
        {children}
        <footer className="site-footer">
          <div className="site-footer-values">
            <div className="site-footer-value">
              <h3 className="site-footer-value-title">Love our planet.</h3>
              <p className="site-footer-value-text">We take responsibility by recycling, repairing, and extending the life of gear.</p>
            </div>
            <div className="site-footer-value">
<h3 className="site-footer-value-title">Stand for equality.</h3>
              <p className="site-footer-value-text">We support everyone's ability to access the outdoors.</p>
            </div>
            <div className="site-footer-value">
<h3 className="site-footer-value-title">Stay active.</h3>
              <p className="site-footer-value-text">We encourage you to keep moving and exploring.</p>
            </div>
            <div className="site-footer-value">
<h3 className="site-footer-value-title">Share the community.</h3>
              <p className="site-footer-value-text">We connect people through movement and nature.</p>
            </div>
          </div>
          <div className="site-footer-bottom">
            <span className="site-footer-copy">© {new Date().getFullYear()} Slabsend</span>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', opacity: 0.6 }}>
              <svg height="16" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: 'auto' }}><rect width="60" height="20" rx="3" fill="#1A1F71"/><text x="50%" y="14" textAnchor="middle" fill="#fff" fontSize="11" fontFamily="Arial" fontWeight="bold" fontStyle="italic" letterSpacing="0.5">VISA</text></svg>
              <svg height="16" viewBox="0 0 38 20" xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: 'auto' }}><rect width="38" height="20" rx="3" fill="#252525"/><circle cx="15" cy="10" r="7" fill="#EB001B"/><circle cx="23" cy="10" r="7" fill="#F79E1B"/><path d="M19 4.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 4.8z" fill="#FF5F00"/></svg>
              <svg height="16" viewBox="0 0 48 20" xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: 'auto' }}><rect width="48" height="20" rx="3" fill="#2E77BC"/><text x="50%" y="14" textAnchor="middle" fill="#fff" fontSize="8.5" fontFamily="Arial" fontWeight="bold" letterSpacing="0.5">AMEX</text></svg>
              <svg height="16" viewBox="0 0 50 20" xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: 'auto' }}><rect width="50" height="20" rx="3" fill="#000"/><path d="M11 6.5c.6-.7.9-1.6.8-2.5-.8.1-1.7.5-2.3 1.2-.5.6-.9 1.5-.8 2.4.9 0 1.8-.4 2.3-1.1zM11.8 7.8c-1.3-.1-2.4.7-3 .7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.1 1.9-1.3 2.3-.4 5.7.9 7.6.6.9 1.3 1.9 2.3 1.8.9 0 1.2-.6 2.3-.6s1.4.6 2.4.5c1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2-.1 0-1.9-.7-1.9-2.8 0-1.8 1.4-2.6 1.5-2.6-.8-1.2-2.1-1.9-2.1-2z" fill="#fff"/><text x="28" y="14" fill="#fff" fontSize="9" fontFamily="-apple-system,Arial" fontWeight="500"> Pay</text></svg>
              <svg height="16" viewBox="0 0 52 20" xmlns="http://www.w3.org/2000/svg" style={{ height: '16px', width: 'auto' }}><rect width="52" height="20" rx="3" fill="#fff" stroke="#ccc" strokeWidth="0.5"/><text x="50%" y="14" textAnchor="middle" fontSize="9" fontFamily="Arial" fontWeight="500" fill="#3C4043" letterSpacing="0.2">G Pay</text></svg>
            </div>
            <a href="mailto:info@slabsend.com" className="site-footer-privacy">info@slabsend.com</a>
            <a href="/privacy" className="site-footer-privacy">Privacy & Terms</a>
          </div>
        </footer>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}