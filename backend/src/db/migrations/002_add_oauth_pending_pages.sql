-- Migration 002: temp table for Facebook/Instagram page selection during OAuth
CREATE TABLE IF NOT EXISTS maas_oauth_pending_pages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  pages_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
