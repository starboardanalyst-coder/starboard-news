import { NextResponse } from 'next/server'
import { NEWSLETTERS } from '@/lib/newsletters'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

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
    },
    { headers: corsHeaders }
  )
}
