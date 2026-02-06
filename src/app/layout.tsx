import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Starboard News - 订阅精选资讯',
  description: '订阅能源、加密货币、数据中心领域的精选日报，直达邮箱',
  keywords: ['newsletter', '订阅', '能源', 'crypto', '数据中心', '比特币'],
  authors: [{ name: 'Starboard' }],
  openGraph: {
    title: 'Starboard News - 订阅精选资讯',
    description: '订阅能源、加密货币、数据中心领域的精选日报，直达邮箱',
    url: 'https://news.starboard.to',
    siteName: 'Starboard News',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starboard News - 订阅精选资讯',
    description: '订阅能源、加密货币、数据中心领域的精选日报，直达邮箱',
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
    <html lang="zh">
      <body className="min-h-screen bg-black">
        {children}
      </body>
    </html>
  )
}
