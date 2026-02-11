import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { type, content, date } = await request.json()

    if (!type || !content || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: type, content, date' },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase.from('reports').insert({
      type,
      content,
      date,
      source: 'external',
    })

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      type,
      date,
      content_length: content.length,
    })
  } catch (error) {
    console.error('Content ingest error:', error)
    return NextResponse.json(
      { error: 'Content ingest failed' },
      { status: 500 }
    )
  }
}
