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
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[
                { label: 'VISA', bg: '#1a1f71', color: '#fff', italic: true },
                { label: 'MC', bg: '#eb001b', color: '#fff' },
                { label: 'AMEX', bg: '#007bc1', color: '#fff' },
                { label: '⌘ Pay', bg: '#fff', color: '#000' },
                { label: 'G Pay', bg: '#fff', color: '#3c4043', border: '1px solid rgba(255,255,255,0.2)' },
              ].map(m => (
                <span key={m.label} style={{ fontFamily: 'Barlow Condensed', fontSize: '8px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: m.bg, color: m.color, border: (m as any).border || 'none', fontStyle: m.italic ? 'italic' : 'normal', lineHeight: 1.5, opacity: 0.7 }}>{m.label}</span>
              ))}
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