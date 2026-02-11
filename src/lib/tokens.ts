import { randomUUID } from 'crypto'

export function generateUnsubscribeToken(): string {
  return randomUUID()
}

export function buildUnsubscribeUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://news.starboard.to'
  return `${baseUrl}/unsubscribe?token=${token}`
}
