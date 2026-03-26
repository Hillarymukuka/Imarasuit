// Marketing module – OAuth 2.0 helpers
// Supports Twitter (PKCE), LinkedIn, and Facebook/Instagram

// ─── PKCE Utilities ────────────────────────────────────────────────────────

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return base64UrlEncode(new Uint8Array(hash));
}

// ─── State Encoding (signed with JWT_SECRET for tamper-proofing) ───────────

export async function encodeOAuthState(data: Record<string, string>, secret: string): Promise<string> {
  const json = JSON.stringify(data);
  const b64  = btoa(json);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(b64));
  const sigHex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${b64}.${sigHex}`;
}

export async function decodeOAuthState(state: string, secret: string): Promise<Record<string, string> | null> {
  try {
    const dotIdx = state.lastIndexOf('.');
    if (dotIdx < 0) return null;
    const b64    = state.slice(0, dotIdx);
    const sigHex = state.slice(dotIdx + 1);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sig = new Uint8Array(sigHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(b64));
    if (!valid) return null;
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

// ─── OAuth URL Builders ─────────────────────────────────────────────────────

export async function buildTwitterAuthUrl(
  clientId: string, redirectUri: string, state: string,
  codeChallenge: string,
): Promise<string> {
  const p = new URLSearchParams({
    response_type:         'code',
    client_id:             clientId,
    redirect_uri:          redirectUri,
    scope:                 'tweet.write tweet.read users.read offline.access',
    state,
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://twitter.com/i/oauth2/authorize?${p}`;
}

export function buildLinkedInAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    response_type: 'code',
    client_id:     clientId,
    redirect_uri:  redirectUri,
    // r_organization_admin / w_organization_social require LinkedIn partner review.
    // Use only the universally available scopes; page posting can be added later.
    scope:         'openid profile email w_member_social',
    state,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${p}`;
}

// ─── LinkedIn: fetch administered Company Pages ──────────────────────────────

export interface LinkedInPage {
  id: string;           // urn:li:organization:XXXXXX
  name: string;
  logoUrl?: string;
}

export async function fetchLinkedInPages(accessToken: string): Promise<LinkedInPage[]> {
  try {
    // Step 1: get organization URNs the user administers
    const aclResp = await fetch(
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED',
      { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202503', 'X-Restli-Protocol-Version': '2.0.0' } }
    );
    if (!aclResp.ok) return [];
    const aclData = await aclResp.json() as any;
    const orgUrns: string[] = (aclData.elements || []).map((e: any) => e.organization);
    if (orgUrns.length === 0) return [];

    // Step 2: fetch name + logo for each org
    const pages: LinkedInPage[] = [];
    for (const urn of orgUrns) {
      const orgId = urn.split(':').pop();
      const orgResp = await fetch(
        `https://api.linkedin.com/rest/organizations/${orgId}?fields=id,name,logoV2`,
        { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202503', 'X-Restli-Protocol-Version': '2.0.0' } }
      );
      if (!orgResp.ok) continue;
      const org = await orgResp.json() as any;
      pages.push({
        id:      `urn:li:organization:${orgId}`,
        name:    org.name?.localized?.en_US || org.name?.preferredLocale ? (org.name.localized[`${org.name.preferredLocale.language}_${org.name.preferredLocale.country}`] || 'LinkedIn Page') : 'LinkedIn Page',
        logoUrl: org.logoV2?.original,
      });
    }
    return pages;
  } catch {
    return [];
  }
}

export function buildFacebookAuthUrl(appId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id:     appId,
    redirect_uri:  redirectUri,
    scope:         'pages_manage_posts,pages_read_engagement,instagram_content_publish,instagram_basic',
    state,
    response_type: 'code',
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${p}`;
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
}

export interface SocialProfile {
  accountName: string;
  accountHandle?: string;
  platformUserId?: string;
  accessToken: string;
  refreshToken?: string;
}

export async function exchangeTwitterToken(
  clientId: string, clientSecret: string,
  code: string, redirectUri: string, codeVerifier: string,
): Promise<TokenResponse> {
  const resp = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      Authorization:    `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      code_verifier: codeVerifier,
    }),
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(data.error_description || `Twitter token exchange failed: ${resp.status}`);
  return data;
}

export async function fetchTwitterProfile(accessToken: string): Promise<Partial<SocialProfile>> {
  const resp = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return {};
  const data = await resp.json() as any;
  return {
    accountName:    data.data?.name,
    accountHandle:  data.data?.username,
    platformUserId: data.data?.id,
  };
}

export async function exchangeLinkedInToken(
  clientId: string, clientSecret: string,
  code: string, redirectUri: string,
): Promise<TokenResponse> {
  const resp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     clientId,
      client_secret: clientSecret,
    }),
  });
  const data = await resp.json() as any;
  if (!resp.ok) throw new Error(data.error_description || `LinkedIn token exchange failed: ${resp.status}`);
  return data;
}

export async function fetchLinkedInProfile(accessToken: string): Promise<Partial<SocialProfile>> {
  // Use OpenID Connect userinfo endpoint
  const resp = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) return {};
  const data = await resp.json() as any;
  return {
    accountName:    data.name || 'LinkedIn User',
    accountHandle:  data.email,
    platformUserId: data.sub ? `urn:li:person:${data.sub}` : undefined,
  };
}

export async function exchangeFacebookToken(
  appId: string, appSecret: string,
  code: string, redirectUri: string,
): Promise<TokenResponse> {
  const p = new URLSearchParams({ client_id: appId, client_secret: appSecret, code, redirect_uri: redirectUri });
  const resp = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${p}`);
  const data = await resp.json() as any;
  if (!resp.ok || data.error) throw new Error(data.error?.message || `Facebook token exchange failed: ${resp.status}`);
  return data;
}

// ─── Facebook: fetch ALL managed pages ──────────────────────────────────────

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: string;
}

export async function fetchFacebookAllPages(userAccessToken: string): Promise<FacebookPage[]> {
  const resp = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,picture{url}&access_token=${userAccessToken}`
  );
  if (!resp.ok) return [];
  const data = await resp.json() as any;
  return (data.data || []).map((p: any): FacebookPage => ({
    id:           p.id,
    name:         p.name,
    access_token: p.access_token,
    category:     p.category,
    picture:      p.picture?.data?.url,
  }));
}

// ─── Instagram: resolve Business accounts from pages list ───────────────────

export interface FacebookPageWithInstagram extends FacebookPage {
  igId: string;
  igUsername?: string;
  igName?: string;
}

export async function fetchInstagramForPages(pages: FacebookPage[]): Promise<FacebookPageWithInstagram[]> {
  const results: FacebookPageWithInstagram[] = [];
  for (const page of pages) {
    try {
      const resp = await fetch(
        `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      );
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      if (!data.instagram_business_account?.id) continue;
      const igId = data.instagram_business_account.id;
      const igResp = await fetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=name,username&access_token=${page.access_token}`
      );
      const igUser = igResp.ok ? (await igResp.json() as any) : {};
      results.push({ ...page, igId, igUsername: igUser.username, igName: igUser.name });
    } catch {
      // skip pages that throw
    }
  }
  return results;
}

export async function fetchFacebookPageProfile(userAccessToken: string): Promise<Partial<SocialProfile> & { pageAccessToken?: string }> {
  // Try to get page access token first (for pages_manage_posts scope)
  const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`);
  if (pagesResp.ok) {
    const pages = await pagesResp.json() as any;
    if (pages.data?.length > 0) {
      const page = pages.data[0];
      return {
        accountName:     page.name,
        accountHandle:   page.id,
        platformUserId:  page.id,
        accessToken:     page.access_token,  // Page access token is long-lived
        pageAccessToken: page.access_token,
      };
    }
  }
  // Fall back to personal profile
  const meResp = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${userAccessToken}`);
  if (!meResp.ok) return {};
  const me = await meResp.json() as any;
  return { accountName: me.name, platformUserId: me.id, accessToken: userAccessToken };
}

export async function fetchInstagramProfile(pageAccessToken: string): Promise<Partial<SocialProfile> | null> {
  // Get Facebook page linked to Instagram Business Account
  const pagesResp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${pageAccessToken}`);
  if (!pagesResp.ok) return null;
  const pages = await pagesResp.json() as any;
  if (!pages.data?.length) return null;

  const page = pages.data[0];
  const igResp = await fetch(
    `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
  );
  if (!igResp.ok) return null;
  const igData = await igResp.json() as any;
  if (!igData.instagram_business_account?.id) return null;

  const igId = igData.instagram_business_account.id;
  const igUserResp = await fetch(
    `https://graph.facebook.com/v19.0/${igId}?fields=name,username&access_token=${page.access_token}`
  );
  if (!igUserResp.ok) return null;
  const igUser = await igUserResp.json() as any;

  return {
    accountName:    igUser.name || 'Instagram Account',
    accountHandle:  igUser.username,
    platformUserId: igId,
    accessToken:    page.access_token,
  };
}
