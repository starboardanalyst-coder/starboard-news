export interface BrandConfig {
  brandName: string
  brandLogoUrl?: string
  accentColor: string
  customFooter?: string
}

const DEFAULT_BRAND: BrandConfig = {
  brandName: 'Starboard Analytics',
  brandLogoUrl: 'https://news.starboard.to/images/logo-email.png',
  accentColor: '#4B8BFF',
}

// Color tokens
const C = {
  // Hero (dark)
  heroBg: '#000C24',
  heroText: '#FFFFFF',
  heroSub: '#8896A6',
  // Content (light)
  pageBg: '#f4f4f5',
  contentBg: '#FFFFFF',
  cardBg: '#f7f8fa',
  border: '#e8ecf0',
  borderAccent: '#4B8BFF',
  // Typography
  heading: '#111827',
  body: '#374151',
  secondary: '#6b7280',
  muted: '#9ca3af',
  link: '#4B8BFF',
  // Footer
  footerBg: '#f7f8fa',
}

const FONT =
  "'Inter', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export function markdownToHtml(text: string): string {
  if (!text) return text

  let html = text

  // Strip the first line if it's a title that duplicates the hero
  // Matches patterns like: 🪙 Into Crypto | 2026-02-11 or ⚡ Minor News 每日... | 2026-02-11
  html = html.replace(/^.+\|\s*\d{4}-\d{2}-\d{2}\s*\n+/, '')

  html = html.replace(/&/g, '&amp;')

  // Convert <url> to clickable links
  html = html.replace(
    /<(https?:\/\/[^>]+)>/g,
    `<a href="$1" style="color: ${C.link}; text-decoration: none;">$1</a>`
  )

  // Bold: **text**
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    `<strong style="color: ${C.heading}; font-weight: 600;">$1</strong>`
  )

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" style="color: ${C.link}; text-decoration: none; border-bottom: 1px solid rgba(75,139,255,0.3);">$1</a>`
  )

  // Source links: 🔗 followed by URL
  html = html.replace(
    /^🔗\s*(https?:\/\/\S+)$/gm,
    `<div style="margin: 8px 0 4px;"><a href="$1" style="color: ${C.muted}; text-decoration: none; font-size: 13px;">🔗 Source</a></div>`
  )

  // Metadata pills: 📍 at start of line
  html = html.replace(
    /^📍\s*(.+)$/gm,
    `<div style="margin: 6px 0 10px;"><span style="font-size: 12px; color: ${C.secondary}; line-height: 1.5;">📍 $1</span></div>`
  )

  // Analysis box: 💡 at start of line
  html = html.replace(
    /^💡\s*(.+)$/gm,
    `<div style="margin: 12px 0; padding: 12px 16px; background: ${C.cardBg}; border-left: 3px solid ${C.borderAccent}; border-radius: 0 6px 6px 0; font-size: 14px; color: ${C.body}; line-height: 1.7;">$1</div>`
  )

  // Remove label lines: 值得思考 / Worth thinking about / 核心主题 — strip entirely
  html = html.replace(
    /^(Worth thinking about|值得思考|核心主题)[：:]\s*$/gm,
    ''
  )

  // Keycap digit section headers: 1️⃣ 2️⃣ 3️⃣ — article titles (no border)
  html = html.replace(
    /^(\d️⃣)\s*(.+)$/gmu,
    `<div style="margin-top: 8px; margin-bottom: 12px;"><span style="font-size: 22px; vertical-align: middle;">$1</span> <span style="font-size: 18px; font-weight: 700; color: ${C.heading}; vertical-align: middle; line-height: 1.3;">$2</span></div>`
  )

  // Other emoji section headers (📊 📡 etc.) — secondary headers
  html = html.replace(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.+)$/gmu,
    `<div style="margin-top: 4px; margin-bottom: 10px;"><span style="font-size: 16px; vertical-align: middle;">$1</span> <span style="font-size: 15px; font-weight: 600; color: ${C.secondary}; vertical-align: middle;">$2</span></div>`
  )

  // Horizontal rules: ───
  html = html.replace(
    /─{3,}/g,
    `<div style="height: 1px; background: ${C.border}; margin: 24px 0;"></div>`
  )

  // Bullet points: • or - at start of line
  html = html.replace(
    /^[•\-]\s+(.+)$/gm,
    `<div style="margin: 5px 0; padding-left: 18px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 2px; color: ${C.muted};">•</span>$1</div>`
  )

  // Numbered list items
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    `<div style="margin: 8px 0; padding-left: 22px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 0; color: ${C.link}; font-weight: 600; font-size: 13px;">$1.</span>$2</div>`
  )

  // Clean up newlines adjacent to block elements (prevents spurious <br>)
  html = html.replace(/<\/div>\n+/g, '</div>')
  html = html.replace(/\n+<div/g, '<div')

  // Paragraphs
  html = html.replace(
    /\n\n/g,
    `</p><p style="margin: 12px 0; line-height: 1.8; color: ${C.body}; font-size: 15px;">`
  )
  html = html.replace(/\n/g, '<br>')

  return `<p style="margin: 12px 0; line-height: 1.8; color: ${C.body}; font-size: 15px;">${html}</p>`
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
  const accent = brand.accentColor || C.link

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title} | ${options.date}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${C.pageBg}; font-family: ${FONT}; -webkit-font-smoothing: antialiased;">

  <div style="max-width: 640px; margin: 0 auto;">

    <!-- Hero -->
    <div style="background: ${C.heroBg}; padding: 40px 32px 36px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 24px;">
        ${brand.brandLogoUrl
          ? `<img src="${brand.brandLogoUrl}" alt="${brand.brandName}" width="200" height="60" style="display: inline-block; border: 0; max-width: 200px; height: auto; color: ${C.heroSub}; font-size: 14px; font-family: ${FONT};" />`
          : `<span style="font-size: 22px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px; font-family: ${FONT};">Starboard</span><span style="font-size: 22px; font-weight: 400; color: ${C.heroSub}; font-family: ${FONT};"> Analytics</span>`
        }
      </div>
      <!-- Title -->
      <h1 style="margin: 0; color: ${C.heroText}; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; font-family: ${FONT};">
        ${options.emoji} ${options.title}
      </h1>
      <!-- Date -->
      <p style="margin: 10px 0 0 0; color: ${C.heroSub}; font-size: 13px; letter-spacing: 1.5px; font-weight: 400;">
        ${options.date}
      </p>
      <!-- Accent line -->
      <div style="margin-top: 32px; height: 2px; background: linear-gradient(to right, transparent, ${accent}, transparent);"></div>
    </div>

    <!-- Content -->
    <div style="background: ${C.contentBg}; padding: 28px 36px 40px;">
      ${formatted}
    </div>

    <!-- Footer -->
    <div style="background: ${C.footerBg}; padding: 24px 32px; text-align: center; border-top: 1px solid ${C.border};">
      ${brand.customFooter ? `<div style="margin-bottom: 14px; color: ${C.secondary}; font-size: 13px;">${brand.customFooter}</div>` : ''}
      <p style="margin: 0 0 16px 0;">
        <span style="color: ${C.muted}; font-size: 12px;">${brand.brandName}</span>
      </p>
      <a href="${options.unsubscribeUrl}" style="color: ${C.muted}; text-decoration: none; font-size: 12px;">
        Unsubscribe
      </a>
    </div>

  </div>
</body>
</html>`
}
