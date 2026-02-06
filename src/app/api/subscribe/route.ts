import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en']

// Simple email sender using fetch to Gmail SMTP relay isn't possible
// We'll trigger a webhook to our local server instead
async function triggerWelcomeEmail(email: string, feeds: string[]) {
  // Store the welcome email request in Supabase for the cron to pick up
  try {
    await supabase
      .from('welcome_emails')
      .insert({
        email: email,
        feeds: feeds,
        status: 'pending',
        created_at: new Date().toISOString()
      })
  } catch (e) {
    console.error('Failed to queue welcome email:', e)
  }
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

      // Still send welcome email for resubscribers
      triggerWelcomeEmail(emailLower, validFeeds)

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

    // Queue welcome email
    triggerWelcomeEmail(emailLower, validFeeds)

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
