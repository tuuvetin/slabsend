import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Slabsend',
  description: 'Kiipeilyvarusteiden marketplace',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>
        <nav style={{ padding: '15px 20px', borderBottom: '1px solid #333', display: 'flex', gap: '20px' }}>
          <a href="/" style={{ textDecoration: 'none', fontWeight: 'bold' }}>Slabsend</a>
          <a href="/listings/new" style={{ textDecoration: 'none' }}>Myy varuste</a>
          <a href="/profile" style={{ textDecoration: 'none' }}>Profiili</a>
          <a href="/login" style={{ textDecoration: 'none' }}>Kirjaudu</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
