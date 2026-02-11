# Starboard News

Newsletter 订阅与发送平台。通过 Claude Code CLI 本地生成内容，Gmail 批量发送，支持多 Newsletter 和白标合作方扩展。

## 架构

```
news.starboard.to (Vercel + Next.js 14)
│
├── 前端页面
│   ├── /                         订阅页面（选择 Newsletter + 输入邮箱）
│   └── /unsubscribe              退订页面（点击邮件中的退订链接）
│
├── 公开 API
│   ├── GET  /api/newsletters     获取可用 Newsletter 列表
│   ├── POST /api/subscribe       订阅（自动发送最新一期）
│   ├── GET  /api/unsubscribe     通过 token 退订
│   └── GET  /api/content/today   获取今日内容（合作方 API）
│
├── 认证 API（需要 Bearer CRON_SECRET）
│   ├── POST /api/content/generate   触发 Claude 生成内容（备用）
│   └── POST /api/content/ingest     外部系统写入内容
│
├── 定时任务
│   ├── 本地 cron (7:00 UTC)      Claude Code CLI 生成内容 → 推送到 ingest API
│   └── Vercel Cron (8:00 UTC)    /api/cron/send → 批量发送邮件
│
├── 本地脚本 (scripts/)
│   ├── generate-newsletter.sh    生成内容主脚本（调用 claude CLI）
│   ├── setup-cron.sh             一键部署脚本（在生成机器上运行）
│   ├── .env                      本地密钥（gitignored）
│   ├── .env.example              密钥模板
│   └── prompts/                  Prompt 模板（可在 GitHub 上编辑同步）
│       ├── system.txt            系统 Prompt
│       ├── daily.txt             Minor News 模板
│       ├── into_crypto_cn.txt    Into Crypto 中文模板
│       └── into_crypto_en.txt    Into Crypto 英文模板
│
└── 核心模块 (src/lib/)
    ├── supabase.ts               数据库客户端
    ├── newsletters.ts            Newsletter 定义（ID、名称、颜色、语言）
    ├── tokens.ts                 退订 token 生成
    ├── email-template.ts         邮件 HTML 模板（支持合作方品牌定制）
    ├── email.ts                  Gmail SMTP 发送 + 批量发送逻辑
    └── claude.ts                 Claude API 内容生成（备用，需 Anthropic API Key）
```

## 数据库（4 张表）

| 表名 | 用途 |
|------|------|
| `partners` | 合作方配置（品牌、颜色、Logo、发送时间）。预留白标系统，默认有一条 Starboard 记录 |
| `subscriptions` | 订阅者（邮箱、订阅的 feeds 数组、状态、退订 token） |
| `reports` | Newsletter 内容（markdown 格式，按 type + date 索引） |
| `email_logs` | 发送记录（用于去重和统计，每封邮件一条记录） |

完整建表 SQL 见 `schema.sql`，在 Supabase SQL Editor 中一次性运行即可。

## Newsletter 类型

| ID | 名称 | 语言 | 报告类型 | 说明 |
|----|------|------|----------|------|
| `minor_news` | Minor News | EN | `daily` | 加密货币 & 能源基础设施日报 |
| `into_crypto_cn` | Into Crypto 中文版 | ZH | `into_crypto_cn` | 加密货币深度分析，零基础友好 |
| `into_crypto_en` | Into Crypto | EN | `into_crypto_en` | 加密货币教育日报 |

---

## 每日流程

```
07:00 UTC  本地机器 cron 运行 generate-newsletter.sh
           → git pull 获取最新 prompt 模板
           → claude CLI 为 daily, into_crypto_cn, into_crypto_en 各生成一篇
           → 调用 /api/content/ingest 写入 Supabase reports 表

08:00 UTC  Vercel Cron 触发 /api/cron/send
           → 读取今日 reports
           → 查询活跃订阅者
           → Gmail SMTP 逐个发送
           → 记录到 email_logs

用户随时   访问 news.starboard.to 订阅
           → 立即收到最新一期邮件
           → 次日起进入每日发送列表
```

---

## 内容生成（本地 Claude Code CLI）

内容生成通过本地机器上的 Claude Code CLI 完成，不依赖 Anthropic API Key。

Prompt 模板存储在 `scripts/prompts/` 目录：

| 文件 | 用途 |
|------|------|
| `system.txt` | 系统 Prompt（通用写作风格） |
| `daily.txt` | Minor News — 🐦 Hot Take → 📖 Key Stories → 🤔 What to Watch → 📰 Quick Hits |
| `into_crypto_cn.txt` | Into Crypto CN — 🐦 今日观点 → 📖 概念解读 → 🤔 深度思考 → 📰 新闻速递 |
| `into_crypto_en.txt` | Into Crypto EN — 🐦 Hot Take → 📖 Concept of the Day → 🤔 Deep Questions → 📰 News Roundup |

编辑 prompt 后 commit + push，本地机器下次运行会自动 `git pull` 获取最新版本。

### 手动生成

```bash
# 生成全部
./scripts/generate-newsletter.sh all

# 只生成某一个
./scripts/generate-newsletter.sh daily
./scripts/generate-newsletter.sh into_crypto_cn
```

### 在新机器上部署生成服务

```bash
bash scripts/setup-cron.sh
```

脚本会自动：检查依赖 → 克隆仓库 → 配置密钥 → 验证连通性 → 设置 cron。

---

## 功能使用指南

### 1. 用户订阅 Newsletter

**方式 A：网页订阅**

访问 https://news.starboard.to，选择想订阅的 Newsletter，输入邮箱，点 Subscribe。订阅后立即收到最新一期邮件。

**方式 B：API 订阅（用于外部网站嵌入）**

```bash
curl -X POST https://news.starboard.to/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "feeds": ["minor_news", "into_crypto_cn"]
  }'
```

支持重复订阅 — 已有订阅者添加新 feed 时会自动合并，不会重复创建记录。

**方式 C：查看可选 Newsletter 列表**

```bash
curl https://news.starboard.to/api/newsletters
```

---

### 2. 用户退订

**方式 A：点击邮件中的退订链接**

每封邮件底部都有 "Unsubscribe" 按钮，点击后自动跳转到退订确认页面，一键退订。

**方式 B：API 退订**

```bash
# 通过 token 退订
curl -X POST https://news.starboard.to/api/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token": "用户的退订token"}'

# 通过邮箱退订
curl -X POST https://news.starboard.to/api/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

---

### 3. 手动写入内容（不经过 Claude）

```bash
curl -X POST https://news.starboard.to/api/content/ingest \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily",
    "date": "2026-02-11",
    "content": "🐦 Hot Take\n\n今天的市场观察...\n\n───\n\n📖 Key Stories\n\n..."
  }'
```

用于：已有其他系统生成内容（如 Discord bot），直接写入 reports 表。

---

### 4. 手动触发批量发送

```bash
curl https://news.starboard.to/api/cron/send \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

响应：
```json
{
  "success": true,
  "date": "2026-02-11",
  "results": {
    "minor_news": {"sent": 42, "skipped": 0, "failed": 1},
    "into_crypto_cn": {"sent": 15, "skipped": 0, "failed": 0},
    "into_crypto_en": "no_report"
  }
}
```

---

### 5. 查看今日内容

```bash
curl "https://news.starboard.to/api/content/today?feed=minor_news"
curl "https://news.starboard.to/api/content/today?feed=into_crypto_cn"
```

---

## 环境变量

### Vercel 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase Service Role Key | `eyJ...` |
| `GMAIL_USER` | Gmail 邮箱地址 | `your@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail 应用专用密码 | `abcd efgh ijkl mnop` |
| `ANTHROPIC_API_KEY` | Claude API Key（备用，本地生成模式不需要） | `sk-ant-...` |
| `CRON_SECRET` | Cron 和认证 API 的密钥 | 随机 UUID |
| `NEXT_PUBLIC_SITE_URL` | 网站 URL（退订链接用） | `https://news.starboard.to` |

### 本地生成机器 (scripts/.env)

| 变量 | 说明 |
|------|------|
| `API_URL` | 站点 URL |
| `CRON_SECRET` | 与 Vercel 相同的 CRON_SECRET |

---

## 部署

### 首次部署（Vercel）

1. 在 Supabase SQL Editor 运行 `schema.sql`（建表）
2. 安装依赖：`npm install`
3. 部署到 Vercel：`npx vercel --prod`
4. 在 Vercel Dashboard → Settings → Environment Variables 添加所有环境变量
5. 重新部署使环境变量生效：`npx vercel --prod`
6. 绑定域名 `news.starboard.to`（Vercel Dashboard → Domains）

### 部署内容生成（本地机器）

```bash
# 在装有 Claude Code CLI 的机器上运行
bash scripts/setup-cron.sh
```

需要：`claude` CLI、`curl`、`jq`、`git`

### 本地开发

```bash
cp .env.example .env.local
# 填入实际环境变量值
npm install
npm run dev
# 访问 http://localhost:3000
```

---

## 限制

- Gmail 发送上限：500 封/天（普通账户）、2000 封/天（Workspace 账户）
- Vercel Cron：免费版每天 1 次，Pro 版无限制
- Vercel Serverless Function 超时：Hobby 版 60 秒，Pro 版最高 300 秒（当前设置 120 秒）

---

## 未来扩展（已预留结构）

- Partner Dashboard（合作方后台：统计、订阅者管理、品牌定制）
- 嵌入式订阅组件（iframe / JS widget）
- API Key 认证的合作方内容/订阅者 API
- Webhook 通知（新订阅/退订事件）
- Resend/SendGrid 替代 Gmail 突破发送限制
