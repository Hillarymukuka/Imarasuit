-- Marketing as a Service (MaaS) Module – D1 Schema
-- All tables scoped by company_id for multi-tenancy

-- Connected social accounts
CREATE TABLE IF NOT EXISTS maas_connected_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  platform TEXT NOT NULL,          -- twitter, instagram, linkedin, facebook
  account_name TEXT NOT NULL,
  account_handle TEXT,
  access_token TEXT,
  refresh_token TEXT,
  is_connected INTEGER NOT NULL DEFAULT 1,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, platform)
);

-- Campaigns
CREATE TABLE IF NOT EXISTS maas_campaigns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',   -- draft, active, paused, completed
  start_date TEXT,
  end_date TEXT,
  platforms TEXT NOT NULL DEFAULT '[]',    -- JSON array of platform names
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Posts
CREATE TABLE IF NOT EXISTS maas_posts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  campaign_id TEXT,
  content TEXT NOT NULL,
  platforms TEXT NOT NULL DEFAULT '[]',    -- JSON array of platform names
  media_urls TEXT NOT NULL DEFAULT '[]',   -- JSON array of media URLs
  status TEXT NOT NULL DEFAULT 'draft',    -- draft, scheduled, published, failed
  scheduled_at TEXT,
  published_at TEXT,
  reach INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES maas_campaigns(id) ON DELETE SET NULL
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS maas_notification_preferences (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  post_published_alerts INTEGER NOT NULL DEFAULT 1,
  engagement_milestones INTEGER NOT NULL DEFAULT 1,
  scheduled_post_reminders INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_maas_accounts_company ON maas_connected_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_campaigns_company ON maas_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_campaigns_status ON maas_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_maas_posts_company ON maas_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_posts_campaign ON maas_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_maas_posts_status ON maas_posts(status);
CREATE INDEX IF NOT EXISTS idx_maas_posts_scheduled ON maas_posts(scheduled_at);
