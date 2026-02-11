export interface Newsletter {
  id: string
  name: string
  description: string
  emoji: string
  language: string
  reportType: string // maps to reports table 'type' column
  accentColor: string
}

export const NEWSLETTERS: Newsletter[] = [
  {
    id: 'minor_news',
    name: 'Minor News',
    description: 'Daily crypto & energy infrastructure news digest',
    emoji: '⚡',
    language: 'en',
    reportType: 'minor_news',
    accentColor: '#F59E0B', // amber — energy theme
  },
  {
    id: 'into_crypto_cn',
    name: 'Into Crypto',
    description: '每日加密货币深度分析',
    emoji: '🪙',
    language: 'zh',
    reportType: 'into_crypto_cn',
    accentColor: '#4B8BFF', // brand blue — crypto theme
  },
  {
    id: 'into_crypto_en',
    name: 'Into Crypto',
    description: 'Daily crypto analysis and insights',
    emoji: '🪙',
    language: 'en',
    reportType: 'into_crypto_en',
    accentColor: '#4B8BFF', // brand blue — crypto theme
  },
]

export const VALID_FEED_IDS = NEWSLETTERS.map((n) => n.id)

export function getNewsletter(feedId: string): Newsletter | undefined {
  return NEWSLETTERS.find((n) => n.id === feedId)
}

export function getReportType(feedId: string): string {
  return getNewsletter(feedId)?.reportType ?? feedId
}

export function isValidFeed(feedId: string): boolean {
  return VALID_FEED_IDS.includes(feedId)
}
