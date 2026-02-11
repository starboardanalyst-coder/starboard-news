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

    // Check if report already exists for this type+date
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('type', type)
      .eq('date', date)
      .limit(1)

    if (existing && existing.length > 0) {
      // Update existing report
      const { error: updateError } = await supabase
        .from('reports')
        .update({ content, source: 'external' })
        .eq('id', existing[0].id)

      if (updateError) throw updateError
    } else {
      // Insert new report
      const { error: insertError } = await supabase.from('reports').insert({
        type,
        content,
        date,
        source: 'external',
      })

      if (insertError) throw insertError
    }

    // Verify the write
    const { data: verify } = await supabase
      .from('reports')
      .select('id, type, date, created_at')
      .eq('type', type)
      .eq('date', date)
      .limit(1)

    if (!verify || verify.length === 0) {
      throw new Error('Write verification failed: record not found after insert')
    }

    return NextResponse.json({
      success: true,
      type,
      date,
      content_length: content.length,
      id: verify[0].id,
    })
  } catch (error) {
    console.error('Content ingest error:', error)
    return NextResponse.json(
      { error: `Content ingest failed: ${error instanceof Error ? error.message : 'unknown'}` },
      { status: 500 }
    )
  }
}
