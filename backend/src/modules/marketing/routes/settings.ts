// Marketing module – Accounts & Settings routes
import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import { authMiddleware } from '../../../middleware/auth';
import {
  ConnectedAccountRow, accountRowToResponse,
  NotificationPrefsRow, notifPrefsRowToResponse,
  PostRow, CampaignRow
} from '../types';

export const settingsRoutes = new Hono<AppEnv>();
settingsRoutes.use('*', authMiddleware);

function generateId() { return crypto.randomUUID(); }

// ===================== CONNECTED ACCOUNTS =====================

// GET /api/marketing/accounts
settingsRoutes.get('/accounts', async (c) => {
  const companyId = c.get('companyId');
  const rows = await c.env.DB.prepare(
    'SELECT * FROM maas_connected_accounts WHERE company_id = ? ORDER BY platform ASC'
  ).bind(companyId).all<ConnectedAccountRow>();
  return c.json(rows.results.map(accountRowToResponse));
});

// POST /api/marketing/accounts  – connect/update an account
settingsRoutes.post('/accounts', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, body.platform).first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE maas_connected_accounts SET account_name = ?, account_handle = ?, is_connected = 1, updated_at = ? WHERE id = ?
    `).bind(body.accountName, body.accountHandle || null, now, existing.id).run();
  } else {
    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO maas_connected_accounts (id, company_id, platform, account_name, account_handle, is_connected, connected_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(id, companyId, body.platform, body.accountName, body.accountHandle || null, now, now).run();
  }

  const row = await c.env.DB.prepare(
    'SELECT * FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, body.platform).first<ConnectedAccountRow>();
  return c.json(accountRowToResponse(row!));
});

// DELETE /api/marketing/accounts/:platform – disconnect
settingsRoutes.delete('/accounts/:platform', async (c) => {
  const companyId = c.get('companyId');
  const platform = c.req.param('platform');

  await c.env.DB.prepare(
    'UPDATE maas_connected_accounts SET is_connected = 0, updated_at = ? WHERE company_id = ? AND platform = ?'
  ).bind(new Date().toISOString(), companyId, platform).run();

  return c.json({ success: true });
});

// PATCH /api/marketing/accounts/:platform/token – manually set access token + platform user ID
settingsRoutes.patch('/accounts/:platform/token', async (c) => {
  const companyId = c.get('companyId');
  const platform  = c.req.param('platform');
  const body      = await c.req.json() as {
    accessToken:    string;
    platformUserId?: string;
    accountName?:   string;
    accountHandle?: string;
  };

  if (!body.accessToken?.trim()) {
    return c.json({ error: 'accessToken is required' }, 400);
  }

  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, platform).first<{ id: string }>();

  if (existing) {
    const fields: string[] = ['access_token = ?', 'is_connected = 1', 'updated_at = ?'];
    const values: any[] = [body.accessToken.trim(), now];

    if (body.platformUserId !== undefined) { fields.splice(1, 0, 'platform_user_id = ?'); values.splice(1, 0, body.platformUserId || null); }
    if (body.accountName !== undefined)    { fields.splice(1, 0, 'account_name = ?');    values.splice(1, 0, body.accountName.trim()); }
    if (body.accountHandle !== undefined)  { fields.splice(1, 0, 'account_handle = ?');  values.splice(1, 0, body.accountHandle.trim() || null); }

    values.push(existing.id);
    await c.env.DB.prepare(
      `UPDATE maas_connected_accounts SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO maas_connected_accounts
        (id, company_id, platform, account_name, account_handle, access_token, platform_user_id, is_connected, connected_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      generateId(), companyId, platform,
      body.accountName?.trim() || platform,
      body.accountHandle?.trim() || null,
      body.accessToken.trim(),
      body.platformUserId || null,
      now, now,
    ).run();
  }

  const row = await c.env.DB.prepare(
    'SELECT * FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, platform).first<ConnectedAccountRow>();
  return c.json(accountRowToResponse(row!));
});

// ===================== NOTIFICATION PREFERENCES =====================

// GET /api/marketing/notifications
settingsRoutes.get('/notifications', async (c) => {
  const companyId = c.get('companyId');
  const row = await c.env.DB.prepare(
    'SELECT * FROM maas_notification_preferences WHERE company_id = ?'
  ).bind(companyId).first<NotificationPrefsRow>();

  if (!row) return c.json({ postPublishedAlerts: true, engagementMilestones: true, scheduledPostReminders: false });
  return c.json(notifPrefsRowToResponse(row));
});

// PUT /api/marketing/notifications
settingsRoutes.put('/notifications', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_notification_preferences WHERE company_id = ?'
  ).bind(companyId).first();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE maas_notification_preferences SET
        post_published_alerts = ?, engagement_milestones = ?, scheduled_post_reminders = ?, updated_at = ?
      WHERE company_id = ?
    `).bind(
      body.postPublishedAlerts ? 1 : 0,
      body.engagementMilestones ? 1 : 0,
      body.scheduledPostReminders ? 1 : 0,
      now, companyId
    ).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO maas_notification_preferences (id, company_id, post_published_alerts, engagement_milestones, scheduled_post_reminders, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(), companyId,
      body.postPublishedAlerts ? 1 : 0,
      body.engagementMilestones ? 1 : 0,
      body.scheduledPostReminders ? 1 : 0,
      now
    ).run();
  }

  return c.json(body);
});

// ===================== DASHBOARD STATS =====================

// GET /api/marketing/stats
settingsRoutes.get('/stats', async (c) => {
  const companyId = c.get('companyId');

  const [totalPosts, publishedPosts, scheduledPosts, draftPosts, totalCampaigns, activeCampaigns] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as c FROM maas_posts WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM maas_posts WHERE company_id = ? AND status = 'published'`).bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM maas_posts WHERE company_id = ? AND status = 'scheduled'`).bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM maas_posts WHERE company_id = ? AND status = 'draft'`).bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as c FROM maas_campaigns WHERE company_id = ?').bind(companyId).first<{ c: number }>(),
    c.env.DB.prepare(`SELECT COUNT(*) as c FROM maas_campaigns WHERE company_id = ? AND status = 'active'`).bind(companyId).first<{ c: number }>(),
  ]);

  const reachRow = await c.env.DB.prepare(
    'SELECT COALESCE(SUM(reach), 0) as total_reach, COALESCE(SUM(engagement), 0) as total_engagement FROM maas_posts WHERE company_id = ?'
  ).bind(companyId).first<{ total_reach: number; total_engagement: number }>();

  // Recent posts (last 10)
  const recentPosts = await c.env.DB.prepare(
    `SELECT * FROM maas_posts WHERE company_id = ? ORDER BY COALESCE(published_at, created_at) DESC LIMIT 10`
  ).bind(companyId).all<PostRow>();

  // Connected accounts
  const accounts = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM maas_connected_accounts WHERE company_id = ? AND is_connected = 1'
  ).bind(companyId).first<{ c: number }>();

  return c.json({
    posts: {
      total: totalPosts?.c || 0,
      published: publishedPosts?.c || 0,
      scheduled: scheduledPosts?.c || 0,
      drafts: draftPosts?.c || 0,
    },
    campaigns: {
      total: totalCampaigns?.c || 0,
      active: activeCampaigns?.c || 0,
    },
    totalReach: reachRow?.total_reach || 0,
    totalEngagement: reachRow?.total_engagement || 0,
    connectedAccounts: accounts?.c || 0,
    recentPosts: recentPosts.results.map((r) => ({
      id: r.id,
      content: r.content,
      platforms: JSON.parse(r.platforms || '[]'),
      status: r.status,
      reach: r.reach,
      engagement: r.engagement,
      publishedAt: r.published_at,
      scheduledAt: r.scheduled_at,
      createdAt: r.created_at,
    })),
  });
});
