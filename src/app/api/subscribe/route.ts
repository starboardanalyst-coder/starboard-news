import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en']

const FEED_INFO: Record<string, { name: string; emoji: string; description: string; schedule: string; color: string }> = {
  'into_crypto_cn': {
    name: 'Into Crypto (中文版)',
    emoji: '🪙',
    description: '每日两期 Crypto 科普，用最简单的语言解释复杂概念',
    schedule: '每天 08:00 和 13:00 (GMT)',
    color: '#8b5cf6'
  },
  'into_crypto_en': {
    name: 'Into Crypto (English)',
    emoji: '🪙',
    description: 'Twice-daily crypto education, explaining complex concepts in plain language',
    schedule: 'Daily at 08:00 and 13:00 (GMT)',
    color: '#8b5cf6'
  },
  'minor_news': {
    name: 'Minor News',
    emoji: '⚡',
    description: '每日能源、数据中心、比特币矿场新闻精选',
    schedule: '每天 08:30 (GMT)',
    color: '#f59e0b'
  }
}

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

function buildWelcomeEmail(feeds: string[]): string {
  const feedCards = feeds
    .filter(f => FEED_INFO[f])
    .map(feed => {
      const info = FEED_INFO[feed]
      return `
        <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border-left: 4px solid ${info.color};">
          <h3 style="margin: 0 0 8px 0; color: #1e293b; font-size: 18px;">
            ${info.emoji} ${info.name}
          </h3>
          <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px;">
            ${info.description}
          </p>
          <p style="margin: 0; color: #94a3b8; font-size: 13px;">
            📅 ${info.schedule}
          </p>
        </div>
      `
    }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
      
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #0f172a; font-size: 28px; margin: 0 0 12px 0;">
          Welcome to Starboard News! 🎉
        </h1>
        <p style="color: #64748b; font-size: 16px; margin: 0;">
          You're all set to receive the latest insights.
        </p>
      </div>
      
      <div style="margin-bottom: 30px;">
        <h2 style="color: #334155; font-size: 16px; font-weight: 600; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          Your Subscriptions
        </h2>
        ${feedCards}
      </div>
      
      <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 30px 0;">
        <p style="margin: 0; color: #166534; font-size: 14px;">
          ✅ Your first newsletter will arrive at the next scheduled time. No action needed!
        </p>
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
}

async function sendWelcomeEmail(email: string, feeds: string[]) {
  const html = buildWelcomeEmail(feeds)
  
  await transporter.sendMail({
    from: `Starboard News <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Welcome to Starboard News! 🎉',
    html: html,
  })
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

      // Send welcome email immediately (async, don't wait)
      sendWelcomeEmail(emailLower, validFeeds).catch(e => 
        console.error('Welcome email failed:', e)
      )

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

    // Send welcome email immediately (async, don't wait)
    sendWelcomeEmail(emailLower, validFeeds).catch(e => 
      console.error('Welcome email failed:', e)
    )

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
