-- Logistics Module – D1 Schema
-- All tables scoped by company_id for multi-tenancy

-- Containers (bus/truck loads for grouping shipments)
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

-- Shipments (courier packages)
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

-- Shipment status history
CREATE TABLE IF NOT EXISTS logistics_shipment_status_history (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  tracking_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (shipment_id) REFERENCES logistics_shipments(id) ON DELETE CASCADE
);

-- Container status history
CREATE TABLE IF NOT EXISTS logistics_container_status_history (
  id TEXT PRIMARY KEY,
  container_id TEXT NOT NULL,
  container_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (container_id) REFERENCES logistics_containers(id) ON DELETE CASCADE
);

-- Motorcycle riders
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

-- Motorcycle deliveries (local/express)
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

-- GPS location history for deliveries
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

-- Delivery status history
CREATE TABLE IF NOT EXISTS logistics_delivery_status_history (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  delivery_code TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (delivery_id) REFERENCES logistics_deliveries(id) ON DELETE CASCADE
);

-- Indexes
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
