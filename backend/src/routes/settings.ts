// PDF Settings routes
import { Hono } from 'hono';
import { AppEnv, PDFSettingsRow, pdfSettingsRowToResponse } from '../types';
import { authMiddleware } from '../middleware/auth';

export const settingsRoutes = new Hono<AppEnv>();
settingsRoutes.use('*', authMiddleware);

// GET /api/settings/pdf - Get PDF settings for company
settingsRoutes.get('/pdf', async (c) => {
  const companyId = c.get('companyId');

  const row = await c.env.DB.prepare(
    'SELECT * FROM pdf_settings WHERE company_id = ?'
  ).bind(companyId).first<PDFSettingsRow>();

  if (!row) {
    // Create default settings
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO pdf_settings (id, company_id, created_at, updated_at) VALUES (?, ?, ?, ?)`
    ).bind(id, companyId, now, now).run();

    const newRow = await c.env.DB.prepare(
      'SELECT * FROM pdf_settings WHERE id = ?'
    ).bind(id).first<PDFSettingsRow>();

    return c.json(pdfSettingsRowToResponse(newRow!));
  }

  return c.json(pdfSettingsRowToResponse(row));
});

// PUT /api/settings/pdf - Update PDF settings
settingsRoutes.put('/pdf', async (c) => {
  const companyId = c.get('companyId');
  const body = await c.req.json();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `UPDATE pdf_settings SET
      selected_color_id = ?, custom_colors = ?, template = ?,
      show_logo = ?, logo_size = ?, show_bank_info = ?,
      show_terms = ?, footer_text = ?, updated_at = ?
     WHERE company_id = ?`
  ).bind(
    body.selectedColorId || 'blue',
    JSON.stringify(body.customColors || []),
    body.template || 'modern',
    body.showLogo ? 1 : 0,
    body.logoSize || 'medium',
    body.showBankInfo ? 1 : 0,
    body.showTerms ? 1 : 0,
    body.footerText || '',
    now,
    companyId
  ).run();

  const row = await c.env.DB.prepare(
    'SELECT * FROM pdf_settings WHERE company_id = ?'
  ).bind(companyId).first<PDFSettingsRow>();

  return c.json(pdfSettingsRowToResponse(row!));
});
