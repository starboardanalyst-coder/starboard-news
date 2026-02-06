import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const VALID_FEEDS = ['minor_news', 'into_crypto_cn', 'into_crypto_en', 'crypto_ai']

export async function POST(request: NextRequest) {
  try {
    const { email, feeds } = await request.json()

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    // Validate feeds
    if (!feeds || !Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一个订阅频道' },
        { status: 400 }
      )
    }

    const validFeeds = feeds.filter(f => VALID_FEEDS.includes(f))
    if (validFeeds.length === 0) {
      return NextResponse.json(
        { error: '无效的订阅频道' },
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

      return NextResponse.json({ 
        success: true, 
        message: '订阅已更新',
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

    return NextResponse.json({ 
      success: true, 
      message: '订阅成功',
      feeds: validFeeds 
    })

  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    )
  }
}
