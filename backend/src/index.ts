// Business Suite API - Cloudflare Workers with Hono + D1
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { AppEnv, Bindings } from './types';
import { authRoutes } from './routes/auth';
import { companyRoutes } from './routes/companies';
import { modulesRoutes } from './routes/modules';
import { registerRoutes as registerBusinessDocuments } from './modules/business-documents';
import { registerRoutes as registerLogistics } from './modules/logistics';
import { registerRoutes as registerMarketing } from './modules/marketing';
import { registerRoutes as registerFinancials } from './modules/financials';
import { settingsRoutes } from './routes/settings';
import { authMiddleware } from './middleware/auth';
import { oauthCallbackRoutes, facebookDataDeletionRoutes } from './modules/marketing/routes/oauth';
import { processScheduledPosts } from './modules/marketing/utils/social-publisher';

const app = new Hono<AppEnv>();

// CORS - allow frontend origins
app.use('*', cors({
  origin: (origin) => {
    // Allow localhost and Cloudflare Pages domains
    if (!origin) return '*';
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return origin;
    if (origin.includes('pages.dev')) return origin;
    if (origin.includes('cloudflare')) return origin;
    return origin; // Allow all in development; restrict in production
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Protected routes: Apply auth middleware to /api/auth/me (must be before app.route)
app.use('/api/auth/me', authMiddleware);

// Public routes (no auth required — login, signup)
app.route('/api/auth', authRoutes);
app.route('/api/oauth/callback', oauthCallbackRoutes);
app.route('/api/facebook/data-deletion', facebookDataDeletionRoutes);

// Public R2 media serving (no auth — needed so <img src> URLs work without a token)
app.get('/api/media/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.MEDIA_BUCKET.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(obj.body as ReadableStream, { headers });
});

// Protected API routes
app.route('/api/company', companyRoutes);
app.route('/api/modules', modulesRoutes);
app.route('/api/settings', settingsRoutes);

// Module routes
registerBusinessDocuments(app);
registerLogistics(app);
registerMarketing(app);
registerFinancials(app);

// 404 for unmatched routes
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

// Export as module with fetch handler + scheduled cron trigger
export default {
  fetch: app.fetch.bind(app),
  // Cloudflare Cron trigger: auto-publish scheduled posts every 5 minutes
  async scheduled(_event: ScheduledEvent, env: Bindings, _ctx: ExecutionContext) {
    try {
      await processScheduledPosts(env as any);
    } catch (err) {
      console.error('Scheduled job error:', err);
    }
  },
};
