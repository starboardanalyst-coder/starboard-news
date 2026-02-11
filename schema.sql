-- ============================================
-- Starboard News - 完整数据库 Schema
-- 在 Supabase SQL Editor 中运行此文件
-- ============================================

-- 1. Partners 表（白标合作方，预留结构）
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  mode TEXT NOT NULL DEFAULT 'managed',  -- 'managed' | 'api'
  api_key TEXT UNIQUE,
  brand_name TEXT,
  brand_logo_url TEXT,
  brand_color TEXT,
  custom_footer TEXT,
  send_time TIME DEFAULT '08:00',
  send_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 插入默认 Starboard 合作方
INSERT INTO partners (name, slug, brand_name, brand_color)
VALUES ('Starboard', 'starboard', 'Starboard News', '#6366f1');

-- 2. Subscriptions 表（订阅者）
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  feeds TEXT[] NOT NULL,
  status TEXT DEFAULT 'active',
  partner_id UUID REFERENCES partners(id),
  partner_slug TEXT DEFAULT 'starboard',
  unsubscribe_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_email ON subscriptions(email);
CREATE INDEX idx_subscriptions_feeds ON subscriptions USING GIN(feeds);
CREATE INDEX idx_subscriptions_status ON subscriptions(status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_partner ON subscriptions(partner_id);
CREATE INDEX idx_subscriptions_token ON subscriptions(unsubscribe_token);

-- 3. Reports 表（Newsletter 内容）
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,           -- 'daily' | 'into_crypto_cn' | 'into_crypto_en'
  content TEXT NOT NULL,        -- markdown 格式内容
  date TEXT NOT NULL,           -- 例如 '2026-02-11'
  source TEXT DEFAULT 'claude', -- 'claude' | 'external'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reports_type_date ON reports(type, date DESC);

-- 4. Email Logs 表（发送记录）
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  email TEXT NOT NULL,
  feed TEXT NOT NULL,
  report_date TEXT NOT NULL,
  status TEXT DEFAULT 'sent',   -- 'sent' | 'failed' | 'bounced'
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_logs_date ON email_logs(report_date, feed);
CREATE INDEX idx_email_logs_email ON email_logs(email);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Subscriptions: 允许匿名插入，仅 service_role 可读
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow insert" ON subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (auth.role() = 'service_role');

-- Partners: 仅 service_role 可访问
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON partners FOR ALL USING (auth.role() = 'service_role');

-- Reports: 仅 service_role 可访问
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON reports FOR ALL USING (auth.role() = 'service_role');

-- Email Logs: 仅 service_role 可访问
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_logs FOR ALL USING (auth.role() = 'service_role');
