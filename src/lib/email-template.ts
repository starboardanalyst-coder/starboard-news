export interface BrandConfig {
  brandName: string
  brandLogoUrl?: string
  accentColor: string
  customFooter?: string
}

const DEFAULT_BRAND: BrandConfig = {
  brandName: 'Starboard Analytics',
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
  cardBg: '#f0f5ff',
  thinkBg: '#f0f5ff',
  thinkBorder: '#4B8BFF',
  analysisBg: '#f7f8fa',
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
    `<a href="$2" style="color: ${C.link}; text-decoration: none;">$1</a>`
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
    `<div style="margin: 14px 0; padding: 12px 16px; background: ${C.analysisBg}; border-left: 3px solid ${C.borderAccent}; border-radius: 0 6px 6px 0; font-size: 14px; color: ${C.body}; line-height: 1.7;">$1</div>`
  )

  // Think-about cards: label + following bullet lines → highlighted box with arrows
  html = html.replace(
    /^(Worth thinking about|值得思考|核心主题)[：:]\s*\n((?:[•\-]\s+.+(?:\n|$))+)/gm,
    (_match, _label, bullets) => {
      const items = bullets
        .trim()
        .split('\n')
        .map((line: string) => {
          const text = line.replace(/^[•\-]\s+/, '')
          return `<div style="margin: 6px 0; padding-left: 20px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 0; color: ${C.link};">→</span>${text}</div>`
        })
        .join('')
      return `<div style="margin: 16px 0; padding: 14px 18px; background: ${C.thinkBg}; border-radius: 8px; border: 1px solid ${C.thinkBorder}20;">${items}</div>`
    }
  )

  // Keycap digit section headers: 1️⃣ 2️⃣ 3️⃣ — article titles
  html = html.replace(
    /^(\d️⃣)\s*(.+)$/gmu,
    `<div style="margin-top: 6px; margin-bottom: 14px;"><span style="font-size: 24px; vertical-align: middle;">$1</span> <span style="font-size: 19px; font-weight: 700; color: ${C.heading}; vertical-align: middle; line-height: 1.35;">$2</span></div>`
  )

  // Other emoji section headers (📊 📡 etc.) — secondary headers
  html = html.replace(
    /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*(.+)$/gmu,
    `<div style="margin-top: 4px; margin-bottom: 10px;"><span style="font-size: 16px; vertical-align: middle;">$1</span> <span style="font-size: 15px; font-weight: 600; color: ${C.secondary}; vertical-align: middle;">$2</span></div>`
  )

  // Horizontal rules: ───
  html = html.replace(
    /─{3,}/g,
    `<div style="height: 1px; background: ${C.border}; margin: 28px 0;"></div>`
  )

  // Bullet points: • or - at start of line → arrows
  html = html.replace(
    /^[•\-]\s+(.+)$/gm,
    `<div style="margin: 5px 0; padding-left: 20px; position: relative; color: ${C.body}; font-size: 14px; line-height: 1.7;"><span style="position: absolute; left: 0; color: ${C.link};">→</span>$1</div>`
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
      <!-- Text Logo -->
      <div style="margin-bottom: 28px;">
        <span style="font-size: 14px; font-weight: 700; color: #FFFFFF; letter-spacing: 3px; text-transform: uppercase; font-family: ${FONT};">STARBOARD</span><span style="font-size: 14px; font-weight: 400; color: ${C.heroSub}; letter-spacing: 3px; text-transform: uppercase; font-family: ${FONT};"> ANALYTICS</span>
      </div>
      <!-- Title -->
      <h1 style="margin: 0; color: ${C.heroText}; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; font-family: ${FONT};">
        ${options.emoji} ${options.title}
      </h1>
      <!-- Date -->
      <p style="margin: 12px 0 0 0; color: ${C.heroSub}; font-size: 13px; letter-spacing: 1.5px; font-weight: 400;">
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
