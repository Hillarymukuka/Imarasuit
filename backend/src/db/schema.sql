-- Business Suite D1 Database Schema
-- Multi-tenant: all data scoped by company_id

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  logo TEXT,
  street TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  tin TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  routing_number TEXT DEFAULT '',
  swift_code TEXT DEFAULT '',
  iban TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  street TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT DEFAULT '',
  tin TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Documents table (all types: quotation, invoice, purchase_order, delivery_note)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  document_number TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('quotation', 'invoice', 'purchase_order', 'delivery_note')),
  date_issued TEXT NOT NULL,
  reference_number TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_type TEXT DEFAULT 'none',
  tax_percent REAL DEFAULT 0,
  tax_total REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'fixed',
  grand_total REAL NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  status TEXT DEFAULT 'draft',
  -- Quotation fields
  valid_until TEXT,
  -- Invoice fields
  due_date TEXT,
  payment_terms TEXT,
  paid_amount REAL DEFAULT 0,
  paid_date TEXT,
  -- Purchase Order fields
  expected_delivery_date TEXT,
  shipping_method TEXT,
  -- Delivery Note fields
  delivery_date TEXT,
  received_by TEXT,
  delivery_street TEXT,
  delivery_city TEXT,
  delivery_state TEXT,
  delivery_postal_code TEXT,
  delivery_country TEXT,
  -- Metadata
  version INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Document line items
CREATE TABLE IF NOT EXISTS document_items (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Letters table
CREATE TABLE IF NOT EXISTS letters (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  recipient_name TEXT DEFAULT '',
  recipient_street TEXT DEFAULT '',
  recipient_city TEXT DEFAULT '',
  recipient_state TEXT DEFAULT '',
  recipient_postal_code TEXT DEFAULT '',
  recipient_country TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  content TEXT DEFAULT '',
  salutation TEXT DEFAULT '',
  closing TEXT DEFAULT '',
  date_issued TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- PDF Settings per company
CREATE TABLE IF NOT EXISTS pdf_settings (
  id TEXT PRIMARY KEY,
  company_id TEXT UNIQUE NOT NULL,
  selected_color_id TEXT DEFAULT 'blue',
  custom_colors TEXT DEFAULT '[]',
  template TEXT DEFAULT 'modern',
  show_logo INTEGER DEFAULT 1,
  logo_size TEXT DEFAULT 'medium',
  show_bank_info INTEGER DEFAULT 1,
  show_terms INTEGER DEFAULT 1,
  footer_text TEXT DEFAULT 'This document was generated electronically and is valid without signature.',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_items_document ON document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_letters_company ON letters(company_id);

-- Tenant module subscriptions
-- Controls which modules are enabled for each company/tenant.
CREATE TABLE IF NOT EXISTS tenant_modules (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  enabled_at TEXT NOT NULL DEFAULT (datetime('now')),
  disabled_at TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_modules_company ON tenant_modules(company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_module ON tenant_modules(module_id);

-- ─── Logistics Module Tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS logistics_containers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  container_code TEXT NOT NULL,
  name TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'loading',
  departure_time TEXT,
  arrival_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, container_code)
);

CREATE TABLE IF NOT EXISTS logistics_shipments (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  container_id TEXT,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  sender_email TEXT,
  receiver_name TEXT NOT NULL,
  receiver_phone TEXT,
  receiver_email TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  description TEXT,
  weight_kg REAL,
  amount REAL,
  status TEXT NOT NULL DEFAULT 'registered',
  delivered_at TEXT,
  recipient_name TEXT,
  recipient_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (container_id) REFERENCES logistics_containers(id) ON DELETE SET NULL,
  UNIQUE(company_id, tracking_code)
);

CREATE TABLE IF NOT EXISTS logistics_shipment_status_history (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logistics_container_status_history (
  id TEXT PRIMARY KEY,
  container_id TEXT NOT NULL,
  container_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id) REFERENCES logistics_containers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logistics_riders (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  rider_code TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  vehicle_plate TEXT,
  vehicle_model TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_available INTEGER NOT NULL DEFAULT 1,
  current_latitude REAL,
  current_longitude REAL,
  last_location_update TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, rider_code)
);

CREATE TABLE IF NOT EXISTS logistics_deliveries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  delivery_code TEXT NOT NULL,
  rider_id TEXT,
  pickup_name TEXT NOT NULL,
  pickup_phone TEXT,
  pickup_address TEXT NOT NULL,
  pickup_latitude REAL,
  pickup_longitude REAL,
  delivery_name TEXT NOT NULL,
  delivery_phone TEXT,
  delivery_address TEXT NOT NULL,
  delivery_latitude REAL,
  delivery_longitude REAL,
  description TEXT,
  package_size TEXT DEFAULT 'small',
  amount REAL,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_at TEXT,
  picked_up_at TEXT,
  delivered_at TEXT,
  estimated_pickup_time TEXT,
  estimated_delivery_time TEXT,
  pickup_notes TEXT,
  delivery_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (rider_id) REFERENCES logistics_riders(id) ON DELETE SET NULL,
  UNIQUE(company_id, delivery_code)
);

CREATE TABLE IF NOT EXISTS logistics_delivery_locations (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  speed REAL,
  heading REAL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (delivery_id) REFERENCES logistics_deliveries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS logistics_delivery_status_history (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  delivery_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (delivery_id) REFERENCES logistics_deliveries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_logistics_containers_company ON logistics_containers(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_containers_status ON logistics_containers(status);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_company ON logistics_shipments(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_tracking ON logistics_shipments(tracking_code);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_status ON logistics_shipments(status);
CREATE INDEX IF NOT EXISTS idx_logistics_shipments_container ON logistics_shipments(container_id);
CREATE INDEX IF NOT EXISTS idx_logistics_shipment_history ON logistics_shipment_status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_logistics_container_history ON logistics_container_status_history(container_id);
CREATE INDEX IF NOT EXISTS idx_logistics_riders_company ON logistics_riders(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_deliveries_company ON logistics_deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_deliveries_status ON logistics_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_logistics_deliveries_rider ON logistics_deliveries(rider_id);
CREATE INDEX IF NOT EXISTS idx_logistics_delivery_locations ON logistics_delivery_locations(delivery_id);
CREATE INDEX IF NOT EXISTS idx_logistics_delivery_history ON logistics_delivery_status_history(delivery_id);

-- ================================================================
-- Marketing as a Service (MaaS) Module
-- ================================================================

CREATE TABLE IF NOT EXISTS maas_connected_accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_handle TEXT,
  access_token TEXT,
  refresh_token TEXT,
  platform_user_id TEXT,
  is_connected INTEGER NOT NULL DEFAULT 1,
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(company_id, platform)
);

CREATE TABLE IF NOT EXISTS maas_campaigns (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  platforms TEXT NOT NULL DEFAULT '[]',
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_engagement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS maas_posts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  campaign_id TEXT,
  content TEXT NOT NULL,
  platforms TEXT NOT NULL DEFAULT '[]',
  media_urls TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  published_at TEXT,
  reach INTEGER NOT NULL DEFAULT 0,
  engagement INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES maas_campaigns(id) ON DELETE SET NULL
);

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

-- Temporary table for Facebook/Instagram page selection during OAuth flow
CREATE TABLE IF NOT EXISTS maas_oauth_pending_pages (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  pages_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_maas_accounts_company ON maas_connected_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_campaigns_company ON maas_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_campaigns_status ON maas_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_maas_posts_company ON maas_posts(company_id);
CREATE INDEX IF NOT EXISTS idx_maas_posts_campaign ON maas_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_maas_posts_status ON maas_posts(status);
CREATE INDEX IF NOT EXISTS idx_maas_posts_scheduled ON maas_posts(scheduled_at);

-- ================================================================
-- Financials Module
-- ================================================================

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

CREATE INDEX IF NOT EXISTS idx_financial_expenses_company ON financial_expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_expenses_month ON financial_expenses(month);
CREATE INDEX IF NOT EXISTS idx_financial_invoices_company ON financial_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_invoices_month ON financial_invoices(month);
