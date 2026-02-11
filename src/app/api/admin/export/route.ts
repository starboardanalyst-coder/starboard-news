import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (subError) throw subError

    const { data: allSubs, error: allError } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })

    if (allError) throw allError

    return NextResponse.json({
      exported_at: new Date().toISOString(),
      active_count: subscriptions?.length ?? 0,
      total_count: allSubs,
      subscriptions: subscriptions ?? [],
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : 'unknown'}` },
      { status: 500 }
    )
  }
}
