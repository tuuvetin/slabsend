import type { Metadata } from 'next'
import './globals.css'
import NavBar from './NavBar'
import { Analytics } from '@vercel/analytics/next'

export const metadata: Metadata = {
  title: 'Slabsend',
  description: 'The climbing gear marketplace',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
            <a href="mailto:info@slabsend.com" className="site-footer-privacy">info@slabsend.com</a>
            <a href="/privacy" className="site-footer-privacy">Privacy & Terms</a>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  )
}