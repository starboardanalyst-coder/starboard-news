import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en']

// Create reusable transporter
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
  
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  html = html.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, '<a href="$1" style="color: #3b82f6;">$1</a>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3b82f6;">$1</a>')
  html = html.replace(/🔗\s*(https?:\/\/\S+)/g, '🔗 <a href="$1" style="color: #3b82f6;">Source</a>')
  html = html.replace(/─{3,}/g, '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">')
  html = html.replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.8;">')
  html = html.replace(/\n/g, '<br>')
  return `<p style="margin: 16px 0; line-height: 1.8;">${html}</p>`
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
  let color: string
  
  if (feedType === 'into_crypto_cn') {
    title = `🪙 Into Crypto (中文版) | ${date}`
    color = '#8b5cf6'
  } else if (feedType === 'into_crypto_en') {
    title = `🪙 Into Crypto (English) | ${date}`
    color = '#8b5cf6'
  } else {
    title = `⚡ Minor News | ${date}`
    color = '#f59e0b'
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; background: #fff; color: #334155;">
      <div style="border-bottom: 3px solid ${color}; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #0f172a; font-size: 24px; margin: 0;">${title}</h1>
      </div>
      <div style="font-size: 15px; line-height: 1.8;">${formatted}</div>
      <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px;">
          <a href="https://news.starboard.to" style="color: #3b82f6;">Manage subscription</a>
        </p>
      </div>
    </body>
    </html>
  `
  
  await transporter.sendMail({
    from: `Starboard News <${process.env.GMAIL_USER}>`,
    to: email,
    subject: title,
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

    // Check if email already exists
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

      // Send emails BEFORE returning - await all of them
      const emailPromises = validFeeds.map((feed: string) => 
        sendNewsletter(emailLower, feed).catch(e => console.error(`Failed ${feed}:`, e))
      )
      await Promise.all(emailPromises)

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated! Check your inbox.',
        feeds: mergedFeeds 
      })
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        email: emailLower,
        feeds: validFeeds,
        status: 'active',
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      throw insertError
    }

    // Send emails BEFORE returning - await all of them
    const emailPromises = validFeeds.map((feed: string) => 
      sendNewsletter(emailLower, feed).catch(e => console.error(`Failed ${feed}:`, e))
    )
    await Promise.all(emailPromises)

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
