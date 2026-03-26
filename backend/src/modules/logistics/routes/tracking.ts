// Logistics module – Public tracking route (no auth required)
import { Hono } from 'hono';
import { AppEnv } from '../../../types';

export const trackingRoutes = new Hono<AppEnv>();

// GET /api/track/:trackingCode – public shipment tracking
trackingRoutes.get('/:trackingCode', async (c) => {
  const trackingCode = c.req.param('trackingCode');

  const row = await c.env.DB.prepare(
    'SELECT tracking_code, sender_name, receiver_name, origin, destination, status, description, weight_kg, delivered_at, recipient_name, created_at, updated_at FROM logistics_shipments WHERE tracking_code = ?'
  ).bind(trackingCode).first<any>();

  if (!row) return c.json({ error: 'Shipment not found. Please check your tracking code.' }, 404);

  // Get status history
  const shipment = await c.env.DB.prepare(
    'SELECT id FROM logistics_shipments WHERE tracking_code = ?'
  ).bind(trackingCode).first<{ id: string }>();

  let history: any[] = [];
  if (shipment) {
    const h = await c.env.DB.prepare(
      'SELECT status, note, timestamp FROM logistics_shipment_status_history WHERE shipment_id = ? ORDER BY timestamp ASC'
    ).bind(shipment.id).all();
    history = h.results || [];
  }

  return c.json({
    trackingCode: row.tracking_code,
    senderName: row.sender_name,
    receiverName: row.receiver_name,
    origin: row.origin,
    destination: row.destination,
    status: row.status,
    description: row.description || undefined,
    weightKg: row.weight_kg || undefined,
    deliveredAt: row.delivered_at || undefined,
    recipientName: row.recipient_name || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history: history.map((h: any) => ({
      status: h.status,
      note: h.note || undefined,
      timestamp: h.timestamp,
    })),
  });
});
