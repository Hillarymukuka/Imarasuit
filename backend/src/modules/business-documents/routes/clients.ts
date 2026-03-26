// Client routes
import { Hono } from 'hono';
import { AppEnv, ClientRow, clientRowToResponse } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';

export const clientRoutes = new Hono<AppEnv>();
clientRoutes.use('*', authMiddleware);

// GET /api/clients - List all clients for company
clientRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE company_id = ? ORDER BY created_at DESC'
  ).bind(companyId).all<ClientRow>();

  return c.json(results.map(clientRowToResponse));
});

// POST /api/clients - Create a new client
clientRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO clients (id, company_id, name, contact_person, email, phone,
      street, city, state, postal_code, country, tin, notes,
      created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id, companyId,
    body.name || '',
    body.contactPerson || '',
    body.email || '',
    body.phone || '',
    body.address?.street || '',
    body.address?.city || '',
    body.address?.state || '',
    body.address?.postalCode || '',
    body.address?.country || '',
    body.tin || '',
    body.notes || '',
    now, now
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first<ClientRow>();

  return c.json(clientRowToResponse(row!), 201);
});

// GET /api/clients/:id - Get a single client
clientRoutes.get('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first<ClientRow>();

  if (!row) {
    return c.json({ error: 'Client not found' }, 404);
  }

  return c.json(clientRowToResponse(row));
});

// PUT /api/clients/:id - Update a client
clientRoutes.put('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM clients WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Client not found' }, 404);
  }

  await c.env.DB.prepare(
    `UPDATE clients SET
      name = ?, contact_person = ?, email = ?, phone = ?,
      street = ?, city = ?, state = ?, postal_code = ?, country = ?,
      tin = ?, notes = ?, updated_at = ?
     WHERE id = ? AND company_id = ?`
  ).bind(
    body.name || '',
    body.contactPerson || '',
    body.email || '',
    body.phone || '',
    body.address?.street || '',
    body.address?.city || '',
    body.address?.state || '',
    body.address?.postalCode || '',
    body.address?.country || '',
    body.tin || '',
    body.notes || '',
    now,
    id, companyId
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE id = ?'
  ).bind(id).first<ClientRow>();

  return c.json(clientRowToResponse(row!));
});

// DELETE /api/clients/:id - Delete a client
clientRoutes.delete('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM clients WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).first();

  if (!existing) {
    return c.json({ error: 'Client not found' }, 404);
  }

  await c.env.DB.prepare(
    'DELETE FROM clients WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).run();

  return c.json({ success: true });
});
