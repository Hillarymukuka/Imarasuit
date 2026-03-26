// Logistics module – Reports & Export routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';

export const reportsRoutes = new Hono<AppEnv>();
reportsRoutes.use('*', authMiddleware);

// ===================== SUMMARY =====================

// GET /api/logistics/reports/summary
reportsRoutes.get('/summary', async (c) => {
  const companyId = c.get('companyId');

  const [
    totalShipments,
    byStatus,
    financial,
    containerStats,
    containersByStatus,
    shipmentsInContainers,
    topRoutes,
    recentShipments7d,
    todayShipments,
    totalRiders,
    activeRiders,
    totalDeliveries,
    deliveriesByStatus,
  ] = await Promise.all([
    // Total shipments
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_shipments WHERE company_id = ?')
      .bind(companyId).first<{ c: number }>(),

    // By status
    c.env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM logistics_shipments
      WHERE company_id = ? GROUP BY status
    `).bind(companyId).all<{ status: string; c: number }>(),

    // Financial
    c.env.DB.prepare(`
      SELECT
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(amount), 0) as avg_amount,
        COALESCE(SUM(weight_kg), 0) as total_weight,
        COALESCE(AVG(weight_kg), 0) as avg_weight
      FROM logistics_shipments WHERE company_id = ?
    `).bind(companyId).first<{ total_amount: number; avg_amount: number; total_weight: number; avg_weight: number }>(),

    // Container stats
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_containers WHERE company_id = ?')
      .bind(companyId).first<{ c: number }>(),

    // Containers by status
    c.env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM logistics_containers
      WHERE company_id = ? GROUP BY status
    `).bind(companyId).all<{ status: string; c: number }>(),

    // Shipments in containers
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_shipments WHERE company_id = ? AND container_id IS NOT NULL')
      .bind(companyId).first<{ c: number }>(),

    // Top routes
    c.env.DB.prepare(`
      SELECT origin, destination, COUNT(*) as c
      FROM logistics_shipments WHERE company_id = ?
      GROUP BY origin, destination ORDER BY c DESC LIMIT 5
    `).bind(companyId).all<{ origin: string; destination: string; c: number }>(),

    // Recent 7 days
    c.env.DB.prepare(`
      SELECT COUNT(*) as c FROM logistics_shipments
      WHERE company_id = ? AND created_at >= datetime('now', '-7 days')
    `).bind(companyId).first<{ c: number }>(),

    // Today
    c.env.DB.prepare(`
      SELECT COUNT(*) as c FROM logistics_shipments
      WHERE company_id = ? AND date(created_at) = date('now')
    `).bind(companyId).first<{ c: number }>(),

    // Total riders
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_riders WHERE company_id = ?')
      .bind(companyId).first<{ c: number }>(),

    // Active riders
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_riders WHERE company_id = ? AND is_active = 1')
      .bind(companyId).first<{ c: number }>(),

    // Total deliveries
    c.env.DB.prepare('SELECT COUNT(*) as c FROM logistics_deliveries WHERE company_id = ?')
      .bind(companyId).first<{ c: number }>(),

    // Deliveries by status
    c.env.DB.prepare(`
      SELECT status, COUNT(*) as c FROM logistics_deliveries
      WHERE company_id = ? GROUP BY status
    `).bind(companyId).all<{ status: string; c: number }>(),
  ]);

  const total = totalShipments?.c || 0;
  const statusMap: Record<string, number> = {};
  for (const r of byStatus.results || []) statusMap[r.status] = r.c;

  const delivered = statusMap['delivered'] || 0;
  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const containerStatusMap: Record<string, number> = {};
  for (const r of containersByStatus.results || []) containerStatusMap[r.status] = r.c;

  const deliveryStatusMap: Record<string, number> = {};
  for (const r of deliveriesByStatus.results || []) deliveryStatusMap[r.status] = r.c;

  return c.json({
    total_shipments: total,
    by_status: statusMap,
    total_amount: Math.round((financial?.total_amount || 0) * 100) / 100,
    average_amount: Math.round((financial?.avg_amount || 0) * 100) / 100,
    total_weight: Math.round((financial?.total_weight || 0) * 100) / 100,
    average_weight: Math.round((financial?.avg_weight || 0) * 100) / 100,
    delivery_rate: deliveryRate,
    pending_shipments: (statusMap['registered'] || 0) + (statusMap['pending'] || 0),
    total_containers: containerStats?.c || 0,
    containers_by_status: containerStatusMap,
    shipments_in_containers: shipmentsInContainers?.c || 0,
    standalone_shipments: total - (shipmentsInContainers?.c || 0),
    top_routes: (topRoutes.results || []).map((r) => ({
      origin: r.origin,
      destination: r.destination,
      count: r.c,
    })),
    recent_shipments_7d: recentShipments7d?.c || 0,
    today_shipments: todayShipments?.c || 0,
    riders: {
      total: totalRiders?.c || 0,
      active: activeRiders?.c || 0,
    },
    deliveries: {
      total: totalDeliveries?.c || 0,
      by_status: deliveryStatusMap,
    },
    timestamp: new Date().toISOString(),
  });
});

// ===================== CSV EXPORT =====================

// GET /api/logistics/reports/shipments-csv?status_filter=
reportsRoutes.get('/shipments-csv', async (c) => {
  const companyId = c.get('companyId');
  const statusFilter = c.req.query('status_filter');

  let sql = 'SELECT * FROM logistics_shipments WHERE company_id = ?';
  const params: string[] = [companyId];
  if (statusFilter) {
    sql += ' AND status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY created_at DESC';

  const rows = await c.env.DB.prepare(sql).bind(...params).all();

  // Build CSV
  const headers = [
    'Tracking Code', 'Status', 'Sender Name', 'Sender Phone', 'Sender Email',
    'Receiver Name', 'Receiver Phone', 'Receiver Email',
    'Origin', 'Destination', 'Description', 'Weight (kg)', 'Amount',
    'Container ID', 'Created At', 'Updated At',
  ];

  const csvRows: string[] = [headers.join(',')];
  for (const row of (rows.results || []) as any[]) {
    const fields = [
      row.tracking_code, row.status, row.sender_name, row.sender_phone || '',
      row.sender_email || '', row.receiver_name, row.receiver_phone || '',
      row.receiver_email || '', row.origin, row.destination,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.weight_kg || '', row.amount || '', row.container_id || '',
      row.created_at, row.updated_at || '',
    ];
    csvRows.push(fields.join(','));
  }

  const csv = csvRows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="shipments_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});

// GET /api/logistics/reports/deliveries-csv?status_filter=
reportsRoutes.get('/deliveries-csv', async (c) => {
  const companyId = c.get('companyId');
  const statusFilter = c.req.query('status_filter');

  let sql = `SELECT d.*, r.name as rider_name FROM logistics_deliveries d
    LEFT JOIN logistics_riders r ON d.rider_id = r.id
    WHERE d.company_id = ?`;
  const params: string[] = [companyId];
  if (statusFilter) {
    sql += ' AND d.status = ?';
    params.push(statusFilter);
  }
  sql += ' ORDER BY d.created_at DESC';

  const rows = await c.env.DB.prepare(sql).bind(...params).all();

  const headers = [
    'Delivery Code', 'Status', 'Rider', 'Pickup Name', 'Pickup Phone', 'Pickup Address',
    'Delivery Name', 'Delivery Phone', 'Delivery Address', 'Description',
    'Package Size', 'Amount', 'Payment Method', 'Payment Status',
    'Created At', 'Delivered At',
  ];

  const csvRows: string[] = [headers.join(',')];
  for (const row of (rows.results || []) as any[]) {
    const fields = [
      row.delivery_code, row.status, row.rider_name || 'Unassigned',
      row.pickup_name, row.pickup_phone || '', `"${(row.pickup_address || '').replace(/"/g, '""')}"`,
      row.delivery_name, row.delivery_phone || '', `"${(row.delivery_address || '').replace(/"/g, '""')}"`,
      `"${(row.description || '').replace(/"/g, '""')}"`,
      row.package_size || '', row.amount || '', row.payment_method || '',
      row.payment_status || '', row.created_at, row.delivered_at || '',
    ];
    csvRows.push(fields.join(','));
  }

  const csv = csvRows.join('\n');
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="deliveries_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
});
