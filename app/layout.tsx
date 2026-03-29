import type { Metadata } from 'next'
import './globals.css'
import NavBar from './NavBar'

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
      </body>
    </html>
  )
}