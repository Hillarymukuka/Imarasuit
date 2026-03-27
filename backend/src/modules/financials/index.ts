// Financials backend module – registers route groups
import { Hono } from 'hono';
import { AppEnv } from '../../types';
import { requireModule } from '../../middleware/module';
import { financialsRoutes } from './routes/financials';

export function registerRoutes(app: Hono<AppEnv>) {
  const moduleGuard = requireModule('financials');

  // Financials routes
  app.route('/api/financials', financialsRoutes);

  // Apply module guard to entire /api/financials/* prefix
  app.use('/api/financials/*', moduleGuard);
}
