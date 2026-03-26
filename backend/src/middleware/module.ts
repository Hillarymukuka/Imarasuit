// Module-gate middleware – rejects requests when a module is not enabled for the tenant.
import { Context, Next } from 'hono';
import { AppEnv } from '../types';

/**
 * Returns middleware that checks whether `moduleId` is enabled for the
 * current tenant (companyId set by authMiddleware).
 *
 * Usage:  app.use('/api/documents/*', requireModule('business-documents'));
 *
 * Current implementation: every company has every module enabled by default
 * (if no row exists, the module is assumed enabled). This lets existing
 * tenants keep working without migration. Phase 4+ can tighten this.
 */
export function requireModule(moduleId: string) {
  return async (c: Context<AppEnv>, next: Next) => {
    const companyId = c.get('companyId');
    if (!companyId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const row = await c.env.DB.prepare(
      'SELECT enabled FROM tenant_modules WHERE company_id = ? AND module_id = ?'
    )
      .bind(companyId, moduleId)
      .first<{ enabled: number }>();

    // If no row exists → module is enabled by default (backwards-compat)
    if (row && row.enabled === 0) {
      return c.json(
        { error: `Module "${moduleId}" is not enabled for your organisation.` },
        403
      );
    }

    await next();
  };
}
