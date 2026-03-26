// Marketing module â€“ OAuth routes
// Two separate routers:
//   oauthInitiateRoutes â†’ behind authMiddleware (POST /:platform/initiate, GET /:platform/pending-pages, POST /:platform/confirm-page)
//   oauthCallbackRoutes â†’ public, registered in main index.ts (GET /:platform)

import { Hono } from 'hono';
import { AppEnv } from '../../../types';
import {
  generateCodeVerifier, generateCodeChallenge,
  buildTwitterAuthUrl, buildLinkedInAuthUrl, buildFacebookAuthUrl,
  encodeOAuthState, decodeOAuthState,
  exchangeTwitterToken, fetchTwitterProfile,
  exchangeLinkedInToken, fetchLinkedInProfile, fetchLinkedInPages,
  exchangeFacebookToken, fetchFacebookAllPages, fetchInstagramForPages,
  FacebookPage, FacebookPageWithInstagram,
} from '../utils/oauth-helpers';

// â”€â”€â”€ Protected: initiate + page-selector routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const oauthInitiateRoutes = new Hono<AppEnv>();
// GET /configured → returns which platforms have credentials set up
oauthInitiateRoutes.get('/configured', (c) => {
  return c.json({
    twitter:   !!(c.env.TWITTER_CLIENT_ID  && c.env.TWITTER_CLIENT_SECRET),
    linkedin:  !!(c.env.LINKEDIN_CLIENT_ID && c.env.LINKEDIN_CLIENT_SECRET),
    facebook:  !!(c.env.FACEBOOK_APP_ID    && c.env.FACEBOOK_APP_SECRET),
    instagram: !!(c.env.FACEBOOK_APP_ID    && c.env.FACEBOOK_APP_SECRET),
  });
});
// POST /:platform/initiate â†’ returns { url } for browser redirect
oauthInitiateRoutes.post('/:platform/initiate', async (c) => {
  const platform  = c.req.param('platform');
  const companyId = c.get('companyId');
  const redirectBase = c.env.OAUTH_REDIRECT_BASE || 'http://localhost:8787';
  const redirectUri  = `${redirectBase}/api/oauth/callback/${platform}`;

  let authUrl: string;

  try {
    switch (platform) {
      case 'twitter': {
        const clientId = c.env.TWITTER_CLIENT_ID;
        if (!clientId) return c.json({ error: 'Twitter OAuth is not configured. Add TWITTER_CLIENT_ID to wrangler.toml.' }, 503);
        const codeVerifier  = generateCodeVerifier();
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state         = await encodeOAuthState({ companyId, platform, codeVerifier }, c.env.JWT_SECRET);
        authUrl = await buildTwitterAuthUrl(clientId, redirectUri, state, codeChallenge);
        break;
      }
      case 'linkedin': {
        const clientId = c.env.LINKEDIN_CLIENT_ID;
        if (!clientId) return c.json({ error: 'LinkedIn OAuth is not configured. Add LINKEDIN_CLIENT_ID to wrangler.toml.' }, 503);
        const state = await encodeOAuthState({ companyId, platform }, c.env.JWT_SECRET);
        authUrl = buildLinkedInAuthUrl(clientId, redirectUri, state);
        break;
      }
      case 'facebook':
      case 'instagram': {
        const appId = c.env.FACEBOOK_APP_ID;
        if (!appId) return c.json({ error: 'Facebook OAuth is not configured. Add FACEBOOK_APP_ID to wrangler.toml.' }, 503);
        const state = await encodeOAuthState({ companyId, platform }, c.env.JWT_SECRET);
        authUrl = buildFacebookAuthUrl(appId, redirectUri, state);
        break;
      }
      default:
        return c.json({ error: `Unknown platform: ${platform}` }, 400);
    }
    return c.json({ url: authUrl });
  } catch (err: any) {
    console.error('OAuth initiate error:', err);
    return c.json({ error: err.message || 'Failed to initiate OAuth' }, 500);
  }
});

// GET /facebook/pending-pages?session=UUID  â†’  { pages: FacebookPage[] }
// GET /instagram/pending-pages?session=UUID â†’  { pages: FacebookPageWithInstagram[] }
oauthInitiateRoutes.get('/:platform/pending-pages', async (c) => {
  const platform  = c.req.param('platform') as 'facebook' | 'instagram';
  const sessionId = c.req.query('session');
  const companyId = c.get('companyId');
  if (!sessionId) return c.json({ error: 'Missing session parameter' }, 400);

  const row = await c.env.DB.prepare(
    'SELECT pages_json, expires_at, company_id FROM maas_oauth_pending_pages WHERE id = ? AND platform = ?'
  ).bind(sessionId, platform).first<{ pages_json: string; expires_at: string; company_id: string }>();

  if (!row) return c.json({ error: 'Session not found or already used' }, 404);
  if (row.company_id !== companyId) return c.json({ error: 'Forbidden' }, 403);
  if (new Date(row.expires_at) < new Date()) {
    await c.env.DB.prepare('DELETE FROM maas_oauth_pending_pages WHERE id = ?').bind(sessionId).run();
    return c.json({ error: 'Session expired. Please connect again.' }, 410);
  }

  const pages = JSON.parse(row.pages_json);
  return c.json({ pages });
});

// POST /facebook/confirm-page  -> save selected Facebook/Instagram/LinkedIn page
// POST /instagram/confirm-page -> save selected Instagram account (pageId = igId)
// POST /linkedin/confirm-page  -> save selected LinkedIn profile or page
oauthInitiateRoutes.post('/:platform/confirm-page', async (c) => {
  const platform  = c.req.param('platform') as 'facebook' | 'instagram' | 'linkedin';
  const companyId = c.get('companyId');
  const body      = await c.req.json() as { sessionId: string; pageId: string };
  const { sessionId, pageId } = body;

  if (!sessionId || !pageId) return c.json({ error: 'sessionId and pageId are required' }, 400);

  const row = await c.env.DB.prepare(
    'SELECT pages_json, expires_at, company_id FROM maas_oauth_pending_pages WHERE id = ? AND platform = ?'
  ).bind(sessionId, platform).first<{ pages_json: string; expires_at: string; company_id: string }>();

  if (!row) return c.json({ error: 'Session not found or already used' }, 404);
  if (row.company_id !== companyId) return c.json({ error: 'Forbidden' }, 403);
  if (new Date(row.expires_at) < new Date()) {
    await c.env.DB.prepare('DELETE FROM maas_oauth_pending_pages WHERE id = ?').bind(sessionId).run();
    return c.json({ error: 'Session expired. Please connect again.' }, 410);
  }

  const pages = JSON.parse(row.pages_json) as any[];
  const now   = new Date().toISOString();
  let profile: { accountName: string; accountHandle?: string; platformUserId: string; accessToken: string };

  if (platform === 'linkedin') {
    const option = pages.find((p: any) => p.id === pageId);
    if (!option) return c.json({ error: 'Option not found in session' }, 404);
    profile = {
      accountName:    option.name,
      accountHandle:  option.handle,
      platformUserId: option.id,
      accessToken:    option.access_token,
    };
  } else if (platform === 'facebook') {
    const page = pages.find((p: any) => p.id === pageId);
    if (!page) return c.json({ error: 'Page not found in session' }, 404);
    profile = {
      accountName:    page.name,
      accountHandle:  page.id,
      platformUserId: page.id,
      accessToken:    page.access_token,
    };
  } else {
    // Instagram -- pageId here is actually the igId
    const page = pages.find((p: any) => p.igId === pageId);
    if (!page) return c.json({ error: 'Account not found in session' }, 404);
    profile = {
      accountName:    page.igName || page.name,
      accountHandle:  page.igUsername,
      platformUserId: page.igId,
      accessToken:    page.access_token,
    };
  }

  // Upsert connected account
  const existing = await c.env.DB.prepare(
    'SELECT id FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, platform).first<{ id: string }>();

  if (existing) {
    await c.env.DB.prepare(`
      UPDATE maas_connected_accounts
      SET account_name = ?, account_handle = ?, access_token = ?, platform_user_id = ?,
          is_connected = 1, updated_at = ?
      WHERE id = ?
    `).bind(profile.accountName, profile.accountHandle || null, profile.accessToken,
            profile.platformUserId, now, existing.id).run();
  } else {
    await c.env.DB.prepare(`
      INSERT INTO maas_connected_accounts
        (id, company_id, platform, account_name, account_handle, access_token, platform_user_id, is_connected, connected_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(crypto.randomUUID(), companyId, platform, profile.accountName,
            profile.accountHandle || null, profile.accessToken, profile.platformUserId, now, now).run();
  }

  // Clean up session
  await c.env.DB.prepare('DELETE FROM maas_oauth_pending_pages WHERE id = ?').bind(sessionId).run();

  return c.json({ success: true, account: { platform, accountName: profile.accountName, accountHandle: profile.accountHandle } });
});

// â”€â”€â”€ Public: OAuth callback handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const oauthCallbackRoutes = new Hono<AppEnv>();

oauthCallbackRoutes.get('/:platform', async (c) => {
  const platform     = c.req.param('platform');
  const code         = c.req.query('code');
  const stateParam   = c.req.query('state');
  const oauthError   = c.req.query('error');
  const frontendUrl  = c.env.FRONTEND_URL || 'http://localhost:3000';
  const settingsUrl  = `${frontendUrl}/marketing/settings`;
  const redirectBase = c.env.OAUTH_REDIRECT_BASE || 'http://localhost:8787';
  const redirectUri  = `${redirectBase}/api/oauth/callback/${platform}`;

  if (oauthError) {
    return c.redirect(`${settingsUrl}?oauth_error=${encodeURIComponent(oauthError)}&platform=${platform}`);
  }
  if (!code || !stateParam) {
    return c.redirect(`${settingsUrl}?oauth_error=missing_params&platform=${platform}`);
  }

  const stateData = await decodeOAuthState(stateParam, c.env.JWT_SECRET);
  if (!stateData?.companyId) {
    return c.redirect(`${settingsUrl}?oauth_error=invalid_state&platform=${platform}`);
  }

  const { companyId, codeVerifier } = stateData;
  const now = new Date().toISOString();

  try {
    // â”€â”€ Twitter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (platform === 'twitter') {
      const tokens   = await exchangeTwitterToken(
        c.env.TWITTER_CLIENT_ID, c.env.TWITTER_CLIENT_SECRET,
        code, redirectUri, codeVerifier || '',
      );
      const userInfo = await fetchTwitterProfile(tokens.access_token);
      await upsertAccount(c.env.DB, companyId, 'twitter', {
        accountName:    userInfo.accountName    || 'Twitter Account',
        accountHandle:  userInfo.accountHandle,
        platformUserId: userInfo.platformUserId,
        accessToken:    tokens.access_token,
        refreshToken:   tokens.refresh_token,
      }, now);
      return c.redirect(`${settingsUrl}?oauth_success=twitter`);
    }
    // -- LinkedIn ----------------------------------------------------------
    if (platform === 'linkedin') {
      const tokens   = await exchangeLinkedInToken(c.env.LINKEDIN_CLIENT_ID, c.env.LINKEDIN_CLIENT_SECRET, code, redirectUri);
      const userInfo = await fetchLinkedInProfile(tokens.access_token);

      // r_organization_admin requires LinkedIn partner approval – skip silently if not granted
      const pages = await fetchLinkedInPages(tokens.access_token);

      // Personal profile option (always present)
      const profileId = userInfo.platformUserId || '';
      if (!profileId) {
        // Token or profile fetch completely failed – surface a useful error
        return c.redirect(`${settingsUrl}?oauth_error=${encodeURIComponent('Could not retrieve your LinkedIn profile. Please try again.')}&platform=linkedin`);
      }

      const allOptions = [
        {
          id:           profileId,
          name:         userInfo.accountName || 'Personal Profile',
          type:         'profile',
          handle:       userInfo.accountHandle,
          access_token: tokens.access_token,
        },
        ...pages.map((p) => ({ id: p.id, name: p.name, type: 'page', handle: undefined, access_token: tokens.access_token, logoUrl: p.logoUrl })),
      ];

      if (allOptions.length <= 1) {
        // No company pages – connect personal profile directly
        await upsertAccount(c.env.DB, companyId, 'linkedin', {
          accountName:    userInfo.accountName    || 'LinkedIn Profile',
          accountHandle:  userInfo.accountHandle,
          platformUserId: profileId,
          accessToken:    tokens.access_token,
        }, now);
        return c.redirect(`${settingsUrl}?oauth_success=linkedin`);
      }

      // Multiple options – store pending session for picker
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO maas_oauth_pending_pages (id, company_id, platform, pages_json, expires_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(sessionId, companyId, 'linkedin', JSON.stringify(allOptions), expiresAt).run();
      return c.redirect(`${settingsUrl}?linkedin_pages_session=${sessionId}`);
    }

    // â”€â”€ Facebook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (platform === 'facebook') {
      const tokens = await exchangeFacebookToken(c.env.FACEBOOK_APP_ID, c.env.FACEBOOK_APP_SECRET, code, redirectUri);
      const pages  = await fetchFacebookAllPages(tokens.access_token);

      if (pages.length === 0) {
        return c.redirect(`${settingsUrl}?oauth_error=${encodeURIComponent('No Facebook Pages found on your account. You need to be an admin of a Facebook Page to connect it.')}&platform=facebook`);
      }

      if (pages.length === 1) {
        // Auto-connect the only page â€” no selector needed
        await upsertAccount(c.env.DB, companyId, 'facebook', {
          accountName:    pages[0].name,
          accountHandle:  pages[0].id,
          platformUserId: pages[0].id,
          accessToken:    pages[0].access_token,
        }, now);
        return c.redirect(`${settingsUrl}?oauth_success=facebook`);
      }

      // 2+ pages â€” store pending session, let user pick
      const sessionId  = crypto.randomUUID();
      const expiresAt  = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
      await c.env.DB.prepare(
        'INSERT INTO maas_oauth_pending_pages (id, company_id, platform, pages_json, expires_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(sessionId, companyId, 'facebook', JSON.stringify(pages), expiresAt).run();
      return c.redirect(`${settingsUrl}?facebook_pages_session=${sessionId}`);
    }

    // â”€â”€ Instagram â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (platform === 'instagram') {
      const tokens    = await exchangeFacebookToken(c.env.FACEBOOK_APP_ID, c.env.FACEBOOK_APP_SECRET, code, redirectUri);
      const fbPages   = await fetchFacebookAllPages(tokens.access_token);
      const igPages   = await fetchInstagramForPages(fbPages);

      if (igPages.length === 0) {
        return c.redirect(`${settingsUrl}?oauth_error=${encodeURIComponent('No Instagram Business accounts found. Make sure your Instagram is a Business or Creator account linked to a Facebook Page.')}&platform=instagram`);
      }

      if (igPages.length === 1) {
        await upsertAccount(c.env.DB, companyId, 'instagram', {
          accountName:    igPages[0].igName    || igPages[0].name,
          accountHandle:  igPages[0].igUsername,
          platformUserId: igPages[0].igId,
          accessToken:    igPages[0].access_token,
        }, now);
        return c.redirect(`${settingsUrl}?oauth_success=instagram`);
      }

      // 2+ IG accounts â€” store pending session, let user pick
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO maas_oauth_pending_pages (id, company_id, platform, pages_json, expires_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(sessionId, companyId, 'instagram', JSON.stringify(igPages), expiresAt).run();
      return c.redirect(`${settingsUrl}?instagram_pages_session=${sessionId}`);
    }

    return c.redirect(`${settingsUrl}?oauth_error=unknown_platform&platform=${platform}`);

  } catch (err: any) {
    console.error(`OAuth callback error for ${platform}:`, err);
    return c.redirect(`${settingsUrl}?oauth_error=${encodeURIComponent(err.message || 'Connection failed')}&platform=${platform}`);
  }
});


// ─── Public: Facebook Data Deletion Callback ─────────────────────────────────
// Facebook requires a public POST endpoint for data deletion requests.
// Register as a public route: app.route('/api/facebook/data-deletion', facebookDataDeletionRoutes)
// Set this URL in: Facebook App → Settings → Advanced → Data Deletion Request URL:
//   https://<your-domain>/api/facebook/data-deletion

export const facebookDataDeletionRoutes = new Hono<AppEnv>();

// POST / → called by Facebook when a user requests their data be deleted
facebookDataDeletionRoutes.post('/', async (c) => {
  const formData = await c.req.formData().catch(() => null);
  const signedRequest = formData?.get('signed_request');

  if (!signedRequest || typeof signedRequest !== 'string') {
    return c.json({ error: 'Missing signed_request' }, 400);
  }

  const appSecret   = c.env.FACEBOOK_APP_SECRET;
  const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000';

  // signed_request = base64url(HMAC-SHA256(payload)) + '.' + base64url(payload)
  const dotIndex = signedRequest.indexOf('.');
  if (dotIndex === -1) return c.json({ error: 'Invalid signed_request format' }, 400);

  const encodedSig     = signedRequest.substring(0, dotIndex);
  const encodedPayload = signedRequest.substring(dotIndex + 1);

  // Decode base64url signature
  const sigBytes = Uint8Array.from(
    atob(encodedSig.replace(/-/g, '+').replace(/_/g, '/')),
    (ch) => ch.charCodeAt(0),
  );

  // Verify HMAC-SHA256(payload, FACEBOOK_APP_SECRET)
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(encodedPayload));

  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 403);
  }

  // Decode JSON payload
  let payload: { user_id?: string; algorithm?: string; issued_at?: number };
  try {
    payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return c.json({ error: 'Invalid payload encoding' }, 400);
  }

  const facebookUserId = payload.user_id;
  if (!facebookUserId) return c.json({ error: 'Missing user_id in payload' }, 400);

  const now = new Date().toISOString();

  // Ensure deletion tracking table exists
  await c.env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS facebook_data_deletion_requests (
      id               TEXT PRIMARY KEY,
      facebook_user_id TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'deleted',
      created_at       TEXT NOT NULL
    )
  `).run();

  // Remove all Facebook/Instagram connected account data for this user
  await c.env.DB.prepare(
    `DELETE FROM maas_connected_accounts
     WHERE platform_user_id = ? AND platform IN ('facebook', 'instagram')`,
  ).bind(facebookUserId).run();

  // Record the deletion so the status URL can verify it
  const confirmationCode = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO facebook_data_deletion_requests (id, facebook_user_id, status, created_at)
     VALUES (?, ?, 'deleted', ?)`,
  ).bind(confirmationCode, facebookUserId, now).run();

  const statusUrl = `${frontendUrl}/deletion-status?id=${confirmationCode}`;
  return c.json({ url: statusUrl, confirmation_code: confirmationCode });
});

// GET /status/:id → check deletion status (called by the frontend /deletion-status page)
facebookDataDeletionRoutes.get('/status/:id', async (c) => {
  const id = c.req.param('id');

  const row = await c.env.DB.prepare(
    `SELECT id, status, created_at FROM facebook_data_deletion_requests WHERE id = ?`,
  ).bind(id).first<{ id: string; status: string; created_at: string }>().catch(() => null);

  if (!row) return c.json({ error: 'Deletion request not found' }, 404);

  return c.json({
    confirmation_code: row.id,
    status:            row.status,
    processed_at:      row.created_at,
  });
});

// â”€â”€â”€ Helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function upsertAccount(
  db: any, companyId: string, platform: string,
  profile: { accountName: string; accountHandle?: string; platformUserId?: string; accessToken: string; refreshToken?: string },
  now: string,
) {
  const existing = await db.prepare(
    'SELECT id FROM maas_connected_accounts WHERE company_id = ? AND platform = ?'
  ).bind(companyId, platform).first() as { id: string } | null;

  if (existing) {
    await db.prepare(`
      UPDATE maas_connected_accounts
      SET account_name = ?, account_handle = ?, access_token = ?, refresh_token = ?,
          platform_user_id = ?, is_connected = 1, updated_at = ?
      WHERE id = ?
    `).bind(
      profile.accountName, profile.accountHandle || null,
      profile.accessToken, profile.refreshToken || null,
      profile.platformUserId || null, now, existing.id,
    ).run();
  } else {
    await db.prepare(`
      INSERT INTO maas_connected_accounts
        (id, company_id, platform, account_name, account_handle, access_token, refresh_token, platform_user_id, is_connected, connected_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      crypto.randomUUID(), companyId, platform,
      profile.accountName, profile.accountHandle || null,
      profile.accessToken, profile.refreshToken || null,
      profile.platformUserId || null, now, now,
    ).run();
  }
}
