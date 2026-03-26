// Logistics module – Shipments routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import { ShipmentRow, shipmentRowToResponse, StatusHistoryRow, statusHistoryToResponse } from '../types';

export const shipmentRoutes = new Hono<AppEnv>();
shipmentRoutes.use('*', authMiddleware);

function generateId() {
  return crypto.randomUUID();
}

function generateTrackingCode(prefix = 'SHP') {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 12; i++) random += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${year}-${random}`;
}

// POST /api/logistics/shipments – create shipment
shipmentRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const trackingCode = generateTrackingCode();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO logistics_shipments
      (id, company_id, tracking_code, container_id, sender_name, sender_phone, sender_email,
       receiver_name, receiver_phone, receiver_email, origin, destination,
       description, weight_kg, amount, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registered', ?, ?)
  `).bind(
    id, companyId, trackingCode,
    body.containerId || null,
    body.senderName, body.senderPhone || null, body.senderEmail || null,
    body.receiverName, body.receiverPhone || null, body.receiverEmail || null,
    body.origin, body.destination,
    body.description || null, body.weightKg || null, body.amount || null,
    now, now
  ).run();

  // Add initial status history
  await c.env.DB.prepare(`
    INSERT INTO logistics_shipment_status_history (id, shipment_id, tracking_code, status, note, timestamp)
    VALUES (?, ?, ?, 'registered', 'Shipment registered', ?)
  `).bind(generateId(), id, trackingCode, now).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM logistics_shipments WHERE id = ?'
  ).bind(id).first<ShipmentRow>();

  return c.json(shipmentRowToResponse(row!), 201);
});

// GET /api/logistics/shipments – list
shipmentRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  const status = c.req.query('status');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '100');
  const skip = parseInt(c.req.query('skip') || '0');

  let sql = 'SELECT * FROM logistics_shipments WHERE company_id = ?';
  const params: any[] = [companyId];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (tracking_code LIKE ? OR sender_name LIKE ? OR receiver_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, skip);

  const rows = await c.env.DB.prepare(sql).bind(...params).all<ShipmentRow>();
  return c.json(rows.results.map(shipmentRowToResponse));
});

// GET /api/logistics/shipments/:trackingCode
shipmentRoutes.get('/:trackingCode', async (c) => {
  const companyId = c.get('companyId');
  const trackingCode = c.req.param('trackingCode');

  const row = await c.env.DB.prepare(
    'SELECT * FROM logistics_shipments WHERE company_id = ? AND tracking_code = ?'
  ).bind(companyId, trackingCode).first<ShipmentRow>();

  if (!row) return c.json({ error: 'Shipment not found' }, 404);

  // Enrich with container info if assigned
  let containerCode: string | undefined;
  let containerName: string | undefined;
  if (row.container_id) {
    const cRow = await c.env.DB.prepare(
      'SELECT container_code, name FROM logistics_containers WHERE id = ?'
    ).bind(row.container_id).first<{ container_code: string; name: string }>();
    if (cRow) {
      containerCode = cRow.container_code;
      containerName = cRow.name;
    }
  }

  return c.json({ ...shipmentRowToResponse(row), containerCode, containerName });
});

// GET /api/logistics/shipments/:trackingCode/history
shipmentRoutes.get('/:trackingCode/history', async (c) => {
  const companyId = c.get('companyId');
  const trackingCode = c.req.param('trackingCode');

  // Verify ownership
  const shipment = await c.env.DB.prepare(
    'SELECT id FROM logistics_shipments WHERE company_id = ? AND tracking_code = ?'
  ).bind(companyId, trackingCode).first<{ id: string }>();
  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  const rows = await c.env.DB.prepare(
    'SELECT * FROM logistics_shipment_status_history WHERE shipment_id = ? ORDER BY timestamp DESC'
  ).bind(shipment.id).all<StatusHistoryRow & { shipment_id: string; tracking_code: string }>();

  return c.json(rows.results.map(statusHistoryToResponse));
});

// PATCH /api/logistics/shipments/:trackingCode/status
shipmentRoutes.patch('/:trackingCode/status', async (c) => {
  const companyId = c.get('companyId');
  const trackingCode = c.req.param('trackingCode');
  const { status, note, recipientName, recipientId, deliveryTime } = await c.req.json();
  const now = new Date().toISOString();

  const shipment = await c.env.DB.prepare(
    'SELECT id, status as current_status FROM logistics_shipments WHERE company_id = ? AND tracking_code = ?'
  ).bind(companyId, trackingCode).first<{ id: string; current_status: string }>();
  if (!shipment) return c.json({ error: 'Shipment not found' }, 404);

  // Build update query with optional delivery fields
  let updateSql = 'UPDATE logistics_shipments SET status = ?, updated_at = ?';
  const updateParams: any[] = [status, now];

  if (status === 'delivered') {
    updateSql += ', delivered_at = ?';
    updateParams.push(deliveryTime || now);
  }
  if (recipientName) {
    updateSql += ', recipient_name = ?';
    updateParams.push(recipientName);
  }
  if (recipientId) {
    updateSql += ', recipient_id = ?';
    updateParams.push(recipientId);
  }

  updateSql += ' WHERE id = ?';
  updateParams.push(shipment.id);

  await c.env.DB.prepare(updateSql).bind(...updateParams).run();

  // Build status note with delivery info
  let fullNote = note || `Status updated to ${status}`;
  if (recipientName) fullNote += ` | Received by: ${recipientName}`;
  if (recipientId) fullNote += ` (ID: ${recipientId})`;

  await c.env.DB.prepare(
    'INSERT INTO logistics_shipment_status_history (id, shipment_id, tracking_code, status, note, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(generateId(), shipment.id, trackingCode, status, fullNote, now).run();

  return c.json({ success: true, trackingCode, status });
});

// DELETE /api/logistics/shipments/:trackingCode
shipmentRoutes.delete('/:trackingCode', async (c) => {
  const companyId = c.get('companyId');
  const trackingCode = c.req.param('trackingCode');

  const result = await c.env.DB.prepare(
    'DELETE FROM logistics_shipments WHERE company_id = ? AND tracking_code = ?'
  ).bind(companyId, trackingCode).run();

  if (!result.meta.changes) return c.json({ error: 'Shipment not found' }, 404);
  return c.json({ success: true });
});
