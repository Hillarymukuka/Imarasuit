// Auth routes: signup, login, me
import { Hono } from 'hono';
import { AppEnv, UserRow, CompanyRow, companyRowToResponse } from '../types';
import { hashPassword, verifyPassword, createJWT } from '../utils/auth';

export const authRoutes = new Hono<AppEnv>();

// POST /api/auth/signup
authRoutes.post('/signup', async (c) => {
  const body = await c.req.json();
  const { companyName, name, email, password } = body;

  if (!companyName || !name || !email || !password) {
    return c.json({ error: 'All fields are required: companyName, name, email, password' }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: 'Password must be at least 6 characters' }, 400);
  }

  // Check if email already exists
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first();

  if (existing) {
    return c.json({ error: 'An account with this email already exists' }, 409);
  }

  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  // Create company and user in a batch
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO companies (id, name, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(companyId, companyName, email.toLowerCase(), now, now),

    c.env.DB.prepare(
      `INSERT INTO users (id, company_id, email, password_hash, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'owner', ?, ?)`
    ).bind(userId, companyId, email.toLowerCase(), passwordHash, name, now, now),

    // Create default PDF settings for the company
    c.env.DB.prepare(
      `INSERT INTO pdf_settings (id, company_id, created_at, updated_at)
       VALUES (?, ?, ?, ?)`
    ).bind(crypto.randomUUID(), companyId, now, now),
  ]);

  const token = await createJWT(
    { sub: userId, company_id: companyId, email: email.toLowerCase(), role: 'owner' },
    c.env.JWT_SECRET
  );

  const companyRow = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(companyId).first<CompanyRow>();

  return c.json({
    token,
    user: { id: userId, name, email: email.toLowerCase(), role: 'owner', companyId },
    company: companyRow ? companyRowToResponse(companyRow) : null,
  }, 201);
});

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).bind(email.toLowerCase()).first<UserRow>();

  if (!user) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await createJWT(
    { sub: user.id, company_id: user.company_id, email: user.email, role: user.role },
    c.env.JWT_SECRET
  );

  const companyRow = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(user.company_id).first<CompanyRow>();

  return c.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    },
    company: companyRow ? companyRowToResponse(companyRow) : null,
  });
});

// GET /api/auth/me
authRoutes.get('/me', async (c) => {
  // This route uses auth middleware applied in index.ts
  const userId = c.get('userId');
  const companyId = c.get('companyId');

  const user = await c.env.DB.prepare(
    'SELECT id, name, email, role, company_id FROM users WHERE id = ?'
  ).bind(userId).first<Pick<UserRow, 'id' | 'name' | 'email' | 'role' | 'company_id'>>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const companyRow = await c.env.DB.prepare(
    'SELECT * FROM companies WHERE id = ?'
  ).bind(companyId).first<CompanyRow>();

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
    },
    company: companyRow ? companyRowToResponse(companyRow) : null,
  });
});
