'use client';

import React from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  ShoppingCartIcon,
  TruckIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
  EllipsisHorizontalIcon,
  ReceiptPercentIcon,
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
} from '@heroicons/react/24/solid';
import { StatusBadge, Skeleton } from '@/components/ui';
import { useDocumentsStore, useClientsStore, useCompanyStore, useUIStore, useThemeStore } from '@/store';
import { useAIContext } from '@/lib/useAIContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';

// ── SVG Donut Chart ─────────────────────────────────────────────
interface DonutSegment { value: number; color: string; label: string }

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const r = 52, cx = 64, cy = 64;
  const circumference = 2 * Math.PI * r;

  if (total === 0) {
    return (
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="#9ca3af" fontSize="11">No data</text>
      </svg>
    );
  }

  let cumulative = 0;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const pct = seg.value / total;
        const dash = circumference * pct;
        const offset = -circumference * cumulative;
        cumulative += pct;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="14"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.6s ease' }}
          />
        );
      })}
      <text x={cx} y={cy - 5} textAnchor="middle" fontSize="16" fontWeight="700"
        style={{ fill: 'currentColor' }} className="fill-gray-900 dark:fill-white">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize="9">Total Docs</text>
    </svg>
  );
}

// ── Market-data types ──────────────────────────────────────────
interface RateItem  { currency: string; name: string; zmwRate: number; symbol: string; flag: string }
interface NewsItem  { title: string; link: string; source: string; relTime: string }
interface MarketData { rates: RateItem[]; news: NewsItem[]; fetchedAt: string }

// ── Source badge colours ─────────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  ZNBC:          'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  Diggers:       'bg-rose-100  text-rose-700  dark:bg-rose-900/30  dark:text-rose-400',
  TechTrends:    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Africa Report':'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// ── BusinessWidget ───────────────────────────────────────────────
function BusinessWidget() {
  const [data, setData]       = React.useState<MarketData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError]     = React.useState(false);
  const [newsTab, setNewsTab] = React.useState(false); // false=rates, true=news

  const load = React.useCallback(() => {
    setLoading(true); setError(false);
    fetch('/api/market-data')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: MarketData) => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const fetchedLabel = React.useMemo(() => {
    if (!data?.fetchedAt) return '';
    try { return new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  }, [data?.fetchedAt]);

  return (
    <div className="bg-dark-800 rounded-2xl overflow-hidden">
      <div className="flex flex-col lg:flex-row">

        {/* ── Left: Exchange Rates panel ──────────────────── */}
        <div className="lg:w-96 flex-shrink-0 p-6 relative overflow-hidden">
          {/* Background orbs */}
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-primary-600/15 rounded-full pointer-events-none" />
          <div className="absolute -bottom-6 right-10 w-18 h-18 bg-primary-500/10 rounded-full pointer-events-none" />

          <div className="relative z-10">
            {/* Icon + title */}
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 bg-primary-600/20 border border-primary-500/30 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div className="flex items-center gap-1.5">
                {fetchedLabel && <span className="text-[10px] text-gray-500">{fetchedLabel}</span>}
                <button onClick={load} title="Refresh"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-primary-400 transition-colors">
                  <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
            <h3 className="font-bold text-white text-base mt-3 mb-0.5">ZMW Exchange Rates</h3>
            <p className="text-xs text-gray-400 mb-5">Zambian Kwacha vs major currencies</p>

            {/* Rate rows */}
            {loading && (
              <div className="space-y-3">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-7 h-5 rounded" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}
            {!loading && error && (
              <div className="py-4">
                <p className="text-xs text-gray-500">Rates unavailable.</p>
                <button onClick={load} className="text-xs text-primary-400 hover:underline mt-1">Retry</button>
              </div>
            )}
            {!loading && !error && data && (
              <div className="space-y-3">
                {data.rates.length === 0 && <p className="text-xs text-gray-500">No rate data</p>}
                {data.rates.map(r => (
                  <div key={r.currency} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{r.flag}</span>
                      <div>
                        <p className="text-xs font-semibold text-gray-200">{r.currency}</p>
                        <p className="text-[10px] text-gray-500">{r.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">K {r.zmwRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      <p className="text-[10px] text-gray-500">per 1 {r.symbol}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-gray-600 mt-5">Source: Frankfurter / BOZ · Indicative only</p>
          </div>
        </div>

        {/* Divider */}
        <div className="lg:w-px lg:h-auto h-px w-full bg-white/5" />

        {/* ── Right: Business News panel ──────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* News header + source tabs */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Business News</h3>
              <p className="text-xs text-gray-400">Latest from Zambia &amp; Africa</p>
            </div>
            <div className="flex gap-1">
              {(['rates', 'news'] as const).map((t, idx) => {
                const active = idx === 1 ? newsTab : !newsTab;
                return (
                  <button key={t} onClick={() => setNewsTab(idx === 1)}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                      active ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}>
                    {idx === 0 ? 'All' : 'Zambia'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* News list */}
          <div className="flex-1 overflow-y-auto max-h-72 px-4 pb-5 space-y-1">
            {loading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
            {!loading && error && (
              <div className="py-8 text-center">
                <p className="text-xs text-gray-500">News unavailable</p>
                <button onClick={load} className="text-xs text-primary-400 hover:underline mt-1">Retry</button>
              </div>
            )}
            {!loading && !error && data && data.news.length === 0 && (
              <p className="text-xs text-gray-500 py-8 text-center">No news right now</p>
            )}
            {!loading && !error && data && data.news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium leading-snug group-hover:text-primary-400 transition-colors line-clamp-2">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      SOURCE_COLORS[item.source] || 'bg-white/10 text-gray-400'
                    }`}>{item.source}</span>
                    {item.relTime && <span className="text-[10px] text-gray-500">{item.relTime}</span>}
                  </div>
                </div>
                <ArrowRightIcon className="w-3.5 h-3.5 text-gray-600 group-hover:text-primary-500 flex-shrink-0 mt-0.5 transition-colors" />
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Trend Badge ─────────────────────────────────────────────────
function Trend({ value, isPositive }: { value: number; isPositive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive
        ? <ArrowTrendingUpIcon className="w-3 h-3" />
        : <ArrowTrendingDownIcon className="w-3 h-3" />}
      {isPositive ? '+' : ''}{value}% from last month
    </span>
  );
}

// ── Stat Card ───────────────────────────────────────────────────
function StatCard({ title, value, trend, href }: { title: string; value: string; trend?: { value: number; isPositive: boolean }; href: string }) {
  return (
    <Link href={href}>
      <div className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-700 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
          <EllipsisHorizontalIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2 truncate">{value}</p>
        {trend && <Trend value={trend.value} isPositive={trend.isPositive} />}
      </div>
    </Link>
  );
}

// ── Quick Action ────────────────────────────────────────────────
function QuickAction({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 dark:bg-dark-700 dark:hover:bg-primary-900/20 transition-all duration-200 cursor-pointer group border border-transparent hover:border-primary-100 dark:hover:border-primary-900">
        <div className="p-2 rounded-lg bg-white dark:bg-dark-600 shadow-sm group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors flex-shrink-0">
          {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 text-primary-600' })}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{label}</p>
          <p className="text-xs text-gray-400 truncate">{description}</p>
        </div>
        <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:rotate-90 transition-all flex-shrink-0" />
      </div>
    </Link>
  );
}

// ── Dashboard Page ──────────────────────────────────────────────
export default function DashboardPage() {
  useAIContext('Dashboard');
  const { documents, isLoading: docsLoading } = useDocumentsStore();
  const { clients, isLoading: clientsLoading } = useClientsStore();
  const { company } = useCompanyStore();
  const { toggleSidebar } = useUIStore();
  const { theme, toggleTheme } = useThemeStore();
  const isLoading = docsLoading || clientsLoading;

  const quotations  = documents.filter(d => d.type === 'quotation');
  const invoices    = documents.filter(d => d.type === 'invoice') as Invoice[];
  const pos         = documents.filter(d => d.type === 'purchase_order');
  const dns         = documents.filter(d => d.type === 'delivery_note');

  const totalInvoiced = invoices.reduce((s, i) => s + i.grandTotal, 0);
  const totalPaid     = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
  const pendingAmount = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);
  const overdueCount  = invoices.filter(i => i.status !== 'paid' && new Date(i.dueDate) < new Date()).length;

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 7);

  const getClient = (id: string) => clients.find(c => c.id === id);

  const docTotal = documents.length;
  const donutSegments: DonutSegment[] = [
    { value: quotations.length, color: '#0ea5e9', label: 'Quotations' },
    { value: invoices.length,   color: '#10b981', label: 'Invoices' },
    { value: pos.length,        color: '#8b5cf6', label: 'Purchase Orders' },
    { value: dns.length,        color: '#f59e0b', label: 'Delivery Notes' },
  ];

  const iconMap = {
    quotation:      { Icon: DocumentTextIcon,   color: 'text-primary-600',  bg: 'bg-primary-100 dark:bg-primary-900/30' },
    invoice:        { Icon: ReceiptPercentIcon,  color: 'text-emerald-600',  bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    purchase_order: { Icon: ShoppingCartIcon,    color: 'text-purple-600',   bg: 'bg-purple-100 dark:bg-purple-900/30' },
    delivery_note:  { Icon: TruckIcon,           color: 'text-amber-600',    bg: 'bg-amber-100 dark:bg-amber-900/30' },
  };

  const featuredDoc = recentDocs[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-950">

      {/* Top Header */}
      <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-800 border-b border-gray-100 dark:border-dark-700 px-4 lg:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500" onClick={toggleSidebar}>
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
              {company?.name ? `${company.name} ↓` : 'Imara Suite'}
            </h1>
            <p className="text-[11px] text-gray-400 hidden sm:block">Welcome back! Here’s your business overview.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-dark-700 rounded-xl px-3 py-2 w-52">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input type="text" placeholder="Search documents..." readOnly
              className="bg-transparent text-xs text-gray-600 dark:text-gray-300 outline-none w-full placeholder-gray-400" />
          </div>
          <button className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
            <BellIcon className="w-5 h-5" />
            {overdueCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />}
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 transition-colors">
            {theme === 'dark'
              ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
              : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
            }
          </button>
          <Link href="/invoices/new">
            <button className="hidden sm:flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm">
              <PlusIcon className="w-4 h-4" />New Invoice
            </button>
          </Link>
        </div>
      </header>

      {/* Page Body */}
      <div>

        {/* Setup Alert */}
        {!company && (
          <div className="mx-4 mt-4 lg:mx-6 lg:mt-6 bg-primary-600 rounded-2xl p-4 sm:p-5 text-white flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="p-2.5 bg-white/20 rounded-xl flex-shrink-0"><ExclamationCircleIcon className="w-6 h-6" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Complete Your Setup</p>
              <p className="text-primary-100 text-xs mt-0.5">Set up your company profile to start creating professional documents.</p>
            </div>
            <Link href="/company" className="flex-shrink-0">
              <button className="bg-white text-primary-600 text-xs font-semibold px-3 sm:px-4 py-2 rounded-xl hover:bg-primary-50 transition-colors whitespace-nowrap">Setup Now</button>
            </Link>
          </div>
        )}

        <div className="flex gap-5 p-4 lg:p-6">

          {/* ── Main Content ── */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Title row */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">An easy way to manage your business with care and precision.</p>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-2 text-sm text-gray-600 dark:text-gray-300 flex-shrink-0">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium hidden sm:inline">
                  {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Top 3 stat cards */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[0,1,2].map(i => (
                  <div key={i} className="bg-white dark:bg-dark-800 rounded-2xl p-5 border border-gray-100 dark:border-dark-700">
                    <Skeleton className="h-4 w-24 mb-3" /><Skeleton className="h-7 w-32 mb-2" /><Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Dark featured card */}
                <div className="bg-dark-800 text-white rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-primary-600/15 -mr-8 -mt-8" />
                  <div className="absolute bottom-0 right-8 w-12 h-12 rounded-full bg-white/5" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Update</span>
                    </div>
                    {featuredDoc ? (
                      <>
                        <p className="text-xs text-gray-500 mb-1">{formatDate(featuredDoc.dateIssued)}</p>
                        <p className="font-bold text-sm leading-snug mb-3">
                          {documents.length} document{documents.length !== 1 ? 's' : ''} — latest:{' '}
                          <span className="text-primary-400">{featuredDoc.documentNumber}</span>
                        </p>
                      </>
                    ) : (
                      <p className="font-bold text-sm leading-snug mb-3 text-gray-300">Create your first document to get started</p>
                    )}
                    <Link href="/quotations">
                      <span className="text-xs text-primary-400 hover:text-primary-300 font-medium flex items-center gap-1 transition-colors">
                        See Statistics <ArrowRightIcon className="w-3 h-3" />
                      </span>
                    </Link>
                  </div>
                </div>

                <StatCard title="Total Invoiced"    value={formatCurrency(totalInvoiced)} trend={{ value: 35, isPositive: true }}                href="/invoices" />
                <StatCard title="Amount Collected"  value={formatCurrency(totalPaid)}     trend={{ value: 24, isPositive: totalPaid > 0 }}       href="/invoices" />
              </div>
            )}

            {/* Bottom two columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Recent Documents (Transaction style) */}
              <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Recent Documents</h3>
                  <Link href="/quotations">
                    <button className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
                      View all <ArrowRightIcon className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
                {isLoading ? (
                  <div className="divide-y divide-gray-50 dark:divide-dark-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3">
                        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div>
                        <div className="space-y-1.5 text-right"><Skeleton className="h-3 w-16" /><Skeleton className="h-4 w-14 rounded-full" /></div>
                      </div>
                    ))}
                  </div>
                ) : recentDocs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <DocumentTextIcon className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No documents yet</p>
                    <Link href="/quotations/new">
                      <button className="mt-3 text-xs text-primary-600 font-medium hover:underline">Create your first document</button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-dark-700">
                    {recentDocs.map((doc, i) => {
                      const client = getClient(doc.clientId);
                      const { Icon, color, bg } = iconMap[doc.type];
                      return (
                        <div key={doc.id}
                          className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-dark-750 transition-colors cursor-pointer animate-slide-up-fade"
                          style={{ animationDelay: `${i * 40}ms` }}>
                          <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{client?.name || 'Unknown Client'}</p>
                            <p className="text-xs text-gray-400 truncate">{formatDate(doc.createdAt)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <StatusBadge status={doc.status} size="sm" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-0.5">{doc.documentNumber}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="space-y-5">

                {/* Document Summary bars */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Document Summary</h3>
                    <EllipsisHorizontalIcon className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  </div>
                  {[
                    { label: 'Quotations',      count: quotations.length, color: 'bg-primary-500' },
                    { label: 'Invoices',         count: invoices.length,   color: 'bg-emerald-500' },
                    { label: 'Purchase Orders',  count: pos.length,        color: 'bg-purple-500'  },
                    { label: 'Delivery Notes',   count: dns.length,        color: 'bg-amber-500'   },
                  ].map(({ label, count, color }) => {
                    const max = Math.max(docTotal, 1);
                    return (
                      <div key={label} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
                          <span className="text-xs font-bold text-gray-800 dark:text-white">({count})</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-dark-600 rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-700`}
                            style={{ width: `${count > 0 ? Math.max(count / max * 100, 5) : 0}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-100 dark:border-dark-700 text-center">
                    <div><p className="text-lg font-bold text-gray-900 dark:text-white">{clients.length}</p><p className="text-[11px] text-gray-400">Clients</p></div>
                    <div><p className="text-lg font-bold text-emerald-600">{invoices.filter(i => i.status === 'paid').length}</p><p className="text-[11px] text-gray-400">Paid</p></div>
                    <div><p className="text-lg font-bold text-red-500">{overdueCount}</p><p className="text-[11px] text-gray-400">Overdue</p></div>
                  </div>
                </div>

                {/* Quick Create */}
                <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Quick Create</h3>
                  <div className="space-y-2">
                    <QuickAction href="/quotations/new"      icon={<DocumentTextIcon />}   label="New Quotation"     description="Send a price quote to a client" />
                    <QuickAction href="/invoices/new"        icon={<ReceiptPercentIcon />}  label="New Invoice"       description="Bill a client for products or services" />
                    <QuickAction href="/delivery-notes/new"  icon={<TruckIcon />}           label="New Delivery Note" description="Document a product delivery" />
                  </div>
                </div>

              </div>

            </div>{/* end bottom lg:grid-cols-2 */}

            {/* Business Market & News */}
            <BusinessWidget />

          </div>{/* end flex-1 main column */}

          {/* ── Right Panel ── */}
          <div className="hidden xl:flex flex-col gap-4 w-64 flex-shrink-0">

            {/* Donut Chart */}
            <div className="bg-white dark:bg-dark-800 rounded-2xl border border-gray-100 dark:border-dark-700 p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">Document Overview</h3>
              <p className="text-xs text-gray-400 mb-4">Breakdown by type</p>
              <div className="flex justify-center mb-4">
                <DonutChart segments={donutSegments} total={docTotal} />
              </div>
              <div className="space-y-2.5">
                {donutSegments.map(seg => (
                  <div key={seg.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{seg.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-gray-800 dark:text-white">{seg.value}</span>
                      <span className="text-[10px] text-gray-400">{docTotal > 0 ? `${Math.round(seg.value / docTotal * 100)}%` : '0%'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                <p className="text-[10px] text-gray-400 text-center mb-2">Financial summary</p>
                <div className="flex items-center justify-between bg-gray-50 dark:bg-dark-700 rounded-xl px-3 py-2.5">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(pendingAmount)}</p>
                    <p className="text-[10px] text-gray-400">Pending</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200 dark:bg-dark-600" />
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
                    <p className="text-[10px] text-gray-400">Collected</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-dark-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -top-6 -right-6 w-28 h-28 bg-primary-600/20 rounded-full" />
              <div className="absolute -bottom-4 right-4 w-14 h-14 bg-primary-500/10 rounded-full" />
              <div className="relative z-10">
                <div className="w-9 h-9 bg-primary-600/20 rounded-xl flex items-center justify-center mb-3 border border-primary-500/20">
                  <CurrencyDollarIcon className="w-5 h-5 text-primary-400" />
                </div>
                <p className="font-bold text-white text-sm leading-snug mb-1">Level up your business management</p>
                <p className="text-xs text-gray-400 mb-4">An easy way to manage all your documents with care and precision.</p>
                <Link href="/invoices/new">
                  <button className="w-full bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                    Create Invoice +
                  </button>
                </Link>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
