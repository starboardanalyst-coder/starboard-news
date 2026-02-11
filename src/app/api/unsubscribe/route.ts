import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS: CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// GET: Process unsubscribe via token (from email link)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Missing unsubscribe token' },
      { status: 400, headers: corsHeaders }
    )
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, email, status')
    .eq('unsubscribe_token', token)
    .single()

  if (!subscription) {
    return NextResponse.json(
      { error: 'Invalid or expired unsubscribe link' },
      { status: 404, headers: corsHeaders }
    )
  }

  await supabase
    .from('subscriptions')
    .update({
      status: 'unsubscribed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id)

  return NextResponse.json(
    {
      success: true,
      message: 'You have been unsubscribed.',
      email: subscription.email,
    },
    { headers: corsHeaders }
  )
}

// POST: Unsubscribe with token or email
export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token && !email) {
      return NextResponse.json(
        { error: 'Provide a token or email to unsubscribe' },
        { status: 400, headers: corsHeaders }
      )
    }

    let query = supabase.from('subscriptions').select('id, email, status')

    if (token) {
      query = query.eq('unsubscribe_token', token)
    } else {
      query = query.eq('email', email.toLowerCase())
    }

    const { data: subscription } = await query.single()

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    await supabase
      .from('subscriptions')
      .update({
        status: 'unsubscribed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    return NextResponse.json(
      {
        success: true,
        message: 'You have been unsubscribed.',
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
