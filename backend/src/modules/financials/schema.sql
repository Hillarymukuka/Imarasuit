-- Financials Module – D1 Schema
-- All tables scoped by company_id for multi-tenancy

-- Financial expenses
CREATE TABLE IF NOT EXISTS financial_expenses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  month TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Financial invoices
CREATE TABLE IF NOT EXISTS financial_invoices (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  date TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  total REAL NOT NULL DEFAULT 0,
  month TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fin_expenses_company ON financial_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_fin_expenses_month ON financial_expenses(month);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_company ON financial_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_month ON financial_invoices(month);
