// Logistics module – Containers routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import { ContainerRow, ShipmentRow, containerRowToResponse, shipmentRowToResponse, StatusHistoryRow, statusHistoryToResponse } from '../types';

export const containerRoutes = new Hono<AppEnv>();
containerRoutes.use('*', authMiddleware);

function generateId() { return crypto.randomUUID(); }

function generateContainerCode() {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return `CNT-${year}-${r}`;
}

// POST /api/logistics/containers
containerRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const code = generateContainerCode();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO logistics_containers
      (id, company_id, container_code, name, vehicle_type, vehicle_number,
       driver_name, driver_phone, origin, destination, status, departure_time, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'loading', ?, ?, ?)
  `).bind(
    id, companyId, code, body.name,
    body.vehicleType || null, body.vehicleNumber || null,
    body.driverName || null, body.driverPhone || null,
    body.origin, body.destination,
    body.departureTime || null, now, now
  ).run();

  // Initial history
  await c.env.DB.prepare(
    'INSERT INTO logistics_container_status_history (id, container_id, container_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), id, code, 'loading', 'Container created', now).run();

  const row = await c.env.DB.prepare('SELECT * FROM logistics_containers WHERE id = ?').bind(id).first<ContainerRow>();
  const resp = containerRowToResponse(row!);

  // Attach shipment count
  const countRow = await c.env.DB.prepare(
    'SELECT COUNT(*) as cnt FROM logistics_shipments WHERE container_id = ?'
  ).bind(id).first<{ cnt: number }>();

  return c.json({ ...resp, shipmentCount: countRow?.cnt || 0 }, 201);
});

// GET /api/logistics/containers
containerRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  const status = c.req.query('status');
  const search = c.req.query('search');

  let sql = 'SELECT * FROM logistics_containers WHERE company_id = ?';
  const params: any[] = [companyId];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) {
    sql += ' AND (container_code LIKE ? OR name LIKE ? OR vehicle_number LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = await c.env.DB.prepare(sql).bind(...params).all<ContainerRow>();
  const results = [];
  for (const row of rows.results) {
    const statsRow = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt, COALESCE(SUM(weight_kg), 0) as total_weight, COALESCE(SUM(amount), 0) as total_amount FROM logistics_shipments WHERE container_id = ?'
    ).bind(row.id).first<{ cnt: number; total_weight: number; total_amount: number }>();
    results.push({
      ...containerRowToResponse(row),
      shipmentCount: statsRow?.cnt || 0,
      totalWeight: Math.round((statsRow?.total_weight || 0) * 100) / 100,
      totalAmount: Math.round((statsRow?.total_amount || 0) * 100) / 100,
    });
  }
  return c.json(results);
});

// GET /api/logistics/containers/:code
containerRoutes.get('/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const row = await c.env.DB.prepare(
    'SELECT * FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<ContainerRow>();
  if (!row) return c.json({ error: 'Container not found' }, 404);

  // Get shipments in this container
  const shipments = await c.env.DB.prepare(
    'SELECT * FROM logistics_shipments WHERE container_id = ? ORDER BY created_at DESC'
  ).bind(row.id).all<ShipmentRow>();

  // Get status history
  const history = await c.env.DB.prepare(
    'SELECT * FROM logistics_container_status_history WHERE container_id = ? ORDER BY timestamp DESC'
  ).bind(row.id).all<StatusHistoryRow & { container_id: string; container_code: string }>();

  return c.json({
    ...containerRowToResponse(row),
    shipmentCount: shipments.results.length,
    shipments: shipments.results.map(shipmentRowToResponse),
    statusHistory: history.results.map(statusHistoryToResponse),
  });
});

// PATCH /api/logistics/containers/:code
containerRoutes.patch('/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const container = await c.env.DB.prepare(
    'SELECT id FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  const fields: string[] = [];
  const vals: any[] = [];
  for (const [key, val] of Object.entries(body)) {
    const col = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
    fields.push(`${col} = ?`);
    vals.push(val);
  }
  fields.push('updated_at = ?');
  vals.push(now);
  vals.push(container.id);

  await c.env.DB.prepare(
    `UPDATE logistics_containers SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...vals).run();

  const row = await c.env.DB.prepare('SELECT * FROM logistics_containers WHERE id = ?').bind(container.id).first<ContainerRow>();
  return c.json(containerRowToResponse(row!));
});

// POST /api/logistics/containers/:code/status
containerRoutes.post('/:code/status', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { status, note, updateShipments } = await c.req.json();
  const now = new Date().toISOString();

  const container = await c.env.DB.prepare(
    'SELECT id FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  // Update container
  await c.env.DB.prepare(
    'UPDATE logistics_containers SET status = ?, updated_at = ? WHERE id = ?'
  ).bind(status, now, container.id).run();

  // History entry
  await c.env.DB.prepare(
    'INSERT INTO logistics_container_status_history (id, container_id, container_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), container.id, code, status, note || null, now).run();

  // Optionally cascade to shipments
  let shipmentsUpdated = 0;
  if (updateShipments) {
    // Map container status → shipment status
    const statusMap: Record<string, string> = {
      dispatched: 'dispatched', in_transit: 'in_transit', arrived: 'arrived', delivered: 'delivered',
    };
    const shipmentStatus = statusMap[status];
    if (shipmentStatus) {
      const shipments = await c.env.DB.prepare(
        'SELECT id, tracking_code FROM logistics_shipments WHERE container_id = ?'
      ).bind(container.id).all<{ id: string; tracking_code: string }>();

      for (const s of shipments.results) {
        await c.env.DB.prepare(
          'UPDATE logistics_shipments SET status = ?, updated_at = ? WHERE id = ?'
        ).bind(shipmentStatus, now, s.id).run();
        await c.env.DB.prepare(
          'INSERT INTO logistics_shipment_status_history (id, shipment_id, tracking_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(generateId(), s.id, s.tracking_code, shipmentStatus, `Updated via container ${code}`, now).run();
      }
      shipmentsUpdated = shipments.results.length;
    }
  }

  return c.json({ success: true, containerCode: code, status, shipmentsUpdated });
});

// GET /api/logistics/containers/:code/available-shipments – shipments matching route not in any container
containerRoutes.get('/:code/available-shipments', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  const container = await c.env.DB.prepare(
    'SELECT id, origin, destination FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string; origin: string; destination: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  const rows = await c.env.DB.prepare(
    `SELECT * FROM logistics_shipments
     WHERE company_id = ? AND origin = ? AND destination = ?
       AND container_id IS NULL AND status = 'registered'
     ORDER BY created_at DESC`
  ).bind(companyId, container.origin, container.destination).all<ShipmentRow>();

  return c.json(rows.results.map(shipmentRowToResponse));
});

// POST /api/logistics/containers/:code/shipments – add shipments
containerRoutes.post('/:code/shipments', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { trackingCodes } = await c.req.json();

  const container = await c.env.DB.prepare(
    'SELECT id FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  let added = 0;
  for (const tc of trackingCodes) {
    const res = await c.env.DB.prepare(
      'UPDATE logistics_shipments SET container_id = ? WHERE company_id = ? AND tracking_code = ? AND container_id IS NULL'
    ).bind(container.id, companyId, tc).run();
    added += res.meta.changes || 0;
  }

  return c.json({ success: true, addedCount: added });
});

// DELETE /api/logistics/containers/:code/shipments – remove shipments
containerRoutes.delete('/:code/shipments', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');
  const { trackingCodes } = await c.req.json();

  const container = await c.env.DB.prepare(
    'SELECT id FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  let removed = 0;
  for (const tc of trackingCodes) {
    const res = await c.env.DB.prepare(
      'UPDATE logistics_shipments SET container_id = NULL WHERE company_id = ? AND tracking_code = ? AND container_id = ?'
    ).bind(companyId, tc, container.id).run();
    removed += res.meta.changes || 0;
  }

  return c.json({ success: true, removedCount: removed });
});

// DELETE /api/logistics/containers/:code
containerRoutes.delete('/:code', async (c) => {
  const companyId = c.get('companyId');
  const code = c.req.param('code');

  // Unlink shipments first
  const container = await c.env.DB.prepare(
    'SELECT id FROM logistics_containers WHERE company_id = ? AND container_code = ?'
  ).bind(companyId, code).first<{ id: string }>();
  if (!container) return c.json({ error: 'Container not found' }, 404);

  await c.env.DB.prepare(
    'UPDATE logistics_shipments SET container_id = NULL WHERE container_id = ?'
  ).bind(container.id).run();

  await c.env.DB.prepare(
    'DELETE FROM logistics_containers WHERE id = ?'
  ).bind(container.id).run();

  return c.json({ success: true });
});
