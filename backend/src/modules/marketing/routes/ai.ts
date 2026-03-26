// Marketing module – AI-powered content generation routes (Workers AI)
import { Hono } from 'hono';
import { AppEnv } from '../../../types';

export const aiRoutes = new Hono<AppEnv>();
// Auth is already applied at the module level via app.use('/api/marketing/*', authMiddleware, ...)

// Helper: Run AI model via Cloudflare REST API
async function runAI(c: any, messages: { role: string; content: string }[], opts?: { max_tokens?: number; temperature?: number }) {
  const model = '@cf/meta/llama-3.1-8b-instruct';
  const params = { messages, max_tokens: opts?.max_tokens || 512, temperature: opts?.temperature || 0.7 };

  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = c.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) {
    throw new Error('Workers AI is not available. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in wrangler.toml.');
  }

  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    }
  );
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI API error: ${resp.status} – ${err}`);
  }
  const data = await resp.json() as any;
  return data.result?.response || '';
}

// POST /api/marketing/ai/generate – Generate social media copy
aiRoutes.post('/generate', async (c) => {
  const body = await c.req.json();
  const { prompt, platforms, tone, maxLength } = body as {
    prompt: string;
    platforms?: string[];
    tone?: string;
    maxLength?: number;
  };

  if (!prompt?.trim()) {
    return c.json({ error: 'Prompt is required' }, 400);
  }

  const platformHints = platforms?.length
    ? `Target platforms: ${platforms.join(', ')}. `
    : '';
  const toneHint = tone ? `Tone: ${tone}. ` : 'Tone: professional yet engaging. ';
  const lengthHint = maxLength ? `Keep it under ${maxLength} characters. ` : '';

  const systemPrompt = `You are a social media marketing copywriter. Write concise, engaging social media posts. ${platformHints}${toneHint}${lengthHint}Include relevant hashtags. Return ONLY the post content, no explanations or preamble.`;

  try {
    const text = await runAI(c, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ], { max_tokens: 512, temperature: 0.7 });

    return c.json({ content: text.trim() });
  } catch (err: any) {
    console.error('Workers AI error:', err);
    return c.json({ error: err.message || 'AI generation failed. Please try again.' }, 500);
  }
});

// POST /api/marketing/ai/rewrite – Rewrite/improve existing copy
aiRoutes.post('/rewrite', async (c) => {
  const body = await c.req.json();
  const { content, instruction, platform } = body as {
    content: string;
    instruction?: string;
    platform?: string;
  };

  if (!content?.trim()) {
    return c.json({ error: 'Content is required' }, 400);
  }

  const platformNote = platform ? ` Optimise for ${platform}.` : '';
  const task = instruction || 'Improve this post to be more engaging and compelling';

  try {
    const text = await runAI(c, [
      {
        role: 'system',
        content: `You are a social media copywriter. ${task}.${platformNote} Return ONLY the improved post content, no explanations.`,
      },
      { role: 'user', content },
    ], { max_tokens: 512, temperature: 0.7 });

    return c.json({ content: text.trim() });
  } catch (err: any) {
    console.error('Workers AI rewrite error:', err);
    return c.json({ error: err.message || 'AI rewrite failed. Please try again.' }, 500);
  }
});

// POST /api/marketing/ai/hashtags – Generate hashtags for content
aiRoutes.post('/hashtags', async (c) => {
  const body = await c.req.json();
  const { content, count } = body as { content: string; count?: number };

  if (!content?.trim()) {
    return c.json({ error: 'Content is required' }, 400);
  }

  try {
    const text = await runAI(c, [
      {
        role: 'system',
        content: `Generate ${count || 5} relevant hashtags for this social media post. Return ONLY the hashtags separated by spaces, nothing else.`,
      },
      { role: 'user', content },
    ], { max_tokens: 128, temperature: 0.6 });

    const hashtags = text.trim().match(/#\w+/g) || [];

    return c.json({ hashtags });
  } catch (err: any) {
    console.error('Workers AI hashtags error:', err);
    return c.json({ error: 'Hashtag generation failed.' }, 500);
  }
});
