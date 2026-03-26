// Marketing module – Social media publishing utility
// Calls real social platform APIs to publish posts

export interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
}

interface PostPayload {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
}

interface AccountPayload {
  platform: string;
  accessToken: string | null;
  platformUserId: string | null;
  accountName: string;
}

// Publish a post to all target platforms that have connected accounts
export async function publishPost(
  post: PostPayload,
  accounts: AccountPayload[],
): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  for (const platform of post.platforms) {
    const account = accounts.find((a) => a.platform === platform);

    if (!account?.accessToken) {
      results.push({
        platform,
        success: false,
        error: `No access token for ${platform}. Please reconnect your account in Marketing Settings.`,
      });
      continue;
    }

    try {
      let result: PublishResult;
      switch (platform) {
        case 'twitter':
          result = await publishToTwitter(account.accessToken, post.content, post.mediaUrls);
          break;
        case 'linkedin':
          result = await publishToLinkedIn(account.accessToken, account.platformUserId || '', post.content, post.mediaUrls);
          break;
        case 'facebook':
          result = await publishToFacebook(account.accessToken, account.platformUserId || 'me', post.content, post.mediaUrls);
          break;
        case 'instagram':
          result = await publishToInstagram(account.accessToken, account.platformUserId || '', post.content, post.mediaUrls);
          break;
        default:
          result = { platform, success: false, error: `Unsupported platform: ${platform}` };
      }
      results.push(result);
    } catch (err: any) {
      results.push({ platform, success: false, error: err.message || `Failed to publish to ${platform}` });
    }
  }

  return results;
}

// ─── Platform-specific publishers ──────────────────────────────────────────

async function publishToTwitter(accessToken: string, content: string, mediaUrls: string[]): Promise<PublishResult> {
  const mediaIds: string[] = [];

  for (const url of mediaUrls.slice(0, 4)) {
    try {
      const imgResp = await fetch(url);
      if (!imgResp.ok) continue;
      const imgData = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';

      const form = new FormData();
      form.append('media', new Blob([imgData], { type: contentType }));

      const uploadResp = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      if (uploadResp.ok) {
        const uploadData = await uploadResp.json() as any;
        if (uploadData.media_id_string) mediaIds.push(uploadData.media_id_string);
      }
    } catch {
      // skip failed upload
    }
  }

  const tweetBody: any = { text: content.slice(0, 280) };
  if (mediaIds.length > 0) tweetBody.media = { media_ids: mediaIds };

  const resp = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tweetBody),
  });

  if (!resp.ok) {
    const err = await resp.json() as any;
    return {
      platform: 'twitter',
      success: false,
      error: err.detail || err.errors?.[0]?.message || `Twitter API error ${resp.status}`,
    };
  }

  const data = await resp.json() as any;
  return {
    platform: 'twitter',
    success: true,
    postId: data.data?.id,
    url: data.data?.id ? `https://twitter.com/i/web/status/${data.data.id}` : undefined,
  };
}

async function publishToLinkedIn(accessToken: string, authorUrn: string, content: string, mediaUrls: string[]): Promise<PublishResult> {
  if (!authorUrn) {
    return {
      platform: 'linkedin',
      success: false,
      error: 'LinkedIn author identity is missing. Please reconnect your account.',
    };
  }

  const urn = authorUrn.startsWith('urn:li:') ? authorUrn : `urn:li:person:${authorUrn}`;
  const liHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version': '202503',
  };

  // Upload images to LinkedIn and collect asset URNs
  const imageUrns: string[] = [];
  for (const url of mediaUrls.slice(0, 20)) {
    try {
      // Step 1: initialise upload, get signed URL + asset URN
      const initResp = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
        method: 'POST',
        headers: liHeaders,
        body: JSON.stringify({ initializeUploadRequest: { owner: urn } }),
      });
      if (!initResp.ok) continue;
      const initData = await initResp.json() as any;
      const uploadUrl: string | undefined = initData.value?.uploadUrl;
      const imageUrn: string | undefined = initData.value?.image;
      if (!uploadUrl || !imageUrn) continue;

      // Step 2: fetch image binary from R2
      const imgResp = await fetch(url);
      if (!imgResp.ok) continue;
      const imgData = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';

      // Step 3: PUT binary to LinkedIn's signed upload URL
      const putResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': contentType },
        body: imgData,
      });
      if (putResp.ok || putResp.status === 201) imageUrns.push(imageUrn);
    } catch {
      // skip failed image
    }
  }

  const postBody: any = {
    author: urn,
    commentary: content.slice(0, 3000),
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };

  if (imageUrns.length === 1) {
    postBody.content = { media: { id: imageUrns[0], altText: 'Image' } };
  } else if (imageUrns.length > 1) {
    postBody.content = { multiImage: { images: imageUrns.map((id) => ({ id, altText: 'Image' })) } };
  }

  const resp = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: liHeaders,
    body: JSON.stringify(postBody),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return { platform: 'linkedin', success: false, error: `LinkedIn API ${resp.status}: ${errText.slice(0, 300)}` };
  }

  const postId = resp.headers.get('x-restli-id') || '';
  return { platform: 'linkedin', success: true, postId };
}

async function publishToFacebook(accessToken: string, pageId: string, content: string, mediaUrls: string[]): Promise<PublishResult> {
  // Single image: post via /photos (shows as a proper photo post)
  if (mediaUrls.length === 1) {
    const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: mediaUrls[0], caption: content, access_token: accessToken }),
    });
    const data = await resp.json() as any;
    if (!resp.ok || data.error) {
      return { platform: 'facebook', success: false, error: data.error?.message || `Facebook API ${resp.status}` };
    }
    return { platform: 'facebook', success: true, postId: data.id };
  }

  // Multiple images: upload each unpublished then attach to a feed post
  if (mediaUrls.length > 1) {
    const photoIds: string[] = [];
    for (const url of mediaUrls.slice(0, 10)) {
      try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, published: false, access_token: accessToken }),
        });
        const d = await r.json() as any;
        if (r.ok && d.id) photoIds.push(d.id);
      } catch { /* skip */ }
    }
    const attached = photoIds.map((id) => ({ media_fbid: id }));
    const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content, attached_media: attached, access_token: accessToken }),
    });
    const data = await resp.json() as any;
    if (!resp.ok || data.error) {
      return { platform: 'facebook', success: false, error: data.error?.message || `Facebook API ${resp.status}` };
    }
    return { platform: 'facebook', success: true, postId: data.id };
  }

  // Text-only post
  const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: content, access_token: accessToken }),
  });
  const data = await resp.json() as any;
  if (!resp.ok || data.error) {
    return { platform: 'facebook', success: false, error: data.error?.message || `Facebook API ${resp.status}` };
  }
  return { platform: 'facebook', success: true, postId: data.id };
}

async function publishToInstagram(accessToken: string, igUserId: string, content: string, mediaUrls?: string[]): Promise<PublishResult> {
  if (!igUserId) {
    return { platform: 'instagram', success: false, error: 'Instagram user ID missing. Please reconnect your account.' };
  }
  if (!mediaUrls || mediaUrls.length === 0) {
    return { platform: 'instagram', success: false, error: 'Instagram feed posts require at least one image URL.' };
  }

  // Step 1: Create media container
  const containerResp = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: mediaUrls[0],
      caption: content.slice(0, 2200),
      access_token: accessToken,
    }),
  });

  const container = await containerResp.json() as any;
  if (!containerResp.ok || container.error) {
    return { platform: 'instagram', success: false, error: container.error?.message || 'Failed to create Instagram media container' };
  }

  // Step 2: Publish the container
  const publishResp = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
  });

  const publishData = await publishResp.json() as any;
  if (!publishResp.ok || publishData.error) {
    return { platform: 'instagram', success: false, error: publishData.error?.message || 'Failed to publish Instagram post' };
  }

  return { platform: 'instagram', success: true, postId: publishData.id };
}

// ─── Scheduled post processor (called by Cloudflare Cron trigger) ──────────

export async function processScheduledPosts(env: { DB: D1Database; [key: string]: any }): Promise<void> {
  const now = new Date().toISOString();

  // Find all posts that are due for publishing
  const duePosts = await env.DB.prepare(
    `SELECT * FROM maas_posts WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at ASC LIMIT 50`
  ).bind(now).all<any>();

  if (!duePosts.results.length) return;

  for (const post of duePosts.results) {
    const platforms: string[] = JSON.parse(post.platforms || '[]');

    // Fetch connected accounts for this company
    const accountRows = await env.DB.prepare(
      `SELECT platform, access_token, platform_user_id, account_name FROM maas_connected_accounts WHERE company_id = ? AND is_connected = 1`
    ).bind(post.company_id).all<any>();

    const accounts: AccountPayload[] = accountRows.results.map((a: any) => ({
      platform: a.platform,
      accessToken: a.access_token,
      platformUserId: a.platform_user_id,
      accountName: a.account_name,
    }));

    const results = await publishPost(
      {
        id: post.id,
        content: post.content,
        platforms,
        mediaUrls: JSON.parse(post.media_urls || '[]'),
      },
      accounts,
    );

    const anySucceeded = results.some((r) => r.success);
    const newStatus = anySucceeded ? 'published' : 'failed';

    await env.DB.prepare(
      'UPDATE maas_posts SET status = ?, published_at = ?, updated_at = ? WHERE id = ?'
    ).bind(newStatus, anySucceeded ? now : null, now, post.id).run();
  }
}
