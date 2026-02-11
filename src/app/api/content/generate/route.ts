import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateContent, getSupportedReportTypes } from '@/lib/claude'

export const maxDuration = 120

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { type, date, sources } = await request.json()

    if (!type || !date || !sources) {
      return NextResponse.json(
        { error: 'Missing required fields: type, date, sources' },
        { status: 400 }
      )
    }

    const supportedTypes = getSupportedReportTypes()
    if (!supportedTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Supported: ${supportedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const content = await generateContent(type, date, sources)

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('reports')
      .select('id')
      .eq('type', type)
      .eq('date', date)
      .limit(1)

    if (existing && existing.length > 0) {
      const { error: updateError } = await supabase
        .from('reports')
        .update({ content, source: 'claude' })
        .eq('id', existing[0].id)

      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase.from('reports').insert({
        type,
        content,
        date,
        source: 'claude',
      })

      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      type,
      date,
      content_length: content.length,
    })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: `Content generation failed: ${error instanceof Error ? error.message : 'unknown'}` },
      { status: 500 }
    )
  }
}
