// Business Documents module – backend manifest
// Re-exports all routes for this module so the main app can register them.

import { Hono } from 'hono';
import { AppEnv } from '../../types';
import { clientRoutes } from './routes/clients';
import { documentRoutes } from './routes/documents';
import { letterRoutes } from './routes/letters';

export const MODULE_ID = 'business-documents';

/**
 * Register all business-documents routes onto the given Hono app.
 * Called by the main app when this module is enabled for a tenant.
 */
export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/api/clients', clientRoutes);
  app.route('/api/documents', documentRoutes);
  app.route('/api/letters', letterRoutes);
}

export { clientRoutes, documentRoutes, letterRoutes };
