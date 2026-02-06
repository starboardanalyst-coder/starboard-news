import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Starboard News - 订阅精选资讯',
  description: '订阅能源、加密货币、数据中心领域的精选日报，直达邮箱',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className="min-h-screen gradient-bg">
        {children}
      </body>
    </html>
  )
}
