// Document routes (quotations, invoices, purchase orders, delivery notes)
import { Hono } from 'hono';
import { AppEnv, DocumentRow, DocumentItemRow, documentRowToResponse } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';

export const documentRoutes = new Hono<AppEnv>();
documentRoutes.use('*', authMiddleware);

const DOC_TYPE_PREFIXES: Record<string, string> = {
  quotation: 'QUO',
  invoice: 'INV',
  purchase_order: 'PO',
  delivery_note: 'DN',
};

async function getNextDocNumber(db: D1Database, companyId: string, type: string): Promise<string> {
  const prefix = DOC_TYPE_PREFIXES[type] || 'DOC';
  const year = new Date().getFullYear();

  const result = await db.prepare(
    'SELECT COUNT(*) as count FROM documents WHERE company_id = ? AND type = ?'
  ).bind(companyId, type).first<{ count: number }>();

  const count = (result?.count || 0) + 1;
  return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
}

// GET /api/documents - List documents (optional ?type= filter)
documentRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  const type = c.req.query('type');
  const status = c.req.query('status');

  let query = 'SELECT * FROM documents WHERE company_id = ?';
  const params: unknown[] = [companyId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const { results: docs } = await c.env.DB.prepare(query).bind(...params).all<DocumentRow>();

  if (docs.length === 0) {
    return c.json([]);
  }

  // Fetch all items for these documents in one query
  const docIds = docs.map(d => d.id);
  const placeholders = docIds.map(() => '?').join(',');
  const { results: allItems } = await c.env.DB.prepare(
    `SELECT * FROM document_items WHERE document_id IN (${placeholders}) ORDER BY sort_order`
  ).bind(...docIds).all<DocumentItemRow>();

  // Group items by document_id
  const itemsByDoc: Record<string, DocumentItemRow[]> = {};
  for (const item of allItems) {
    if (!itemsByDoc[item.document_id]) itemsByDoc[item.document_id] = [];
    itemsByDoc[item.document_id].push(item);
  }

  return c.json(docs.map(doc => documentRowToResponse(doc, itemsByDoc[doc.id] || [])));
});

// POST /api/documents - Create a new document
documentRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  if (!body.type || !body.clientId) {
    return c.json({ error: 'type and clientId are required' }, 400);
  }

  const documentNumber = body.documentNumber || await getNextDocNumber(c.env.DB, companyId, body.type);

  // Insert document
  await c.env.DB.prepare(
    `INSERT INTO documents (
      id, company_id, client_id, document_number, type, date_issued,
      reference_number, subtotal, tax_type, tax_percent, tax_total,
      discount, discount_type, grand_total, notes, terms, status,
      valid_until, due_date, payment_terms, paid_amount, paid_date,
      expected_delivery_date, shipping_method, delivery_date, received_by,
      delivery_street, delivery_city, delivery_state, delivery_postal_code, delivery_country,
      version, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, companyId, body.clientId, documentNumber, body.type,
    body.dateIssued || now,
    body.referenceNumber || null,
    body.subtotal || 0,
    body.taxType || 'none',
    body.taxPercent || 0,
    body.taxTotal || 0,
    body.discount || 0,
    body.discountType || 'fixed',
    body.grandTotal || 0,
    body.notes || null,
    body.terms || null,
    body.status || 'draft',
    body.validUntil || null,
    body.dueDate || null,
    body.paymentTerms || null,
    body.paidAmount || 0,
    body.paidDate || null,
    body.expectedDeliveryDate || null,
    body.shippingMethod || null,
    body.deliveryDate || null,
    body.receivedBy || null,
    body.deliveryAddress?.street || null,
    body.deliveryAddress?.city || null,
    body.deliveryAddress?.state || null,
    body.deliveryAddress?.postalCode || null,
    body.deliveryAddress?.country || null,
    1, now, now
  ).run();

  // Insert line items (always generate new UUIDs to avoid PK conflicts during conversions)
  const items = body.items || [];
  if (items.length > 0) {
    const stmts = items.map((item: any, index: number) => {
      const itemId = crypto.randomUUID();
      return c.env.DB.prepare(
        `INSERT INTO document_items (id, document_id, name, description, quantity, unit_price, total, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        itemId, id,
        item.name || '',
        item.description || '',
        item.quantity || 0,
        item.unitPrice || 0,
        item.total || (item.quantity || 0) * (item.unitPrice || 0),
        index
      );
    });
    await c.env.DB.batch(stmts);
  }

  // Fetch and return the created document
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).bind(id).first<DocumentRow>();

  const { results: docItems } = await c.env.DB.prepare(
    'SELECT * FROM document_items WHERE document_id = ? ORDER BY sort_order'
  ).bind(id).all<DocumentItemRow>();

  return c.json(documentRowToResponse(doc!, docItems), 201);
});

// GET /api/documents/:id - Get a single document with items
documentRoutes.get('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first<DocumentRow>();

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM document_items WHERE document_id = ? ORDER BY sort_order'
  ).bind(id).all<DocumentItemRow>();

  return c.json(documentRowToResponse(doc, items));
});

// PUT /api/documents/:id - Update a document
documentRoutes.put('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first<DocumentRow>();

  if (!existing) {
    return c.json({ error: 'Document not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE documents SET
      client_id = COALESCE(?, client_id),
      reference_number = ?,
      subtotal = COALESCE(?, subtotal),
      tax_type = COALESCE(?, tax_type),
      tax_percent = COALESCE(?, tax_percent),
      tax_total = COALESCE(?, tax_total),
      discount = COALESCE(?, discount),
      discount_type = COALESCE(?, discount_type),
      grand_total = COALESCE(?, grand_total),
      notes = ?, terms = ?,
      status = COALESCE(?, status),
      valid_until = ?, due_date = ?, payment_terms = ?,
      paid_amount = COALESCE(?, paid_amount),
      paid_date = ?,
      expected_delivery_date = ?, shipping_method = ?,
      delivery_date = ?, received_by = ?,
      delivery_street = ?, delivery_city = ?,
      delivery_state = ?, delivery_postal_code = ?, delivery_country = ?,
      version = version + 1, updated_at = ?
     WHERE id = ? AND company_id = ?`
  ).bind(
    body.clientId || null,
    body.referenceNumber || null,
    body.subtotal ?? null,
    body.taxType || null,
    body.taxPercent ?? null,
    body.taxTotal ?? null,
    body.discount ?? null,
    body.discountType || null,
    body.grandTotal ?? null,
    body.notes || null,
    body.terms || null,
    body.status || null,
    body.validUntil || null,
    body.dueDate || null,
    body.paymentTerms || null,
    body.paidAmount ?? null,
    body.paidDate || null,
    body.expectedDeliveryDate || null,
    body.shippingMethod || null,
    body.deliveryDate || null,
    body.receivedBy || null,
    body.deliveryAddress?.street || null,
    body.deliveryAddress?.city || null,
    body.deliveryAddress?.state || null,
    body.deliveryAddress?.postalCode || null,
    body.deliveryAddress?.country || null,
    now, id, companyId
  ).run();

  // If items are provided, replace them
  if (body.items && Array.isArray(body.items)) {
    // Delete old items
    await c.env.DB.prepare(
      'DELETE FROM document_items WHERE document_id = ?'
    ).bind(id).run();

    // Insert new items
    if (body.items.length > 0) {
      const stmts = body.items.map((item: any, index: number) => {
        return c.env.DB.prepare(
          `INSERT INTO document_items (id, document_id, name, description, quantity, unit_price, total, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          item.id || crypto.randomUUID(), id,
          item.name || '',
          item.description || '',
          item.quantity || 0,
          item.unitPrice || 0,
          item.total || (item.quantity || 0) * (item.unitPrice || 0),
          index
        );
      });
      await c.env.DB.batch(stmts);
    }
  }

  // Fetch and return updated document
  const doc = await c.env.DB.prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).bind(id).first<DocumentRow>();

  const { results: items } = await c.env.DB.prepare(
    'SELECT * FROM document_items WHERE document_id = ? ORDER BY sort_order'
  ).bind(id).all<DocumentItemRow>();

  return c.json(documentRowToResponse(doc!, items));
});

// PATCH /api/documents/:id/status - Update document status
documentRoutes.patch('/:id/status', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const { status } = await c.req.json();
  const now = new Date().toISOString();

  if (!status) {
    return c.json({ error: 'status is required' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM documents WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Document not found' }, 404);
  }

  await c.env.DB.prepare(
    'UPDATE documents SET status = ?, updated_at = ? WHERE id = ?'
  ).bind(status, now, id).run();

  return c.json({ success: true, status });
});

// DELETE /api/documents/:id - Delete a document
documentRoutes.delete('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM documents WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Document not found' }, 404);
  }

  // Items are deleted via ON DELETE CASCADE
  await c.env.DB.prepare(
    'DELETE FROM documents WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).run();

  return c.json({ success: true });
});

// GET /api/documents/next-number/:type - Get next document number
documentRoutes.get('/next-number/:type', async (c) => {
  const companyId = c.get('companyId');
  const type = c.req.param('type');

  const number = await getNextDocNumber(c.env.DB, companyId, type);
  return c.json({ documentNumber: number });
});
