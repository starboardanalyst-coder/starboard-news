export interface BrandConfig {
  brandName: string
  brandLogoUrl?: string
  brandColor: string
  customFooter?: string
  accentColor: string
  gradient: string
}

const DEFAULT_BRAND: BrandConfig = {
  brandName: 'Starboard News',
  brandColor: '#6366f1',
  accentColor: '#6366f1',
  gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
}

export function markdownToHtml(text: string): string {
  if (!text) return text

  let html = text

  html = html.replace(/&/g, '&amp;')

  // Convert <url> to clickable links
  html = html.replace(
    /<(https?:\/\/[^>]+)>/g,
    '<a href="$1" style="color: #6366f1; text-decoration: none;">🔗 Link</a>'
  )

  // Bold: **text**
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="color: #1e293b;">$1</strong>'
  )

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" style="color: #6366f1; text-decoration: none;">$1</a>'
  )

  // Section headers with emoji (match common newsletter emojis)
  html = html.replace(
    /^(🐦|📖|🤔|📰|⚡|🪙|🔥|💡|🌍|📊|🎯|📈|📉|🏗️|⛏️|🔋|💰|🧠|🗞️)\s*(.+)$/gm,
    '<div style="margin-top: 32px;"><span style="font-size: 20px;">$1</span> <span style="font-size: 18px; font-weight: 600; color: #0f172a;">$2</span></div>'
  )

  // Horizontal rules
  html = html.replace(
    /─{3,}/g,
    '<div style="height: 1px; background: linear-gradient(to right, #e2e8f0, #cbd5e1, #e2e8f0); margin: 24px 0;"></div>'
  )

  // Numbered list items
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    '<div style="margin: 12px 0; padding-left: 8px; border-left: 3px solid #e2e8f0;"><span style="color: #6366f1; font-weight: 600;">$1.</span> $2</div>'
  )

  // Paragraphs
  html = html.replace(
    /\n\n/g,
    '</p><p style="margin: 16px 0; line-height: 1.8; color: #475569;">'
  )
  html = html.replace(/\n/g, '<br>')

  return `<p style="margin: 16px 0; line-height: 1.8; color: #475569;">${html}</p>`
}

export function buildEmailHtml(options: {
  title: string
  emoji: string
  date: string
  content: string
  unsubscribeUrl: string
  brand?: Partial<BrandConfig>
}): string {
  const brand = { ...DEFAULT_BRAND, ...options.brand }
  const formatted = markdownToHtml(options.content)

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff;">

    <!-- Header -->
    <div style="background: ${brand.gradient}; padding: 40px 32px; text-align: center;">
      ${brand.brandLogoUrl ? `<img src="${brand.brandLogoUrl}" alt="${brand.brandName}" style="height: 40px; margin-bottom: 16px;" />` : ''}
      <div style="font-size: 48px; margin-bottom: 16px;">${options.emoji}</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
        ${options.title}
      </h1>
      <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
        ${options.date}
      </p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      ${formatted}
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      ${brand.customFooter ? `<div style="margin-bottom: 16px;">${brand.customFooter}</div>` : ''}
      <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
        Powered by <a href="https://starboard.to" style="color: ${brand.accentColor}; text-decoration: none; font-weight: 500;">Starboard</a>
      </p>
      <a href="${options.unsubscribeUrl}" style="display: inline-block; padding: 10px 24px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 13px;">
        Unsubscribe
      </a>
    </div>

  </div>
</body>
</html>`
}
