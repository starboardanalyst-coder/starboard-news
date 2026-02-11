export interface Newsletter {
  id: string
  name: string
  description: string
  emoji: string
  language: string
  reportType: string // maps to reports table 'type' column
  gradient: string
  accentColor: string
}

export const NEWSLETTERS: Newsletter[] = [
  {
    id: 'minor_news',
    name: 'Minor News',
    description: 'Daily crypto & energy infrastructure news digest',
    emoji: '⚡',
    language: 'en',
    reportType: 'daily',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
    accentColor: '#f59e0b',
  },
  {
    id: 'into_crypto_cn',
    name: 'Into Crypto 中文版',
    description: '每日加密货币深度分析',
    emoji: '🪙',
    language: 'zh',
    reportType: 'into_crypto_cn',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accentColor: '#667eea',
  },
  {
    id: 'into_crypto_en',
    name: 'Into Crypto',
    description: 'Daily crypto analysis and insights',
    emoji: '🪙',
    language: 'en',
    reportType: 'into_crypto_en',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accentColor: '#667eea',
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
