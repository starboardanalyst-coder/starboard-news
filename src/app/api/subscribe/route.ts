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
  
  // Escape HTML
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  
  // Fix escaped links back
  html = html.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, '<a href="$1" style="color: #3b82f6;">$1</a>')
  
  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  
  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #3b82f6;">$1</a>')
  
  // Emoji links
  html = html.replace(/🔗\s*(https?:\/\/\S+)/g, '🔗 <a href="$1" style="color: #3b82f6;">Source</a>')
  
  // Horizontal rules
  html = html.replace(/─{3,}/g, '<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">')
  
  // Line breaks
  html = html.replace(/\n\n/g, '</p><p style="margin: 16px 0; line-height: 1.8;">')
  html = html.replace(/\n/g, '<br>')
  
  return `<p style="margin: 16px 0; line-height: 1.8;">${html}</p>`
}

function buildNewsletterEmail(content: string, feedType: string, date: string): { subject: string; html: string } {
  const formattedContent = markdownToHtml(content)
  
  let title: string
  let headerColor: string
  
  if (feedType === 'into_crypto_cn') {
    title = `🪙 Into Crypto (中文版) | ${date}`
    headerColor = '#8b5cf6'
  } else if (feedType === 'into_crypto_en') {
    title = `🪙 Into Crypto (English) | ${date}`
    headerColor = '#8b5cf6'
  } else {
    title = `⚡ Minor News | ${date}`
    headerColor = '#f59e0b'
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; background: #ffffff; color: #334155;">
      
      <div style="border-bottom: 3px solid ${headerColor}; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #0f172a; font-size: 24px; margin: 0;">
          ${title}
        </h1>
      </div>
      
      <div style="font-size: 15px; line-height: 1.8; color: #334155;">
        ${formattedContent}
      </div>
      
      <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px 0;">
          Powered by <a href="https://starboard.to" style="color: #3b82f6; text-decoration: none;">Starboard</a>
        </p>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
          <a href="https://news.starboard.to" style="color: #3b82f6; text-decoration: none;">Manage subscription</a>
        </p>
      </div>
      
    </body>
    </html>
  `

  return { subject: title, html }
}

async function sendLatestNewsletter(email: string, feedType: string) {
  // Map feed type to report type
  const reportType = feedType === 'minor_news' ? 'daily' : feedType
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  
  // Get latest content for this feed
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
  
  // Build and send email
  const { subject, html } = buildNewsletterEmail(content, feedType, date)
  
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

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate feeds
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one newsletter' },
        { status: 400 }
      )
    }

    const validFeeds = feeds.filter((f: string) => VALID_FEEDS.includes(f))
    if (validFeeds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid newsletter selection' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, feeds, status')
      .eq('email', emailLower)
      .single()

    if (existing) {
      // Email exists - merge feeds and reactivate
      const mergedFeeds = Array.from(new Set([...existing.feeds, ...validFeeds]))
      
      await supabase
        .from('subscriptions')
        .update({ 
          feeds: mergedFeeds,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      // Send latest newsletter for each NEW feed immediately (separate emails)
      for (const feed of validFeeds) {
        sendLatestNewsletter(emailLower, feed).catch(e => 
          console.error(`Failed to send ${feed}:`, e)
        )
      }

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

    // Send latest newsletter for each feed immediately (separate emails)
    for (const feed of validFeeds) {
      sendLatestNewsletter(emailLower, feed).catch(e => 
        console.error(`Failed to send ${feed}:`, e)
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscribed! Check your inbox.',
      feeds: validFeeds 
    })

  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Server error, please try again' },
      { status: 500 }
    )
  }
}
