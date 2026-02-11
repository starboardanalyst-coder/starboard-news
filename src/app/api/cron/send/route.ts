import { NextRequest, NextResponse } from 'next/server'
import { VALID_FEED_IDS, getReportType } from '@/lib/newsletters'
import { supabase } from '@/lib/supabase'
import { sendBatchEmails } from '@/lib/email'

export async function GET(request: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]
  const results: Record<string, { sent: number; skipped: number; failed: number } | string> = {}

  for (const feedId of VALID_FEED_IDS) {
    try {
      // Check if report exists for today
      const reportType = getReportType(feedId)
      const { data: reports } = await supabase
        .from('reports')
        .select('id')
        .eq('type', reportType)
        .eq('date', today)
        .limit(1)

      if (!reports || reports.length === 0) {
        results[feedId] = 'no_report'
        continue
      }

      const result = await sendBatchEmails(feedId, today)
      results[feedId] = result
    } catch (error) {
      console.error(`Failed to send ${feedId}:`, error)
      results[feedId] = `error: ${error instanceof Error ? error.message : 'unknown'}`
    }
  }

  return NextResponse.json({
    success: true,
    date: today,
    results,
  })
}
