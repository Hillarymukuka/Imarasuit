'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LinkIcon,
  BellIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useMarketingSettingsStore } from '@/modules/marketing/store';
import type { NotificationPreferences } from '@/modules/marketing/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';
const getAuthToken = () => (typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null);

// Platform definitions with inline SVG logos
const PLATFORMS = [
  {
    key: 'twitter' as const,
    label: 'Twitter / X',
    desc: 'Share posts and updates with your followers',
    bg: 'bg-black',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.629zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    key: 'linkedin' as const,
    label: 'LinkedIn',
    desc: 'Post professional content and articles',
    bg: 'bg-[#0A66C2]',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    key: 'facebook' as const,
    label: 'Facebook',
    desc: 'Manage your Facebook Page and reach your audience',
    bg: 'bg-[#1877F2]',
    hint: "You'll be able to choose which Page to manage after connecting.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'instagram' as const,
    label: 'Instagram',
    desc: 'Publish photos and reels to your Business account',
    bg: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
    hint: 'Requires a Business or Creator Instagram account linked to a Facebook Page.',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
] as const;

type PlatformKey = typeof PLATFORMS[number]['key'];

interface PendingPage {
  id: string;
  name: string;
  category?: string;
  picture?: string;
  igId?: string;
  igUsername?: string;
  igName?: string;
  // LinkedIn
  type?: 'profile' | 'page';
  handle?: string;
  logoUrl?: string;
}

interface PageSelectorState {
  platform: 'facebook' | 'instagram' | 'linkedin';
  sessionId: string;
  pages: PendingPage[];
  loading: boolean;
}

export default function MarketingSettingsPage() {
  const { accounts, notifications, fetchAccounts, disconnectAccount, fetchNotifications, updateNotifications } =
    useMarketingSettingsStore();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab]           = useState<'accounts' | 'notifications' | 'profile'>('accounts');
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [initiating, setInitiating]         = useState<string | null>(null);
  const [disconnecting, setDisconnecting]   = useState<string | null>(null);
  const [pageSelector, setPageSelector]     = useState<PageSelectorState | null>(null);
  const [confirmingPage, setConfirmingPage] = useState(false);
  const [configuredPlatforms, setConfiguredPlatforms] = useState<Record<string, boolean> | null>(null);
  const [notifState, setNotifState] = useState<NotificationPreferences>({
    postPublishedAlerts: true,
    engagementMilestones: true,
    scheduledPostReminders: false,
  });

  useEffect(() => { fetchAccounts(); fetchNotifications(); }, [fetchAccounts, fetchNotifications]);
  useEffect(() => { if (notifications) setNotifState(notifications); }, [notifications]);

  // Load which platforms have OAuth credentials configured
  useEffect(() => {
    fetch(`${API_BASE}/marketing/oauth/configured`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setConfiguredPlatforms(d as Record<string, boolean>))
      .catch(() => setConfiguredPlatforms({}));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 6000);
  }, []);

  // Handle OAuth redirect back from social platform
  useEffect(() => {
    const success   = searchParams.get('oauth_success');
    const errorMsg  = searchParams.get('oauth_error');
    const platform  = searchParams.get('platform');
    const fbSession = searchParams.get('facebook_pages_session');
    const igSession = searchParams.get('instagram_pages_session');
    const liSession = searchParams.get('linkedin_pages_session');

    if (fbSession) {
      window.history.replaceState({}, '', '/marketing/settings');
      fetchPendingPages('facebook', fbSession);
    } else if (igSession) {
      window.history.replaceState({}, '', '/marketing/settings');
      fetchPendingPages('instagram', igSession);
    } else if (liSession) {
      window.history.replaceState({}, '', '/marketing/settings');
      fetchPendingPages('linkedin', liSession);
    } else if (success) {
      const p = PLATFORMS.find((pl) => pl.key === success);
      showToast('success', `${p?.label || success} connected successfully!`);
      fetchAccounts();
      window.history.replaceState({}, '', '/marketing/settings');
    } else if (errorMsg) {
      showToast('error', `${platform ? `Could not connect ${platform}: ` : ''}${decodeURIComponent(errorMsg)}`);
      window.history.replaceState({}, '', '/marketing/settings');
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPendingPages = async (plat: 'facebook' | 'instagram' | 'linkedin', sessionId: string) => {
    setPageSelector({ platform: plat, sessionId, pages: [], loading: true });
    try {
      const res  = await fetch(`${API_BASE}/marketing/oauth/${plat}/pending-pages?session=${sessionId}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await res.json() as any;
      if (!res.ok) { showToast('error', data.error || 'Could not load pages.'); setPageSelector(null); return; }
      setPageSelector({ platform: plat, sessionId, pages: data.pages || [], loading: false });
    } catch {
      showToast('error', 'Failed to load pages.'); setPageSelector(null);
    }
  };

  const confirmPage = async (pageId: string) => {
    if (!pageSelector) return;
    setConfirmingPage(true);
    try {
      const res  = await fetch(`${API_BASE}/marketing/oauth/${pageSelector.platform}/confirm-page`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: pageSelector.sessionId, pageId }),
      });
      const data = await res.json() as any;
      if (!res.ok) { showToast('error', data.error || 'Failed to connect.'); return; }
      const platformLabel = pageSelector.platform === 'facebook' ? 'Facebook Page'
        : pageSelector.platform === 'instagram' ? 'Instagram account'
        : 'LinkedIn account';
      showToast('success', `${platformLabel} connected!`);
      await fetchAccounts();
      setPageSelector(null);
    } finally {
      setConfirmingPage(false);
    }
  };

  const initiateOAuth = async (platform: PlatformKey) => {
    setInitiating(platform);
    try {
      if (!getAuthToken()) { showToast('error', 'Please log in first.'); return; }
      const res  = await fetch(`${API_BASE}/marketing/oauth/${platform}/initiate`, {
        method: 'POST', headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json() as any;
      if (!res.ok || !data.url) {
        showToast('error', data.error || `Could not connect ${platform}. OAuth credentials may not be set up yet.`);
        return;
      }
      window.location.href = data.url;
    } catch (err: any) {
      showToast('error', err.message || 'Failed to start connection.');
    } finally {
      setInitiating(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    setDisconnecting(platform);
    try { await disconnectAccount(platform); showToast('success', 'Account removed.'); }
    catch { showToast('error', 'Failed to remove account.'); }
    finally { setDisconnecting(null); }
  };

  const connectedMap  = new Map(accounts.map((a) => [a.platform, a]));
  const isPlatformReady = (key: string) => configuredPlatforms === null || configuredPlatforms[key] === true;
  const tabs = [
    { key: 'accounts'      as const, label: 'Social Accounts', icon: LinkIcon },
    { key: 'notifications' as const, label: 'Notifications',   icon: BellIcon },
    { key: 'profile'       as const, label: 'Profile',         icon: UserCircleIcon },
  ];

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header title="Marketing Settings" subtitle="Connect your social media accounts to start publishing" />

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium text-white ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? <CheckCircleIcon className="w-5 h-5 flex-shrink-0" /> : <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />}
            <span className="max-w-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100"><XMarkIcon className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Sidebar */}
            <div className="lg:w-52 flex-shrink-0">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                        activeTab === tab.key
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                      <Icon className="w-4 h-4" />{tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-xl">

              {/* â”€â”€ Social Accounts â”€â”€ */}
              {activeTab === 'accounts' && (
                <div>
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connect Social Accounts</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      Click <strong>Connect</strong> next to any platform â€” you'll be taken to sign in with that platform and authorise access. No technical setup needed.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {PLATFORMS.map((p) => {
                      const account   = connectedMap.get(p.key);
                      const connected = !!account?.isConnected;
                      const isLoading = initiating === p.key;
                      const isReady   = isPlatformReady(p.key);

                      return (
                        <div key={p.key} className={`rounded-2xl border transition-all ${
                          !isReady
                            ? 'border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                            : connected
                              ? 'border-green-200 dark:border-green-800/40 bg-white dark:bg-gray-800'
                              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>

                          <div className="flex items-center gap-4 p-4">
                            {/* Logo */}
                            <div className={`w-12 h-12 rounded-2xl ${p.bg} flex items-center justify-center flex-shrink-0 shadow${!isReady ? ' grayscale' : ''}`}>
                              {p.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">{p.label}</span>
                                {connected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Connected
                                  </span>
                                )}
                                {!isReady && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                    Coming soon
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                {connected
                                  ? `${account!.accountName}${account!.accountHandle ? ` · @${account!.accountHandle}` : ''}`
                                  : p.desc}
                              </p>
                            </div>

                            {/* Action */}
                            {!isReady ? (
                              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 pr-1">Not available yet</span>
                            ) : connected ? (
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button onClick={() => initiateOAuth(p.key)} disabled={isLoading}
                                  title="Reconnect account"
                                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition disabled:opacity-40">
                                  <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                                <button onClick={() => handleDisconnect(p.key)} disabled={disconnecting === p.key}
                                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition disabled:opacity-50">
                                  {disconnecting === p.key ? 'Removing...' : 'Remove'}
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => initiateOAuth(p.key)} disabled={isLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition shadow-sm flex-shrink-0">
                                {isLoading
                                  ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Connecting...</>
                                  : 'Connect'}
                              </button>
                            )}
                          </div>

                          {/* Hint when not connected */}
                          {'hint' in p && !connected && isReady && (
                            <div className="px-4 pb-3 -mt-1">
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">{p.hint}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-5 text-xs text-center text-gray-400 dark:text-gray-500">
                    Connecting takes about 30 seconds. You'll be redirected to the platform to sign in and approve access, then brought back here automatically.
                  </p>
                </div>
              )}

              {/* â”€â”€ Notifications â”€â”€ */}
              {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Choose what notifications you want to receive.</p>
                  <div className="space-y-4">
                    {([
                      { key: 'postPublishedAlerts'    as const, label: 'Post Published',       desc: 'Get notified when a post is successfully published' },
                      { key: 'engagementMilestones'   as const, label: 'Engagement Milestones', desc: 'Get notified when posts hit engagement milestones'   },
                      { key: 'scheduledPostReminders' as const, label: 'Schedule Reminders',    desc: 'Receive reminders before scheduled posts go live'    },
                    ]).map((n) => (
                      <label key={n.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition cursor-pointer">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{n.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{n.desc}</p>
                        </div>
                        <div className="relative flex-shrink-0">
                          <input type="checkbox" checked={notifState[n.key]}
                            onChange={(e) => setNotifState({ ...notifState, [n.key]: e.target.checked })}
                            className="sr-only peer" />
                          <div className="w-10 h-5 bg-gray-300 dark:bg-gray-600 peer-checked:bg-blue-600 rounded-full transition" />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform shadow-sm" />
                        </div>
                      </label>
                    ))}
                  </div>
                  <button onClick={() => updateNotifications(notifState)}
                    className="mt-5 px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition">
                    Save Preferences
                  </button>
                </div>
              )}

              {/* â”€â”€ Profile â”€â”€ */}
              {activeTab === 'profile' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Marketing Profile</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Configure your default marketing identity.</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Brand Name</label>
                      <input type="text" placeholder="Your brand name" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Default Hashtags</label>
                      <input type="text" placeholder="#mybrand #marketing" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Bio / Description</label>
                      <textarea rows={3} placeholder="A short description for your brand" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <button className="px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition">Save Profile</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* â”€â”€ Page / Account Selector Modal â”€â”€ */}
      {pageSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  {pageSelector.platform === 'facebook' ? 'Choose a Facebook Page'
                    : pageSelector.platform === 'instagram' ? 'Choose an Instagram Account'
                    : 'Choose a LinkedIn Profile or Page'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select the {pageSelector.platform === 'facebook' ? 'page' : pageSelector.platform === 'instagram' ? 'account' : 'profile or page'} you want to post to.
                </p>
              </div>
              <button onClick={() => setPageSelector(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 max-h-[28rem] overflow-y-auto">
              {pageSelector.loading ? (
                <div className="flex items-center justify-center py-14">
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading your pagesâ€¦</span>
                </div>
              ) : pageSelector.pages.length === 0 ? (
                <div className="text-center py-12">
                  <ExclamationTriangleIcon className="w-9 h-9 text-yellow-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pageSelector.platform === 'facebook' ? 'No Facebook Pages found'
                      : pageSelector.platform === 'instagram' ? 'No Instagram Business accounts found'
                      : 'No LinkedIn accounts found'}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs mx-auto">
                    {pageSelector.platform === 'facebook'
                      ? 'You need to be an admin of a Facebook Page. Create one at facebook.com/pages/create.'
                      : pageSelector.platform === 'instagram'
                        ? 'Your Instagram must be set to Business or Creator and linked to a Facebook Page in Meta Business Settings.'
                        : 'Make sure you approved access when connecting. Try disconnecting and reconnecting.'}
                  </p>
                  <button onClick={() => setPageSelector(null)}
                    className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 transition">
                    OK, Got It
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {pageSelector.pages.map((page) => {
                    const isInstagram    = pageSelector.platform === 'instagram';
                    const isLinkedIn     = pageSelector.platform === 'linkedin';
                    const displayName    = isInstagram ? (page.igName || page.name) : page.name;
                    const displayHandle  = isInstagram ? page.igUsername : isLinkedIn ? page.handle : undefined;
                    const idToConfirm    = isInstagram ? (page.igId || page.id) : page.id;
                    const typeBadge      = isLinkedIn
                      ? (page.type === 'profile' ? 'Personal Profile' : 'Company Page')
                      : undefined;
                    const avatarSrc      = isLinkedIn ? page.logoUrl : page.picture;

                    return (
                      <button key={page.id} onClick={() => confirmPage(idToConfirm)} disabled={confirmingPage}
                        className="w-full flex items-center gap-3 p-4 rounded-xl text-left border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition disabled:opacity-60 group">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={displayName} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-base ${
                            isInstagram ? 'bg-gradient-to-br from-[#833AB4] to-[#F77737]'
                            : isLinkedIn ? 'bg-[#0A66C2]'
                            : 'bg-[#1877F2]'}`}>
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{displayName}</p>
                            {typeBadge && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                page.type === 'profile'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              }`}>{typeBadge}</span>
                            )}
                          </div>
                          {displayHandle && <p className="text-xs text-gray-400">@{displayHandle}</p>}
                          {page.category && <p className="text-xs text-gray-400">{page.category}</p>}
                        </div>
                        <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0 pr-1">
                          {confirmingPage ? 'Connecting...' : 'Select ->'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer cancel */}
            {!pageSelector.loading && pageSelector.pages.length > 0 && (
              <div className="px-4 pb-4">
                <button onClick={() => setPageSelector(null)}
                  className="w-full py-2.5 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </ModuleGuard>
  );
}
