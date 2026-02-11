import nodemailer from 'nodemailer'
import { supabase } from './supabase'
import { getNewsletter, getReportType } from './newsletters'
import { buildEmailHtml, type BrandConfig } from './email-template'
import { buildUnsubscribeUrl } from './tokens'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

export async function sendNewsletter(
  email: string,
  feedType: string,
  unsubscribeToken: string,
  brand?: Partial<BrandConfig>
): Promise<void> {
  const newsletter = getNewsletter(feedType)
  if (!newsletter) {
    console.log(`Unknown feed type: ${feedType}`)
    return
  }

  const reportType = getReportType(feedType)

  const { data: reports } = await supabase
    .from('reports')
    .select('content, date')
    .eq('type', reportType)
    .order('date', { ascending: false })
    .limit(1)

  if (!reports || reports.length === 0) {
    console.log(`No content found for ${feedType}`)
    return
  }

  const { content, date } = reports[0]
  const unsubscribeUrl = buildUnsubscribeUrl(unsubscribeToken)

  const html = buildEmailHtml({
    title: newsletter.name,
    emoji: newsletter.emoji,
    date,
    content,
    unsubscribeUrl,
    brand: brand ?? {
      gradient: newsletter.gradient,
      accentColor: newsletter.accentColor,
    },
  })

  const subject = `${newsletter.emoji} ${newsletter.name} | ${date}`

  await transporter.sendMail({
    from: `Starboard News <${process.env.GMAIL_USER}>`,
    to: email,
    subject,
    html,
  })

  console.log(`Sent ${feedType} to ${email}`)
}

export async function sendBatchEmails(
  feedType: string,
  reportDate: string
): Promise<{ sent: number; skipped: number; failed: number }> {
  const reportType = getReportType(feedType)
  const newsletter = getNewsletter(feedType)
  if (!newsletter) return { sent: 0, skipped: 0, failed: 0 }

  // Get today's report
  const { data: reports } = await supabase
    .from('reports')
    .select('content, date')
    .eq('type', reportType)
    .eq('date', reportDate)
    .limit(1)

  if (!reports || reports.length === 0) {
    console.log(`No report found for ${feedType} on ${reportDate}`)
    return { sent: 0, skipped: 0, failed: 0 }
  }

  const { content, date } = reports[0]

  // Get active subscribers for this feed
  const { data: subscribers } = await supabase
    .from('subscriptions')
    .select('id, email, unsubscribe_token')
    .contains('feeds', [feedType])
    .eq('status', 'active')

  if (!subscribers || subscribers.length === 0) {
    console.log(`No active subscribers for ${feedType}`)
    return { sent: 0, skipped: 0, failed: 0 }
  }

  // Check who already received today's email (idempotent)
  const { data: alreadySent } = await supabase
    .from('email_logs')
    .select('email')
    .eq('feed', feedType)
    .eq('report_date', reportDate)
    .eq('status', 'sent')

  const sentEmails = new Set((alreadySent ?? []).map((r) => r.email))

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const sub of subscribers) {
    if (sentEmails.has(sub.email)) {
      skipped++
      continue
    }

    const unsubscribeUrl = buildUnsubscribeUrl(sub.unsubscribe_token)

    const html = buildEmailHtml({
      title: newsletter.name,
      emoji: newsletter.emoji,
      date,
      content,
      unsubscribeUrl,
      brand: {
        gradient: newsletter.gradient,
        accentColor: newsletter.accentColor,
      },
    })

    const subject = `${newsletter.emoji} ${newsletter.name} | ${date}`

    try {
      await transporter.sendMail({
        from: `Starboard News <${process.env.GMAIL_USER}>`,
        to: sub.email,
        subject,
        html,
      })

      await supabase.from('email_logs').insert({
        subscription_id: sub.id,
        email: sub.email,
        feed: feedType,
        report_date: reportDate,
        status: 'sent',
      })

      sent++
      console.log(`Sent ${feedType} to ${sub.email}`)
    } catch (error) {
      failed++
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error'
      console.error(`Failed to send ${feedType} to ${sub.email}:`, errorMsg)

      await supabase.from('email_logs').insert({
        subscription_id: sub.id,
        email: sub.email,
        feed: feedType,
        report_date: reportDate,
        status: 'failed',
        error: errorMsg,
      })
    }
  }

  return { sent, skipped, failed }
}
