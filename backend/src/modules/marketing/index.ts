// Marketing module – registers all route groups
import { Hono } from 'hono';
import { AppEnv } from '../../types';
import { authMiddleware } from '../../middleware/auth';
import { requireModule } from '../../middleware/module';
import { campaignRoutes } from './routes/campaigns';
import { postRoutes } from './routes/posts';
import { settingsRoutes } from './routes/settings';
import { aiRoutes } from './routes/ai';
import { oauthInitiateRoutes } from './routes/oauth';

export function registerRoutes(app: Hono<AppEnv>) {
  // Apply auth + module guard (auth must run first so companyId is set)
  app.use('/api/marketing/*', authMiddleware, requireModule('marketing'));

  // Campaigns
  app.route('/api/marketing/campaigns', campaignRoutes);
  // Posts
  app.route('/api/marketing/posts', postRoutes);
  // AI (Workers AI)
  app.route('/api/marketing/ai', aiRoutes);
  // OAuth initiate (protected — returns the OAuth URL for a platform)
  app.route('/api/marketing/oauth', oauthInitiateRoutes);
  // Settings (accounts, notifications, stats)
  app.route('/api/marketing', settingsRoutes);
}
