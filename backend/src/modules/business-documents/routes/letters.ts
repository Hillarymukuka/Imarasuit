// Letter routes
import { Hono } from 'hono';
import { AppEnv, LetterRow, letterRowToResponse } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';

export const letterRoutes = new Hono<AppEnv>();
letterRoutes.use('*', authMiddleware);

// GET /api/letters - List all letters
letterRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM letters WHERE company_id = ? ORDER BY created_at DESC'
  ).bind(companyId).all<LetterRow>();

  return c.json(results.map(letterRowToResponse));
});

// POST /api/letters - Create a new letter
letterRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO letters (
      id, company_id, title, recipient_name,
      recipient_street, recipient_city, recipient_state,
      recipient_postal_code, recipient_country,
      subject, content, salutation, closing, date_issued,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, companyId,
    body.title || '',
    body.recipientName || '',
    body.recipientAddress?.street || '',
    body.recipientAddress?.city || '',
    body.recipientAddress?.state || '',
    body.recipientAddress?.postalCode || '',
    body.recipientAddress?.country || '',
    body.subject || '',
    body.content || '',
    body.salutation || '',
    body.closing || '',
    body.dateIssued || now,
    now, now
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM letters WHERE id = ?'
  ).bind(id).first<LetterRow>();

  return c.json(letterRowToResponse(row!), 201);
});

// GET /api/letters/:id - Get a single letter
letterRoutes.get('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT * FROM letters WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first<LetterRow>();

  if (!row) {
    return c.json({ error: 'Letter not found' }, 404);
  }

  return c.json(letterRowToResponse(row));
});

// PUT /api/letters/:id - Update a letter
letterRoutes.put('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM letters WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Letter not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE letters SET
      title = ?, recipient_name = ?,
      recipient_street = ?, recipient_city = ?, recipient_state = ?,
      recipient_postal_code = ?, recipient_country = ?,
      subject = ?, content = ?, salutation = ?, closing = ?,
      date_issued = ?, updated_at = ?
     WHERE id = ? AND company_id = ?`
  ).bind(
    body.title || '',
    body.recipientName || '',
    body.recipientAddress?.street || '',
    body.recipientAddress?.city || '',
    body.recipientAddress?.state || '',
    body.recipientAddress?.postalCode || '',
    body.recipientAddress?.country || '',
    body.subject || '',
    body.content || '',
    body.salutation || '',
    body.closing || '',
    body.dateIssued || null,
    now,
    id, companyId
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM letters WHERE id = ?'
  ).bind(id).first<LetterRow>();

  return c.json(letterRowToResponse(row!));
});

// DELETE /api/letters/:id - Delete a letter
letterRoutes.delete('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM letters WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Letter not found' }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM letters WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).run();

  return c.json({ success: true });
});
