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

// Color tokens: dark hero + white content body
const C = {
  // Hero (dark)
  heroBg: '#000C24',
  heroText: '#FFFFFF',
  heroSub: '#6B7280',
  // Content (light)
  pageBg: '#f4f4f5',
  contentBg: '#FFFFFF',
  cardBg: '#f8fafc',
  border: '#e2e8f0',
  borderAccent: '#001B44',
  // Typography
  heading: '#0f172a',
  body: '#475569',
  secondary: '#64748b',
  muted: '#94a3b8',
  link: '#4B8BFF',
  // Footer
  footerBg: '#f8fafc',
}

const FONT =
  "'Inter', 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export function markdownToHtml(text: string): string {
  if (!text) return text

  let html = text

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
    `<a href="$2" style="color: ${C.link}; text-decoration: none;">$1</a>`
  )

  // Source links: 🔗 followed by URL (before section header regex)
  html = html.replace(
    /^🔗\s*(https?:\/\/\S+)$/gm,
    `<div style="margin: 12px 0;"><a href="$1" style="color: ${C.muted}; text-decoration: none; font-size: 12px;">🔗 Source</a></div>`
  )

  // Metadata lines: 📍 at start of line
  html = html.replace(
    /^📍\s*(.+)$/gm,
    `<div style="margin: 8px 0;"><span style="display: inline-block; padding: 5px 12px; background: ${C.cardBg}; border: 1px solid ${C.border}; border-radius: 6px; font-size: 12px; color: ${C.secondary}; line-height: 1.4;">📍 $1</span></div>`
  )

  // Analysis lines: 💡 at start of line
  html = html.replace(
    /^💡\s*(.+)$/gm,
    `<div style="margin: 16px 0; padding: 14px 18px; background: ${C.cardBg}; border-left: 3px solid ${C.borderAccent}; border-radius: 0 8px 8px 0;"><span style="font-size: 14px;">💡</span> <span style="color: ${C.body}; font-size: 14px; line-height: 1.7;">$1</span></div>`
  )

  // Label lines: 值得思考 / Worth thinking about / 核心主题
  html = html.replace(
    /^(Worth thinking about|值得思考|核心主题)[：:]\s*$/gm,
    `<div style="margin-top: 24px; margin-bottom: 10px; font-size: 11px; font-weight: 600; color: ${C.secondary}; text-transform: uppercase; letter-spacing: 2px;">$1</div>`
  )

  // Section headers: emoji (or keycap digit) at start of line followed by text
  html = html.replace(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\d️⃣)\s*(.+)$/gmu,
    `<div style="margin-top: 36px; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid ${C.border};"><span style="font-size: 26px; vertical-align: middle;">$1</span> <span style="font-size: 19px; font-weight: 700; color: ${C.heading}; letter-spacing: -0.3px; vertical-align: middle;">$2</span></div>`
  )

  // Horizontal rules
  html = html.replace(
    /─{3,}/g,
    `<div style="height: 1px; background: ${C.border}; margin: 28px 0;"></div>`
  )

  // Bullet points: • or - at start of line
  html = html.replace(
    /^[•\-]\s+(.+)$/gm,
    `<div style="margin: 6px 0; padding-left: 20px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 4px; color: ${C.link};">•</span>$1</div>`
  )

  // Numbered list items
  html = html.replace(
    /^(\d+)\.\s+(.+)$/gm,
    `<div style="margin: 10px 0; padding-left: 24px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 0; color: ${C.link}; font-weight: 600; font-size: 13px;">$1.</span>$2</div>`
  )

  // Clean up newlines adjacent to block elements (prevents spurious <br>)
  html = html.replace(/<\/div>\n/g, '</div>')
  html = html.replace(/\n<div/g, '<div')

  // Paragraphs
  html = html.replace(
    /\n\n/g,
    `</p><p style="margin: 14px 0; line-height: 1.8; color: ${C.body}; font-size: 15px;">`
  )
  html = html.replace(/\n/g, '<br>')

  return `<p style="margin: 14px 0; line-height: 1.8; color: ${C.body}; font-size: 15px;">${html}</p>`
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

  const logoHtml = brand.brandLogoUrl
    ? `<img src="${brand.brandLogoUrl}" alt="${brand.brandName}" height="36" style="display: inline-block; border: 0;" />`
    : `<span style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px; font-family: ${FONT};">Starboard</span><span style="font-size: 20px; font-weight: 700; color: #6B7280; font-family: ${FONT};"> Analytics</span>`

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
    <div style="background: ${C.heroBg}; padding: 48px 32px 44px; text-align: center;">
      <!-- Logo -->
      <div style="margin-bottom: 28px;">
        ${brand.brandLogoUrl
          ? `<img src="${brand.brandLogoUrl}" alt="${brand.brandName}" height="52" style="display: inline-block; border: 0;" />`
          : `<span style="font-size: 28px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px; font-family: ${FONT};">Starboard</span><span style="font-size: 28px; font-weight: 700; color: #6B7280; font-family: ${FONT};"> Analytics</span>`
        }
      </div>
      <!-- Title -->
      <h1 style="margin: 0; color: ${C.heroText}; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; font-family: ${FONT};">
        ${options.emoji} ${options.title}
      </h1>
      <!-- Date -->
      <p style="margin: 12px 0 0 0; color: ${C.heroSub}; font-size: 13px; letter-spacing: 2px; font-weight: 400;">
        ${options.date}
      </p>
      <!-- Accent line -->
      <div style="margin-top: 36px; height: 2px; background: linear-gradient(to right, ${C.heroBg}, ${accent}, ${C.heroBg});"></div>
    </div>

    <!-- Content -->
    <div style="background: ${C.contentBg}; padding: 12px 36px 48px;">
      ${formatted}
    </div>

    <!-- Footer -->
    <div style="background: ${C.footerBg}; padding: 28px 32px; text-align: center; border-top: 1px solid ${C.border};">
      ${brand.customFooter ? `<div style="margin-bottom: 16px; color: ${C.secondary}; font-size: 13px;">${brand.customFooter}</div>` : ''}
      <p style="margin: 0 0 4px 0; color: ${C.muted}; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">
        POWERED BY
      </p>
      <p style="margin: 0 0 20px 0;">
        <span style="color: ${C.secondary}; font-size: 13px; font-weight: 600; letter-spacing: -0.2px;">${brand.brandName}</span>
      </p>
      <a href="${options.unsubscribeUrl}" style="display: inline-block; padding: 7px 18px; color: ${C.muted}; text-decoration: none; border-radius: 6px; font-size: 12px; border: 1px solid ${C.border};">
        Unsubscribe
      </a>
    </div>

  </div>
</body>
</html>`
}
