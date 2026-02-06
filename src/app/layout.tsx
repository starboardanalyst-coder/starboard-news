import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Starboard News - Curated Insights',
  description: 'Subscribe to curated daily newsletters on energy, crypto, and data centers',
  keywords: ['newsletter', 'subscription', 'energy', 'crypto', 'data centers', 'bitcoin mining'],
  authors: [{ name: 'Starboard' }],
  openGraph: {
    title: 'Starboard News - Curated Insights',
    description: 'Subscribe to curated daily newsletters on energy, crypto, and data centers',
    url: 'https://news.starboard.to',
    siteName: 'Starboard News',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starboard News - Curated Insights',
    description: 'Subscribe to curated daily newsletters on energy, crypto, and data centers',
    images: ['/images/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black">
        {children}
      </body>
    </html>
  )
}
