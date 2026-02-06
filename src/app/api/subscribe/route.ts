import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en']

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function markdownToHtml(text: string): string {
  if (!text) return text
  
  let html = text
  
  // Don't escape < and > for now, handle links specially
  html = html.replace(/&/g, '&amp;')
  
  // Convert <url> to clickable links
  html = html.replace(/<(https?:\/\/[^>]+)>/g, '<a href="$1" style="color: #6366f1; text-decoration: none;">🔗 Link</a>')
  
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color: #1e293b;">$1</strong>')
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #6366f1; text-decoration: none;">$1</a>')
  
  // Section headers with emoji (special styling)
  html = html.replace(/^(🐦|📖|🤔|📰)\s*(.+)$/gm, '<div style="margin-top: 32px;"><span style="font-size: 20px;">$1</span> <span style="font-size: 18px; font-weight: 600; color: #0f172a;">$2</span></div>')
  
  // Horizontal rules ───
  html = html.replace(/─{3,}/g, '<div style="height: 1px; background: linear-gradient(to right, #e2e8f0, #cbd5e1, #e2e8f0); margin: 24px 0;"></div>')
  
  // Numbered list items
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin: 12px 0; padding-left: 8px; border-left: 3px solid #e2e8f0;"><span style="color: #6366f1; font-weight: 600;">$1.</span> $2</div>')
  
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.8; color: #475569;">')
  html = html.replace(/\n/g, '<br>')
  
  return `<p style="margin: 16px 0; line-height: 1.8; color: #475569;">${html}</p>`
}

async function sendNewsletter(email: string, feedType: string): Promise<void> {
  const reportType = feedType === 'minor_news' ? 'daily' : feedType
  
  const { data: reports } = await supabase
    .from('reports')
    .select('content, date')
    .eq('type', reportType)
    .order('date', { ascending: false })
    .limit(1)
  
  if (!reports || reports.length === 0) {
    console.log(`No content found for ${feedType}`)
    return
  }
  
  const content = reports[0].content
  const date = reports[0].date
  const formatted = markdownToHtml(content)
  
  let title: string
  let emoji: string
  let gradient: string
  let accentColor: string
  
  if (feedType === 'into_crypto_cn') {
    title = `Into Crypto 中文版`
    emoji = '🪙'
    gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    accentColor = '#667eea'
  } else if (feedType === 'into_crypto_en') {
    title = `Into Crypto`
    emoji = '🪙'
    gradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    accentColor = '#667eea'
  } else {
    title = `Minor News`
    emoji = '⚡'
    gradient = 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
    accentColor = '#f59e0b'
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff;">
        
        <!-- Header -->
        <div style="background: ${gradient}; padding: 40px 32px; text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">${emoji}</div>
          <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
            ${title}
          </h1>
          <p style="margin: 12px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
            ${date}
          </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 32px;">
          ${formatted}
        </div>
        
        <!-- Footer -->
        <div style="background: #f8fafc; padding: 32px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px 0; color: #64748b; font-size: 14px;">
            Powered by <a href="https://starboard.to" style="color: ${accentColor}; text-decoration: none; font-weight: 500;">Starboard</a>
          </p>
          <a href="https://news.starboard.to" style="display: inline-block; padding: 10px 24px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 6px; font-size: 13px;">
            Manage Subscription
          </a>
        </div>
        
      </div>
    </body>
    </html>
  `
  
  const subject = `${emoji} ${title} | ${date}`
  
  await transporter.sendMail({
    from: `Starboard News <${process.env.GMAIL_USER}>`,
    to: email,
    subject: subject,
    html: html,
  })
  
  console.log(`✅ Sent ${feedType} to ${email}`)
}

export async function POST(request: NextRequest) {
  try {
    const { email, feeds } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one newsletter' }, { status: 400 })
    }

    const validFeeds = feeds.filter((f: string) => VALID_FEEDS.includes(f))
    if (validFeeds.length === 0) {
      return NextResponse.json({ error: 'Invalid newsletter selection' }, { status: 400 })
    }

    const emailLower = email.toLowerCase()

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, feeds, status')
      .eq('email', emailLower)
      .single()

    if (existing) {
      const mergedFeeds = Array.from(new Set([...existing.feeds, ...validFeeds]))
      
      await supabase
        .from('subscriptions')
        .update({ 
          feeds: mergedFeeds,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      // Await all emails before returning
      await Promise.all(validFeeds.map((feed: string) => 
        sendNewsletter(emailLower, feed).catch(e => console.error(`Failed ${feed}:`, e))
      ))

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated! Check your inbox.',
        feeds: mergedFeeds 
      })
    }

    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        email: emailLower,
        feeds: validFeeds,
        status: 'active',
      })

    if (insertError) throw insertError

    // Await all emails before returning
    await Promise.all(validFeeds.map((feed: string) => 
      sendNewsletter(emailLower, feed).catch(e => console.error(`Failed ${feed}:`, e))
    ))

    return NextResponse.json({ 
      success: true, 
      message: 'Subscribed! Check your inbox.',
      feeds: validFeeds 
    })

  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: 'Server error, please try again' }, { status: 500 })
  }
}
