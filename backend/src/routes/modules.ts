// Tenant Modules API – query and manage module subscriptions
import { Hono } from 'hono';
import { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';

const modulesRoutes = new Hono<AppEnv>();

// All routes require auth
modulesRoutes.use('*', authMiddleware);

// GET /api/modules – list modules and their status for the current tenant
modulesRoutes.get('/', async (c) => {
  const companyId = c.get('companyId');

  const rows = await c.env.DB.prepare(
    'SELECT module_id, enabled FROM tenant_modules WHERE company_id = ?'
  )
    .bind(companyId)
    .all<{ module_id: string; enabled: number }>();

  // Build a map of module_id → enabled
  const moduleStatus: Record<string, boolean> = {};
  for (const row of rows.results || []) {
    moduleStatus[row.module_id] = row.enabled === 1;
  }

  return c.json({ modules: moduleStatus });
});

// PUT /api/modules/:moduleId – enable or disable a module (owner only in future)
modulesRoutes.put('/:moduleId', async (c) => {
  const companyId = c.get('companyId');
  const moduleId = c.req.param('moduleId');
  const { enabled } = await c.req.json<{ enabled: boolean }>();

  // Upsert
  await c.env.DB.prepare(`
    INSERT INTO tenant_modules (id, company_id, module_id, enabled, enabled_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(company_id, module_id)
    DO UPDATE SET enabled = ?, disabled_at = CASE WHEN ? = 0 THEN datetime('now') ELSE NULL END
  `)
    .bind(
      `${companyId}_${moduleId}`,
      companyId,
      moduleId,
      enabled ? 1 : 0,
      enabled ? 1 : 0,
      enabled ? 1 : 0,
    )
    .run();

  return c.json({ moduleId, enabled });
});

export { modulesRoutes };
