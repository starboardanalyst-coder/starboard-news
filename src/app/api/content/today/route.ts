import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getNewsletter, getReportType, VALID_FEED_IDS } from '@/lib/newsletters'
import { markdownToHtml } from '@/lib/email-template'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const feed = request.nextUrl.searchParams.get('feed')

  if (!feed || !VALID_FEED_IDS.includes(feed)) {
    return NextResponse.json(
      {
        error: `Missing or invalid feed. Valid feeds: ${VALID_FEED_IDS.join(', ')}`,
      },
      { status: 400, headers: corsHeaders }
    )
  }

  const newsletter = getNewsletter(feed)!
  const reportType = getReportType(feed)

  const { data: reports } = await supabase
    .from('reports')
    .select('content, date, created_at')
    .eq('type', reportType)
    .order('date', { ascending: false })
    .limit(1)

  if (!reports || reports.length === 0) {
    return NextResponse.json(
      { error: 'No content available' },
      { status: 404, headers: corsHeaders }
    )
  }

  const report = reports[0]

  return NextResponse.json(
    {
      date: report.date,
      title: newsletter.name,
      emoji: newsletter.emoji,
      content: report.content,
      html: markdownToHtml(report.content),
      generated_at: report.created_at,
    },
    { headers: corsHeaders }
  )
}
