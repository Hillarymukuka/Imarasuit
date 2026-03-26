// Marketing module – Posts routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import { PostRow, postRowToResponse } from '../types';
import { publishPost } from '../utils/social-publisher';

export const postRoutes = new Hono<AppEnv>();
postRoutes.use('*', authMiddleware);

function generateId() { return crypto.randomUUID(); }

// POST /api/marketing/posts/upload-media  (must be before /:id routes)
postRoutes.post('/upload-media', async (c) => {
  let file: File | null = null;
  try {
    const fd = await c.req.formData();
    file = fd.get('file') as File | null;
  } catch {
    return c.json({ error: 'Invalid form data' }, 400);
  }

  if (!file || !file.name) return c.json({ error: 'No file provided' }, 400);

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
  if (!allowed.includes(file.type)) {
    return c.json({ error: 'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4.' }, 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'File too large. Maximum 10 MB.' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const key = `media/${crypto.randomUUID()}.${ext}`;

  await c.env.MEDIA_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `${c.env.OAUTH_REDIRECT_BASE}/api/media/${key}`;
  return c.json({ url, id: key });
});

// GET /api/marketing/posts
postRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');
  const status = c.req.query('status');
  const campaignId = c.req.query('campaignId');
  const limit = parseInt(c.req.query('limit') || '50');
  const skip = parseInt(c.req.query('skip') || '0');

  let sql = 'SELECT * FROM maas_posts WHERE company_id = ?';
  const params: any[] = [companyId];

  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (campaignId) { sql += ' AND campaign_id = ?'; params.push(campaignId); }
  sql += ' ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT ? OFFSET ?';
  params.push(limit, skip);

  const rows = await c.env.DB.prepare(sql).bind(...params).all<PostRow>();
  return c.json(rows.results.map(postRowToResponse));
});

// GET /api/marketing/posts/scheduled
postRoutes.get('/scheduled', async (c) => {
  const companyId = c.get('companyId');

  const rows = await c.env.DB.prepare(
    `SELECT * FROM maas_posts WHERE company_id = ? AND status IN ('scheduled', 'published') AND scheduled_at IS NOT NULL ORDER BY scheduled_at ASC`
  ).bind(companyId).all<PostRow>();

  return c.json(rows.results.map(postRowToResponse));
});

// GET /api/marketing/posts/:id
postRoutes.get('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    'SELECT * FROM maas_posts WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first<PostRow>();
  if (!row) return c.json({ error: 'Post not found' }, 404);

  return c.json(postRowToResponse(row));
});

// POST /api/marketing/posts
postRoutes.post('/', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const id = generateId();
  const now = new Date().toISOString();

  const isImmediate = body.publish && !body.scheduledAt;
  const status = body.scheduledAt ? 'scheduled' : (isImmediate ? 'published' : 'draft');
  const publishedAt = isImmediate ? now : null;

  await c.env.DB.prepare(`
    INSERT INTO maas_posts (id, company_id, campaign_id, content, platforms, media_urls, status, scheduled_at, published_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, companyId, body.campaignId || null,
    body.content, JSON.stringify(body.platforms || []),
    JSON.stringify(body.mediaUrls || []),
    status, body.scheduledAt || null, publishedAt, now, now
  ).run();

  // If publishing immediately, send to social platforms
  if (isImmediate) {
    const accountRows = await c.env.DB.prepare(
      'SELECT platform, access_token, platform_user_id, account_name FROM maas_connected_accounts WHERE company_id = ? AND is_connected = 1'
    ).bind(companyId).all<{ platform: string; access_token: string | null; platform_user_id: string | null; account_name: string }>();

    const accounts = accountRows.results.map((a) => ({
      platform:       a.platform,
      accessToken:    a.access_token,
      platformUserId: a.platform_user_id,
      accountName:    a.account_name,
    }));

    const results = await publishPost(
      { id, content: body.content, platforms: body.platforms || [], mediaUrls: body.mediaUrls || [] },
      accounts,
    );

    // If none of the platforms succeeded, mark as failed
    if (results.length > 0 && !results.some((r) => r.success)) {
      await c.env.DB.prepare(
        'UPDATE maas_posts SET status = ?, published_at = NULL WHERE id = ?'
      ).bind('failed', id).run();
    }
  }

  // Update campaign updated_at if attached
  if (body.campaignId) {
    await c.env.DB.prepare(
      'UPDATE maas_campaigns SET updated_at = ? WHERE id = ?'
    ).bind(now, body.campaignId).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM maas_posts WHERE id = ?').bind(id).first<PostRow>();
  return c.json(postRowToResponse(row!), 201);
});

// PATCH /api/marketing/posts/:id
postRoutes.patch('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_posts WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first();
  if (!existing) return c.json({ error: 'Post not found' }, 404);

  const fields: string[] = [];
  const values: any[] = [];

  if (body.content !== undefined) { fields.push('content = ?'); values.push(body.content); }
  if (body.platforms !== undefined) { fields.push('platforms = ?'); values.push(JSON.stringify(body.platforms)); }
  if (body.mediaUrls !== undefined) { fields.push('media_urls = ?'); values.push(JSON.stringify(body.mediaUrls)); }
  if (body.status !== undefined) { fields.push('status = ?'); values.push(body.status); }
  if (body.scheduledAt !== undefined) { fields.push('scheduled_at = ?'); values.push(body.scheduledAt); }
  if (body.campaignId !== undefined) { fields.push('campaign_id = ?'); values.push(body.campaignId || null); }

  // If publishing now
  if (body.status === 'published' && !body.publishedAt) {
    fields.push('published_at = ?');
    values.push(now);
  }

  if (fields.length > 0) {
    fields.push('updated_at = ?');
    values.push(now, id);
    await c.env.DB.prepare(`UPDATE maas_posts SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  const row = await c.env.DB.prepare('SELECT * FROM maas_posts WHERE id = ?').bind(id).first<PostRow>();
  return c.json(postRowToResponse(row!));
});

// DELETE /api/marketing/posts/:id
postRoutes.delete('/:id', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_posts WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first();
  if (!existing) return c.json({ error: 'Post not found' }, 404);

  await c.env.DB.prepare('DELETE FROM maas_posts WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// POST /api/marketing/posts/:id/publish
postRoutes.post('/:id/publish', async (c) => {
  const companyId = c.get('companyId');
  const id = c.req.param('id');
  const now = new Date().toISOString();

  const post = await c.env.DB.prepare(
    'SELECT * FROM maas_posts WHERE company_id = ? AND id = ?'
  ).bind(companyId, id).first<PostRow>();
  if (!post) return c.json({ error: 'Post not found' }, 404);

  // Fetch connected accounts with tokens for this company
  const accountRows = await c.env.DB.prepare(
    'SELECT platform, access_token, platform_user_id, account_name FROM maas_connected_accounts WHERE company_id = ? AND is_connected = 1'
  ).bind(companyId).all<{ platform: string; access_token: string | null; platform_user_id: string | null; account_name: string }>();

  const accounts = accountRows.results.map((a) => ({
    platform:       a.platform,
    accessToken:    a.access_token,
    platformUserId: a.platform_user_id,
    accountName:    a.account_name,
  }));

  const platforms: string[]  = JSON.parse(post.platforms || '[]');
  const mediaUrls: string[]  = JSON.parse(post.media_urls || '[]');

  // Attempt to publish to all targeted platforms
  const results = await publishPost({ id: post.id, content: post.content, platforms, mediaUrls }, accounts);

  const anySucceeded = results.some((r) => r.success);
  const newStatus    = anySucceeded ? 'published' : 'failed';

  await c.env.DB.prepare(
    'UPDATE maas_posts SET status = ?, published_at = ?, updated_at = ? WHERE id = ?'
  ).bind(newStatus, anySucceeded ? now : null, now, id).run();

  const updated = await c.env.DB.prepare('SELECT * FROM maas_posts WHERE id = ?').bind(id).first<PostRow>();
  return c.json({ post: postRowToResponse(updated!), publishResults: results });
});
