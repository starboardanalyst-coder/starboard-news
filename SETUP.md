# Starboard News - Setup Guide

## 1. Supabase Table

在 Supabase SQL Editor 运行以下代码：

```sql
-- subscriptions 表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  feeds TEXT[] NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_feeds ON subscriptions USING GIN(feeds);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow inserts from API
CREATE POLICY "Allow insert" ON subscriptions FOR INSERT WITH CHECK (true);

-- Allow service role to read all
CREATE POLICY "Service role can read all" ON subscriptions FOR SELECT USING (auth.role() = 'service_role');
```

## 2. Vercel 部署

1. 在 Vercel 创建新项目
2. 连接 GitHub repo 或直接上传
3. 添加环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. 添加自定义域名 `news.starboard.to`

## 3. DNS 设置

在域名注册商添加 CNAME 记录：
```
news.starboard.to -> cname.vercel-dns.com
```

## 4. 邮件发送 Cron

修改现有 cron job，在发送 Discord 消息后调用邮件发送逻辑。

---

## 文件结构

```
starboard-news/
├── src/
│   └── app/
│       ├── globals.css      # Tailwind 样式
│       ├── layout.tsx       # 布局
│       ├── page.tsx         # 订阅页面
│       └── api/
│           └── subscribe/
│               └── route.ts # 订阅 API
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```
