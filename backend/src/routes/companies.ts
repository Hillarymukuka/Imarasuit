// Company routes
import { Hono } from 'hono';
import { AppEnv, CompanyRow, companyRowToResponse } from '../types';
import { authMiddleware } from '../middleware/auth';

export const companyRoutes = new Hono<AppEnv>();
companyRoutes.use('*', authMiddleware);

// GET /api/company - Get current company profile
companyRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');

  const row = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(companyId).first<CompanyRow>();

  if (!row) {
    return c.json({ error: 'Company not found' }, 404);
  }

  return c.json(companyRowToResponse(row));
});

// PUT /api/company - Update current company profile
companyRoutes.put('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE companies SET
      name = ?, logo = ?,
      street = ?, city = ?, state = ?, postal_code = ?, country = ?,
      phone = ?, email = ?, website = ?, tin = ?,
      bank_name = ?, account_name = ?, account_number = ?,
      routing_number = ?, swift_code = ?, iban = ?,
      updated_at = ?
     WHERE id = ?`
  ).bind(
    body.name || '',
    body.logo || null,
    body.address?.street || '',
    body.address?.city || '',
    body.address?.state || '',
    body.address?.postalCode || '',
    body.address?.country || '',
    body.phone || '',
    body.email || '',
    body.website || '',
    body.tin || '',
    body.bankInfo?.bankName || '',
    body.bankInfo?.accountName || '',
    body.bankInfo?.accountNumber || '',
    body.bankInfo?.routingNumber || '',
    body.bankInfo?.swiftCode || '',
    body.bankInfo?.iban || '',
    now,
    companyId
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(companyId).first<CompanyRow>();

  return c.json(companyRowToResponse(row!));
});
