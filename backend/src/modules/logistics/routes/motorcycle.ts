// Logistics module – Motorcycle delivery routes (Riders, Deliveries, GPS)
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import { RiderRow, DeliveryRow, LocationRow, riderRowToResponse, deliveryRowToResponse, locationRowToResponse, StatusHistoryRow, statusHistoryToResponse } from '../types';

export const motorcycleRoutes = new Hono<AppEnv>();
motorcycleRoutes.use('*', authMiddleware);

function generateId() { return crypto.randomUUID(); }

function generateCode(prefix: string) {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${year}-${r}`;
}

// ===================== RIDERS =====================

// POST /api/logistics/riders
motorcycleRoutes.post('/riders', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const code = generateCode('RDR');
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO logistics_riders
      (id, company_id, rider_code, name, phone, email,
       vehicle_plate, vehicle_model, is_active, is_available, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
  `).bind(
    id, companyId, code, body.name, body.phone, body.email || null,
    body.vehiclePlate || null, body.vehicleModel || null, now, now
  ).run();

  const row = await c.env.DB.prepare('SELECT * FROM logistics_riders WHERE id = ?').bind(id).first<RiderRow>();
  return c.json(riderRowToResponse(row!), 201);
});

// GET /api/logistics/riders
motorcycleRoutes.get('/riders', async (c) => {
  const companyId = c.get('companyId');
  const active = c.req.query('active');
  const available = c.req.query('available');
  const search = c.req.query('search');

  let sql = 'SELECT * FROM logistics_riders WHERE company_id = ?';
  const params: any[] = [companyId];
  if (active !== undefined) { sql += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  if (available !== undefined) { sql += ' AND is_available = ?'; params.push(available === 'true' ? 1 : 0); }
  if (search) {
    sql += ' AND (rider_code LIKE ? OR name LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = await c.env.DB.prepare(sql).bind(...params).all<RiderRow>();

  // Attach active delivery count for each rider
  const results = [];
  for (const r of rows.results) {
    const cnt = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM logistics_deliveries WHERE rider_id = ? AND status NOT IN ('delivered','cancelled')`
    ).bind(r.id).first<{ c: number }>();
    results.push({ ...riderRowToResponse(r), activeDeliveries: cnt?.c || 0 });
  }
  return c.json(results);
});

// GET /api/logistics/riders/:code
motorcycleRoutes.get('/riders/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const row = await c.env.DB.prepare(
    'SELECT * FROM logistics_riders WHERE company_id = ? AND rider_code = ?'
  ).bind(companyId, code).first<RiderRow>();
  if (!row) return c.json({ error: 'Rider not found' }, 404);

  // Get recent deliveries
  const deliveries = await c.env.DB.prepare(
    'SELECT * FROM logistics_deliveries WHERE rider_id = ? ORDER BY created_at DESC LIMIT 20'
  ).bind(row.id).all<DeliveryRow>();

  return c.json({
    ...riderRowToResponse(row),
    recentDeliveries: deliveries.results.map(deliveryRowToResponse),
  });
});

// PATCH /api/logistics/riders/:code
motorcycleRoutes.patch('/riders/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const rider = await c.env.DB.prepare(
    'SELECT id FROM logistics_riders WHERE company_id = ? AND rider_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!rider) return c.json({ error: 'Rider not found' }, 404);

  const fields: string[] = [];
  const vals: any[] = [];
  const fieldMap: Record<string, string> = {
    name: 'name', phone: 'phone', email: 'email',
    vehiclePlate: 'vehicle_plate', vehicleModel: 'vehicle_model',
    isActive: 'is_active', isAvailable: 'is_available',
  };
  for (const [k, v] of Object.entries(body)) {
    const col = fieldMap[k] || k;
    fields.push(`${col} = ?`);
    vals.push(v);
  }
  fields.push('updated_at = ?');
  vals.push(now, rider.id);

  await c.env.DB.prepare(
    `UPDATE logistics_riders SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...vals).run();

  const row = await c.env.DB.prepare('SELECT * FROM logistics_riders WHERE id = ?').bind(rider.id).first<RiderRow>();
  return c.json(riderRowToResponse(row!));
});

// PATCH /api/logistics/riders/:code/location
motorcycleRoutes.patch('/riders/:code/location', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { lat, lng } = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'UPDATE logistics_riders SET current_lat = ?, current_lng = ?, last_location_update = ?, updated_at = ? WHERE company_id = ? AND rider_code = ?'
  ).bind(lat, lng, now, now, companyId, code).run();

  return c.json({ success: true });
});

// DELETE /api/logistics/riders/:code
motorcycleRoutes.delete('/riders/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const rider = await c.env.DB.prepare(
    'SELECT id FROM logistics_riders WHERE company_id = ? AND rider_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!rider) return c.json({ error: 'Rider not found' }, 404);

  // Check for active deliveries
  const active = await c.env.DB.prepare(
    `SELECT COUNT(*) as c FROM logistics_deliveries WHERE rider_id = ? AND status NOT IN ('delivered','cancelled')`
  ).bind(rider.id).first<{ c: number }>();
  if (active && active.c > 0) {
    return c.json({ error: 'Cannot delete rider with active deliveries' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM logistics_riders WHERE id = ?').bind(rider.id).run();
  return c.json({ success: true });
});

// ===================== DELIVERIES =====================

// POST /api/logistics/deliveries
motorcycleRoutes.post('/deliveries', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const code = generateCode('DLV');
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO logistics_deliveries
      (id, company_id, delivery_code, rider_id,
       pickup_name, pickup_phone, pickup_address, pickup_latitude, pickup_longitude,
       delivery_name, delivery_phone, delivery_address, delivery_latitude, delivery_longitude,
       description, package_size, amount, payment_method, payment_status,
       status, delivery_notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)
  `).bind(
    id, companyId, code, body.riderId || null,
    body.pickupName, body.pickupPhone, body.pickupAddress,
    body.pickupLatitude || body.pickupLat || null, body.pickupLongitude || body.pickupLng || null,
    body.deliveryName, body.deliveryPhone, body.deliveryAddress,
    body.deliveryLatitude || body.deliveryLat || null, body.deliveryLongitude || body.deliveryLng || null,
    body.description || null, body.packageSize || 'medium',
    body.amount || 0, body.paymentMethod || 'cash',
    body.notes || body.deliveryNotes || null, now, now
  ).run();

  // History entry
  await c.env.DB.prepare(
    'INSERT INTO logistics_delivery_status_history (id, delivery_id, delivery_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), id, code, 'pending', 'Delivery created', now).run();

  // If rider assigned, mark rider unavailable
  if (body.riderId) {
    await c.env.DB.prepare(
      'UPDATE logistics_riders SET is_available = 0, updated_at = ? WHERE id = ?'
    ).bind(now, body.riderId).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM logistics_deliveries WHERE id = ?').bind(id).first<DeliveryRow>();
  return c.json(deliveryRowToResponse(row!), 201);
});

// GET /api/logistics/deliveries
motorcycleRoutes.get('/deliveries', async (c) => {
  const companyId = c.get('companyId');
  const status = c.req.query('status');
  const riderId = c.req.query('riderId');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50');
  const skip = parseInt(c.req.query('skip') || '0');

  let sql = 'SELECT d.*, r.name as rider_name FROM logistics_deliveries d LEFT JOIN logistics_riders r ON d.rider_id = r.id WHERE d.company_id = ?';
  const params: any[] = [companyId];
  if (status) { sql += ' AND d.status = ?'; params.push(status); }
  if (riderId) { sql += ' AND d.rider_id = ?'; params.push(riderId); }
  if (search) {
    sql += ' AND (d.delivery_code LIKE ? OR d.pickup_name LIKE ? OR d.delivery_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  sql += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, skip);

  const rows = await c.env.DB.prepare(sql).bind(...params).all<DeliveryRow & { rider_name: string | null }>();
  const results = rows.results.map(r => ({
    ...deliveryRowToResponse(r),
    riderName: r.rider_name,
  }));

  return c.json(results);
});

// GET /api/logistics/deliveries/:code
motorcycleRoutes.get('/deliveries/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const row = await c.env.DB.prepare(
    'SELECT d.*, r.name as rider_name, r.phone as rider_phone, r.rider_code FROM logistics_deliveries d LEFT JOIN logistics_riders r ON d.rider_id = r.id WHERE d.company_id = ? AND d.delivery_code = ?'
  ).bind(companyId, code).first<DeliveryRow & { rider_name: string | null; rider_phone: string | null; rider_code: string | null }>();
  if (!row) return c.json({ error: 'Delivery not found' }, 404);

  // Status history
  const history = await c.env.DB.prepare(
    'SELECT * FROM logistics_delivery_status_history WHERE delivery_id = ? ORDER BY timestamp DESC'
  ).bind(row.id).all<StatusHistoryRow & { delivery_id: string; delivery_code: string }>();

  // Location trail
  const locations = await c.env.DB.prepare(
    'SELECT * FROM logistics_delivery_locations WHERE delivery_id = ? ORDER BY timestamp DESC LIMIT 100'
  ).bind(row.id).all<LocationRow>();

  return c.json({
    ...deliveryRowToResponse(row),
    riderName: row.rider_name,
    riderPhone: row.rider_phone,
    riderCode: row.rider_code,
    statusHistory: history.results.map(statusHistoryToResponse),
    locations: locations.results.map(locationRowToResponse),
  });
});

// POST /api/logistics/deliveries/:code/assign
motorcycleRoutes.post('/deliveries/:code/assign', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { riderId } = await c.req.json();
  const now = new Date().toISOString();

  const delivery = await c.env.DB.prepare(
    'SELECT id, rider_id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string; rider_id: string | null }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  // If previously assigned, free up old rider
  if (delivery.rider_id) {
    await c.env.DB.prepare(
      'UPDATE logistics_riders SET is_available = 1, updated_at = ? WHERE id = ?'
    ).bind(now, delivery.rider_id).run();
  }

  await c.env.DB.prepare(
    'UPDATE logistics_deliveries SET rider_id = ?, assigned_at = ?, status = ?, updated_at = ? WHERE id = ?'
  ).bind(riderId, now, 'assigned', now, delivery.id).run();

  // Mark new rider unavailable
  await c.env.DB.prepare(
    'UPDATE logistics_riders SET is_available = 0, updated_at = ? WHERE id = ?'
  ).bind(now, riderId).run();

  // History
  await c.env.DB.prepare(
    'INSERT INTO logistics_delivery_status_history (id, delivery_id, delivery_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), delivery.id, code, 'assigned', 'Rider assigned', now).run();

  return c.json({ success: true });
});

// PATCH /api/logistics/deliveries/:code/status
motorcycleRoutes.patch('/deliveries/:code/status', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { status, note } = await c.req.json();
  const now = new Date().toISOString();

  const delivery = await c.env.DB.prepare(
    'SELECT id, rider_id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string; rider_id: string | null }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  // Update timestamps based on status
  const updateFields: Record<string, string> = {
    picked_up: 'picked_up_at',
    delivered: 'delivered_at',
  };
  let extra = '';
  if (updateFields[status]) {
    extra = `, ${updateFields[status]} = '${now}'`;
  }

  await c.env.DB.prepare(
    `UPDATE logistics_deliveries SET status = ?, updated_at = ?${extra} WHERE id = ?`
  ).bind(status, now, delivery.id).run();

  // History
  await c.env.DB.prepare(
    'INSERT INTO logistics_delivery_status_history (id, delivery_id, delivery_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), delivery.id, code, status, note || null, now).run();

  // If delivered or cancelled, free up rider
  if ((status === 'delivered' || status === 'cancelled') && delivery.rider_id) {
    // Check if rider has other active deliveries
    const otherActive = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM logistics_deliveries WHERE rider_id = ? AND id != ? AND status NOT IN ('delivered','cancelled')`
    ).bind(delivery.rider_id, delivery.id).first<{ c: number }>();
    if (!otherActive || otherActive.c === 0) {
      await c.env.DB.prepare(
        'UPDATE logistics_riders SET is_available = 1, updated_at = ? WHERE id = ?'
      ).bind(now, delivery.rider_id).run();
    }
  }

  return c.json({ success: true, deliveryCode: code, status });
});

// DELETE /api/logistics/deliveries/:code
motorcycleRoutes.delete('/deliveries/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const delivery = await c.env.DB.prepare(
    'SELECT id, rider_id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string; rider_id: string | null }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  // Free rider if assigned
  if (delivery.rider_id) {
    const now = new Date().toISOString();
    const otherActive = await c.env.DB.prepare(
      `SELECT COUNT(*) as c FROM logistics_deliveries WHERE rider_id = ? AND id != ? AND status NOT IN ('delivered','cancelled')`
    ).bind(delivery.rider_id, delivery.id).first<{ c: number }>();
    if (!otherActive || otherActive.c === 0) {
      await c.env.DB.prepare(
        'UPDATE logistics_riders SET is_available = 1, updated_at = ? WHERE id = ?'
      ).bind(now, delivery.rider_id).run();
    }
  }

  await c.env.DB.prepare('DELETE FROM logistics_deliveries WHERE id = ?').bind(delivery.id).run();
  return c.json({ success: true });
});

// PATCH /api/logistics/deliveries/:code/payment
motorcycleRoutes.patch('/deliveries/:code/payment', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { paymentStatus } = await c.req.json();
  const now = new Date().toISOString();

  if (!['pending', 'paid', 'failed'].includes(paymentStatus)) {
    return c.json({ error: 'Invalid payment status' }, 400);
  }

  const delivery = await c.env.DB.prepare(
    'SELECT id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE logistics_deliveries SET payment_status = ?, updated_at = ? WHERE id = ?'
  ).bind(paymentStatus, now, delivery.id).run();

  return c.json({ success: true, deliveryCode: code, paymentStatus });
});

// ===================== GPS TRACKING =====================

// POST /api/logistics/deliveries/:code/location
motorcycleRoutes.post('/deliveries/:code/location', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { lat, lng, accuracy, speed, heading } = await c.req.json();
  const now = new Date().toISOString();

  const delivery = await c.env.DB.prepare(
    'SELECT id, rider_id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string; rider_id: string | null }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  await c.env.DB.prepare(
    'INSERT INTO logistics_delivery_locations (id, delivery_id, latitude, longitude, accuracy, speed, heading, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), delivery.id, lat, lng, accuracy || null, speed || null, heading || null, now).run();

  // Also update rider location
  if (delivery.rider_id) {
    await c.env.DB.prepare(
      'UPDATE logistics_riders SET current_latitude = ?, current_longitude = ?, last_location_update = ?, updated_at = ? WHERE id = ?'
    ).bind(lat, lng, now, now, delivery.rider_id).run();
  }

  return c.json({ success: true });
});

// GET /api/logistics/deliveries/:code/locations
motorcycleRoutes.get('/deliveries/:code/locations', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const delivery = await c.env.DB.prepare(
    'SELECT id FROM logistics_deliveries WHERE company_id = ? AND delivery_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!delivery) return c.json({ error: 'Delivery not found' }, 404);

  const rows = await c.env.DB.prepare(
    'SELECT * FROM logistics_delivery_locations WHERE delivery_id = ? ORDER BY timestamp ASC'
  ).bind(delivery.id).all<LocationRow>();

  return c.json(rows.results.map(locationRowToResponse));
});

// ===================== STATISTICS =====================

// GET /api/logistics/stats
motorcycleRoutes.get('/stats', async (c) => {
  const companyId = c.get('companyId');

  const [totalRiders, activeRiders, availableRiders,
         totalDeliveries, pendingDeliveries, activeDeliveries, completedDeliveries] =
    await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_riders WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_riders WHERE company_id = ? AND is_active = 1').bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_riders WHERE company_id = ? AND is_available = 1').bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_deliveries WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as c FROM logistics_deliveries WHERE company_id = ? AND status = 'pending'`).bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as c FROM logistics_deliveries WHERE company_id = ? AND status NOT IN ('delivered','cancelled','pending')`).bind(companyId).first<{ c: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) as c FROM logistics_deliveries WHERE company_id = ? AND status = 'delivered'`).bind(companyId).first<{ c: number }>(),
    ]);

  // Container and shipment stats
  const [totalContainers, totalShipments, inTransitShipments] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_containers WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_shipments WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM logistics_shipments WHERE company_id = ? AND status = 'in_transit'`).bind(companyId).first<{ c: number }>(),
  ]);

  return c.json({
    riders: {
      total: totalRiders?.c || 0,
      active: activeRiders?.c || 0,
      available: availableRiders?.c || 0,
    },
    deliveries: {
      total: totalDeliveries?.c || 0,
      pending: pendingDeliveries?.c || 0,
      active: activeDeliveries?.c || 0,
      completed: completedDeliveries?.c || 0,
    },
    containers: { total: totalContainers?.c || 0 },
    shipments: {
      total: totalShipments?.c || 0,
      inTransit: inTransitShipments?.c || 0,
    },
  });
});
