import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const SYSTEM_PROMPT = `You are a professional newsletter writer for Starboard Analytics.
Write engaging, concise, and insightful content.
Use markdown formatting. Structure with clear sections using emoji headers.
Keep paragraphs short (2-3 sentences max).
Include links where relevant using [text](url) markdown format.
Use ─── (three em dashes) as section dividers.`

const PROMPTS: Record<string, (date: string, sources: string) => string> = {
  minor_news: (date, sources) => `Write today's Minor News daily digest for ${date}.

Topic: Crypto & energy infrastructure news.

Source material:
${sources}

Format:
🐦 Hot Take — One sharp, opinionated observation (2-3 sentences)
───
📖 Key Stories — 3-5 most important news items, each with:
   - Bold headline
   - 1-2 sentence summary
   - Why it matters
───
🤔 What to Watch — 2-3 developing trends or upcoming events
───
📰 Quick Hits — 5-8 one-line news items with links

Tone: Professional but accessible. No jargon without explanation.
Length: 800-1200 words total.`,

  into_crypto_cn: (date, sources) => `为 ${date} 撰写 Into Crypto 日报（中文）。

主题：加密货币深度分析，零基础友好。

素材：
${sources}

格式：
🐦 今日观点 — 一个犀利的市场观察（2-3句话）
───
📖 概念解读 — 选一个加密概念用简单中文解释
   - 是什么
   - 为什么重要
   - 简单类比
───
🤔 深度思考 — 2-3个引导读者思考的问题
───
📰 新闻速递 — 5-8条简短新闻，附链接

语气：专业但平易近人，对新手友好，避免未解释的术语。
字数：800-1200字。`,

  into_crypto_en: (date, sources) => `Write today's Into Crypto daily for ${date}.

Topic: Crypto education for beginners, zero jargon.

Source material:
${sources}

Format:
🐦 Hot Take — One sharp market observation (2-3 sentences)
───
📖 Concept of the Day — Pick one crypto concept and explain it simply
   - What it is
   - Why it matters
   - Simple analogy
───
🤔 Deep Questions — 2-3 thought-provoking questions for readers
───
📰 News Roundup — 5-8 brief news items with links

Tone: Educational, friendly, beginner-accessible. No unexplained jargon.
Length: 800-1200 words total.`,
}

export async function generateContent(
  reportType: string,
  date: string,
  rawSources: string
): Promise<string> {
  const promptBuilder = PROMPTS[reportType]
  if (!promptBuilder) {
    throw new Error(`No prompt template for report type: ${reportType}`)
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: promptBuilder(date, rawSources) }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  return textBlock.text
}

export function getSupportedReportTypes(): string[] {
  return Object.keys(PROMPTS)
}
