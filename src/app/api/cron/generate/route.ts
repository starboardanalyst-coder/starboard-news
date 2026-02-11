import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateContent, getSupportedReportTypes } from '@/lib/claude'

export const maxDuration = 120

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const reportTypes = getSupportedReportTypes()
  const results: Record<string, string> = {}

  for (const type of reportTypes) {
    try {
      // Check if report already exists for today
      const { data: existing } = await supabase
        .from('reports')
        .select('id')
        .eq('type', type)
        .eq('date', today)
        .limit(1)

      if (existing && existing.length > 0) {
        results[type] = 'already_exists'
        continue
      }

      // Generate content (sources can be empty for now — Claude will use its knowledge)
      const content = await generateContent(
        type,
        today,
        'Use your latest knowledge of crypto and energy markets to write today\'s newsletter.'
      )

      const { error } = await supabase.from('reports').insert({
        type,
        content,
        date: today,
        source: 'claude',
      })

      if (error) throw error
      results[type] = 'generated'
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error)
      results[type] = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }
  }

  return NextResponse.json({
    success: true,
    date: today,
    results,
  })
}
