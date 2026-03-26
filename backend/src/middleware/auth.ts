// Auth middleware for protected routes
import { Context, Next } from 'hono';
import { verifyJWT } from '../utils/auth';
import { AppEnv } from '../types';

export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  const token = authHeader.substring(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  if (!payload.sub || !payload.company_id) {
    return c.json({ error: 'Invalid token payload — please log in again' }, 401);
  }

  c.set('userId', payload.sub as string);
  c.set('companyId', payload.company_id as string);
  await next();
}
