import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { NEWSLETTERS, VALID_FEED_IDS, isValidFeed } from '@/lib/newsletters'
import { generateUnsubscribeToken } from '@/lib/tokens'
import { sendNewsletter } from '@/lib/email'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

// GET: Return available newsletters
export async function GET() {
  return NextResponse.json(
    {
      newsletters: NEWSLETTERS.map(({ id, name, description, emoji, language }) => ({
        id,
        name,
        description,
        emoji,
        language,
      })),
      usage: {
        endpoint: 'POST /api/subscribe',
        body: {
          email: 'user@example.com',
          feeds: ['minor_news', 'into_crypto_cn'],
        },
      },
    },
    { headers: corsHeaders }
  )
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// POST: Subscribe to newsletters
export async function POST(request: NextRequest) {
  try {
    const { email, feeds, partner_slug } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one newsletter' },
        { status: 400, headers: corsHeaders }
      )
    }

    const validFeeds = feeds.filter((f: string) => isValidFeed(f))
    if (validFeeds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid newsletter selection' },
        { status: 400, headers: corsHeaders }
      )
    }

    const emailLower = email.toLowerCase()
    const slug = partner_slug || 'starboard'

    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id, feeds, status, unsubscribe_token')
      .eq('email', emailLower)
      .single()

    if (existing) {
      const mergedFeeds = Array.from(new Set([...existing.feeds, ...validFeeds]))
      const token = existing.unsubscribe_token || generateUnsubscribeToken()

      await supabase
        .from('subscriptions')
        .update({
          feeds: mergedFeeds,
          status: 'active',
          unsubscribe_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      // Send latest newsletter for new feeds
      await Promise.all(
        validFeeds.map((feed: string) =>
          sendNewsletter(emailLower, feed, token).catch((e) =>
            console.error(`Failed ${feed}:`, e)
          )
        )
      )

      return NextResponse.json(
        {
          success: true,
          message: 'Subscription updated! Check your inbox.',
          feeds: mergedFeeds,
        },
        { headers: corsHeaders }
      )
    }

    // New subscription
    const token = generateUnsubscribeToken()

    const { error: insertError } = await supabase.from('subscriptions').insert({
      email: emailLower,
      feeds: validFeeds,
      status: 'active',
      partner_slug: slug,
      unsubscribe_token: token,
    })

    if (insertError) throw insertError

    // Send latest newsletter
    await Promise.all(
      validFeeds.map((feed: string) =>
        sendNewsletter(emailLower, feed, token).catch((e) =>
          console.error(`Failed ${feed}:`, e)
        )
      )
    )

    return NextResponse.json(
      {
        success: true,
        message: 'Subscribed! Check your inbox.',
        feeds: validFeeds,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: 'Server error, please try again' },
      { status: 500, headers: corsHeaders }
    )
  }
}
