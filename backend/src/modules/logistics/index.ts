// Logistics backend module – registers all route groups
import { Hono } from 'hono';
import { AppEnv } from '../../types';
import { requireModule } from '../../middleware/module';
import { shipmentRoutes } from './routes/shipments';
import { containerRoutes } from './routes/containers';
import { motorcycleRoutes } from './routes/motorcycle';
import { reportsRoutes } from './routes/reports';
import { trackingRoutes } from './routes/tracking';

export function registerRoutes(app: Hono<AppEnv>) {
  const moduleGuard = requireModule('logistics');

  // Public tracking (no auth required)
  app.route('/api/track', trackingRoutes);

  // Shipments
  app.route('/api/logistics/shipments', shipmentRoutes);
  // Containers
  app.route('/api/logistics/containers', containerRoutes);
  // Riders + Deliveries + GPS + Stats
  app.route('/api/logistics', motorcycleRoutes);
  // Reports & CSV export
  app.route('/api/logistics/reports', reportsRoutes);

  // Apply module guard to entire /api/logistics/* prefix
  app.use('/api/logistics/*', moduleGuard);
}
