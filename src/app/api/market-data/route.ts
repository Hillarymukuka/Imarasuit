import { NextResponse } from 'next/server';

export const revalidate = 3600; // cache responses for 1 hour

// ── News sources ────────────────────────────────────────────────
const NEWS_FEEDS = [
  { url: 'https://znbc.co.zm/feed/',                          name: 'ZNBC' },
  { url: 'https://diggers.news/business/feed/',               name: 'Diggers' },
  { url: 'https://www.techtrends.co.zm/feed/',                name: 'TechTrends' },
  { url: 'https://www.theafricareport.com/country/zambia/feed/', name: 'Africa Report' },
];

// ── RSS parser (no external deps) ──────────────────────────────
function parseRSS(xml: string, source: string, max = 3) {
  const items: { title: string; link: string; source: string; pubDate: string }[] = [];
  const pattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(xml)) !== null && items.length < max) {
    const chunk = m[1];
    const title = chunk
      .match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]
      ?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim();
    const link =
      chunk.match(/<link>([^<]+)<\/link>/i)?.[1]?.trim() ||
      chunk.match(/<guid[^>]*isPermaLink="true"[^>]*>([^<]+)<\/guid>/i)?.[1]?.trim();
    const pubDate = chunk.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    if (title && link?.startsWith('http')) {
      items.push({ title, link, source, pubDate });
    }
  }
  return items;
}

// ── Relative time helper ────────────────────────────────────────
function relativeTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ''; }
}

export async function GET() {
  // ── Exchange rates via open.er-api.com (free, no key, includes ZMW) ─
  // Returns all rates relative to USD. We read rates.ZMW for the base
  // and cross-calculate: ZMW per X = rates.ZMW / rates.X
  let rates: { currency: string; name: string; zmwRate: number; symbol: string; flag: string }[] = [];
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json() as { result: string; rates: Record<string, number> };
      if (data.result === 'success') {
        const zmw = data.rates['ZMW'] ?? 0;
        const meta: Record<string, { name: string; symbol: string; flag: string }> = {
          USD: { name: 'US Dollar',     symbol: '$',  flag: '🇺🇸' },
          EUR: { name: 'Euro',          symbol: '€',  flag: '🇪🇺' },
          GBP: { name: 'British Pound', symbol: '£',  flag: '🇬🇧' },
          ZAR: { name: 'SA Rand',       symbol: 'R',  flag: '🇿🇦' },
          CNY: { name: 'Chinese Yuan',  symbol: '¥',  flag: '🇨🇳' },
        };
        const targets: Array<[string, number]> = [
          ['USD', zmw],
          ['EUR', zmw / (data.rates['EUR'] ?? 1)],
          ['GBP', zmw / (data.rates['GBP'] ?? 1)],
          ['ZAR', zmw / (data.rates['ZAR'] ?? 1)],
          ['CNY', zmw / (data.rates['CNY'] ?? 1)],
        ];
        rates = targets
          .map(([currency, rate]) => ({
            currency,
            zmwRate: parseFloat(rate.toFixed(2)),
            ...meta[currency],
          }))
          .filter(r => r.zmwRate > 0);
      }
    }
  } catch { /* silently degrade */ }

  // ── News feeds (parallel, fail silently per source) ───────────
  const rawNews: { title: string; link: string; source: string; pubDate: string }[] = [];
  await Promise.allSettled(
    NEWS_FEEDS.map(async ({ url, name }) => {
      try {
        const res = await fetch(url, {
          next: { revalidate: 3600 },
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BizSuite/1.0; +https://bizsuite.app)' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const xml = await res.text();
          rawNews.push(...parseRSS(xml, name, 3));
        }
      } catch { /* source unavailable */ }
    })
  );

  const news = rawNews
    .sort((a, b) => {
      try { return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(); } catch { return 0; }
    })
    .slice(0, 10)
    .map(item => ({ ...item, relTime: relativeTime(item.pubDate) }));

  return NextResponse.json({ rates, news, fetchedAt: new Date().toISOString() });
}
