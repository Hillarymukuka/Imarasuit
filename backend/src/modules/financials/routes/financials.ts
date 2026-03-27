// Financials module – Expenses & Invoices CRUD routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';

const financialsRoutes = new Hono<AppEnv>();

financialsRoutes.use('*', authMiddleware);

// ─── OVERVIEW / DASHBOARD ─────────────────────────────────────────────────

financialsRoutes.get('/overview', async (c) => {
  const companyId = c.get('companyId');

  // Totals
  const expTotal = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM financial_expenses WHERE company_id = ?'
  ).bind(companyId).first<{ total: number }>();

  const invTotal = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(total), 0) AS total FROM financial_invoices WHERE company_id = ?'
  ).bind(companyId).first<{ total: number }>();

  // Monthly totals for expenses
  const expMonthly = await c.env.DB.prepare(
    'SELECT month, SUM(amount) AS amount FROM financial_expenses WHERE company_id = ? GROUP BY month ORDER BY month'
  ).bind(companyId).all<{ month: string; amount: number }>();

  // Monthly totals for invoices
  const invMonthly = await c.env.DB.prepare(
    'SELECT month, SUM(total) AS total FROM financial_invoices WHERE company_id = ? GROUP BY month ORDER BY month'
  ).bind(companyId).all<{ month: string; total: number }>();

  const expensesTotals: Record<string, { amount: number }> = {};
  for (const row of expMonthly.results || []) {
    expensesTotals[row.month] = { amount: row.amount };
  }

  const invoicesTotals: Record<string, { total: number }> = {};
  for (const row of invMonthly.results || []) {
    invoicesTotals[row.month] = { total: row.total };
  }

  return c.json({
    totals: {
      expenses: { amount: expTotal?.total || 0 },
      invoices: { total: invTotal?.total || 0 },
    },
    expensesTotals,
    invoicesTotals,
  });
});

// ─── EXPENSES ──────────────────────────────────────────────────────────────

financialsRoutes.get('/expenses', async (c) => {
  const companyId = c.get('companyId');
  const month = c.req.query('month');
  const search = c.req.query('search');

  let sql = 'SELECT * FROM financial_expenses WHERE company_id = ?';
  const binds: any[] = [companyId];

  if (month) {
    sql += ' AND month = ?';
    binds.push(month);
  }
  if (search) {
    sql += ' AND (company LIKE ? OR description LIKE ?)';
    binds.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY date DESC';

  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ expenses: rows.results || [] });
});

financialsRoutes.post('/expenses', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json<{ date: string; company: string; description?: string; amount: number; month: string }>();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO financial_expenses (id, company_id, date, company, description, amount, month)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, companyId, body.date, body.company, body.description || '', body.amount, body.month).run();

  return c.json({ id, ...body }, 201);
});

financialsRoutes.post('/expenses/bulk', async (c) => {
  const companyId = c.get('companyId');
  const { entries } = await c.req.json<{ entries: { date: string; company: string; description?: string; amount: number; month: string }[] }>();

  const stmt = c.env.DB.prepare(
    `INSERT INTO financial_expenses (id, company_id, date, company, description, amount, month)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const batch = entries.map((e) =>
    stmt.bind(crypto.randomUUID(), companyId, e.date, e.company, e.description || '', e.amount, e.month)
  );

  await c.env.DB.batch(batch);
  return c.json({ inserted: entries.length }, 201);
});

financialsRoutes.delete('/expenses/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  await c.env.DB.prepare(
    'DELETE FROM financial_expenses WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).run();

  return c.json({ success: true });
});

// ─── INVOICES ──────────────────────────────────────────────────────────────

financialsRoutes.get('/invoices', async (c) => {
  const companyId = c.get('companyId');
  const month = c.req.query('month');
  const search = c.req.query('search');

  let sql = 'SELECT * FROM financial_invoices WHERE company_id = ?';
  const binds: any[] = [companyId];

  if (month) {
    sql += ' AND month = ?';
    binds.push(month);
  }
  if (search) {
    sql += ' AND (client LIKE ? OR description LIKE ?)';
    binds.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY date DESC';

  const rows = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ invoices: rows.results || [] });
});

financialsRoutes.post('/invoices', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json<{ date: string; client: string; description?: string; total: number; month: string }>();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO financial_invoices (id, company_id, date, client, description, total, month)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, companyId, body.date, body.client, body.description || '', body.total, body.month).run();

  return c.json({ id, ...body }, 201);
});

financialsRoutes.post('/invoices/bulk', async (c) => {
  const companyId = c.get('companyId');
  const { entries } = await c.req.json<{ entries: { date: string; client: string; description?: string; total: number; month: string }[] }>();

  const stmt = c.env.DB.prepare(
    `INSERT INTO financial_invoices (id, company_id, date, client, description, total, month)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const batch = entries.map((e) =>
    stmt.bind(crypto.randomUUID(), companyId, e.date, e.client, e.description || '', e.total, e.month)
  );

  await c.env.DB.batch(batch);
  return c.json({ inserted: entries.length }, 201);
});

financialsRoutes.delete('/invoices/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  await c.env.DB.prepare(
    'DELETE FROM financial_invoices WHERE id = ? AND company_id = ?'
  ).bind(id, companyId).run();

  return c.json({ success: true });
});

export { financialsRoutes };
