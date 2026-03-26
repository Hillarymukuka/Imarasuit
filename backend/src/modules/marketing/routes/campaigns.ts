// Marketing module – Campaigns routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import { CampaignRow, campaignRowToResponse, postRowToResponse, PostRow } from '../types';

export const campaignRoutes = new Hono<AppEnv>();
campaignRoutes.use('*', authMiddleware);

function generateId() { return crypto.randomUUID(); }

// GET /api/marketing/campaigns
campaignRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  const status = c.req.query('status');
  const search = c.req.query('search');

  let sql = 'SELECT * FROM maas_campaigns WHERE company_id = ?';
  const params: any[] = [companyId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
  sql += ' ORDER BY created_at DESC';

  const rows = await c.env.DB.prepare(sql).bind(...params).all<CampaignRow>();

  // Attach post count per campaign
  const results = [];
  for (const r of rows.results) {
    const cnt = await c.env.DB.prepare(
      'SELECT COUNT(*) as c FROM maas_posts WHERE campaign_id = ?'
    ).bind(r.id).first<{ c: number }>();
    results.push({ ...campaignRowToResponse(r), postCount: cnt?.c || 0 });
  }

  return c.json(results);
});

// GET /api/marketing/campaigns/:id
campaignRoutes.get('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT * FROM maas_campaigns WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first<CampaignRow>();
  if (!row) return c.json({ error: 'Campaign not found' }, 404);

  const posts = await c.env.DB.prepare(
    'SELECT * FROM maas_posts WHERE campaign_id = ? ORDER BY created_at DESC'
  ).bind(id).all<PostRow>();

  return c.json({
    ...campaignRowToResponse(row),
    postCount: posts.results.length,
    posts: posts.results.map(postRowToResponse),
  });
});

// POST /api/marketing/campaigns
campaignRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO maas_campaigns (id, company_id, name, description, status, start_date, end_date, platforms, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, body.name, body.description || null,
    body.status || 'draft', body.startDate || null, body.endDate || null,
    JSON.stringify(body.platforms || []), now, now
  ).run();

  const row = await c.env.DB.prepare('SELECT * FROM maas_campaigns WHERE id = ?').bind(id).first<CampaignRow>();
  return c.json({ ...campaignRowToResponse(row!), postCount: 0 }, 201);
});

// PATCH /api/marketing/campaigns/:id
campaignRoutes.patch('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_campaigns WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first();
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  const fields: string[] = [];
  const values: any[] = [];

  if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
  if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
  if (body.startDate !== undefined) { fields.push('start_date = ?'); values.push(body.startDate); }
  if (body.endDate !== undefined) { fields.push('end_date = ?'); values.push(body.endDate); }
  if (body.platforms !== undefined) { fields.push('platforms = ?'); values.push(JSON.stringify(body.platforms)); }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now, id);
    await c.env.DB.prepare(`UPDATE maas_campaigns SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM maas_campaigns WHERE id = ?').bind(id).first<CampaignRow>();
  return c.json(campaignRowToResponse(row!));
});

// DELETE /api/marketing/campaigns/:id
campaignRoutes.delete('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_campaigns WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first();
  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  await c.env.DB.prepare('DELETE FROM maas_campaigns WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});
