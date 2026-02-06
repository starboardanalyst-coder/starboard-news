import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en']

// Gmail transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

async function sendWelcomeEmail(email: string, feeds: string[]) {
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch today's content for subscribed feeds
  const contentParts: string[] = []
  
  for (const feed of feeds) {
    let type = feed
    if (feed === 'minor_news') type = 'daily'
    
    const { data } = await supabase
      .from('reports')
      .select('content, type')
      .eq('date', today)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (data?.content) {
      const feedName = feed === 'minor_news' ? 'Minor News' 
        : feed === 'into_crypto_cn' ? 'Into Crypto (CN)'
        : 'Into Crypto (EN)'
      
      let content = data.content
      // If content is JSON (Minor News), format it
      if (feed === 'minor_news') {
        try {
          const items = typeof content === 'string' ? JSON.parse(content) : content
          content = items.map((item: any) => 
            `**${item.rank}. ${item.title}**\n${item.what_happened}\n💡 ${item.insight}\n🔗 ${item.url}`
          ).join('\n\n')
        } catch (e) {
          // Use as-is if not JSON
        }
      }
      
      contentParts.push(`
        <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
          <h2 style="margin: 0 0 15px 0; color: #1a1a1a;">${feedName}</h2>
          <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #374151;">${content}</div>
        </div>
      `)
    }
  }
  
  if (contentParts.length === 0) {
    // No content yet today, send simple welcome
    const html = `
      <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Welcome to Starboard News! 🎉</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Thanks for subscribing! You'll start receiving your curated news tomorrow.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your subscriptions: <strong>${feeds.map(f => f.replace('_', ' ')).join(', ')}</strong>
        </p>
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; text-align: center;">
          <p>Powered by <a href="https://starboard.to" style="color: #3b82f6;">Starboard</a></p>
        </div>
      </body>
      </html>
    `
    
    await transporter.sendMail({
      from: `Starboard News <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Starboard News! 🎉',
      html,
    })
    return
  }
  
  // Send welcome email with today's content
  const html = `
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">Welcome to Starboard News! 🎉</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Here's today's content to get you started:
      </p>
      ${contentParts.join('')}
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 13px; color: #9ca3af; text-align: center;">
        <p>Powered by <a href="https://starboard.to" style="color: #3b82f6;">Starboard</a></p>
        <p><a href="https://news.starboard.to" style="color: #3b82f6;">Manage subscription</a></p>
      </div>
    </body>
    </html>
  `
  
  await transporter.sendMail({
    from: `Starboard News <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Welcome to Starboard News! Here's today's digest 🎉`,
    html,
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

    const validFeeds = feeds.filter(f => VALID_FEEDS.includes(f))
    if (validFeeds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid newsletter selection' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, feeds, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      // Update existing subscription
      const mergedFeeds = Array.from(new Set([...existing.feeds, ...validFeeds]))
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({ 
          feeds: mergedFeeds,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)

      if (updateError) throw updateError

      // Send welcome email with new feeds
      const newFeeds = validFeeds.filter(f => !existing.feeds.includes(f))
      if (newFeeds.length > 0) {
        sendWelcomeEmail(email.toLowerCase(), newFeeds).catch(console.error)
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated',
        feeds: mergedFeeds 
      })
    }

    // Create new subscription
    const { error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        email: email.toLowerCase(),
        feeds: validFeeds,
        status: 'active',
      })

    if (insertError) throw insertError

    // Send welcome email (don't await to avoid timeout)
    sendWelcomeEmail(email.toLowerCase(), validFeeds).catch(console.error)

    return NextResponse.json({ 
      success: true, 
      message: 'Subscribed successfully',
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
