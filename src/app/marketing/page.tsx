'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  EyeIcon,
  HeartIcon,
  ShareIcon,
  UsersIcon,
  PlusIcon,
  ArrowRightIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useMarketingSettingsStore } from '@/modules/marketing/store';
import { usePostsStore } from '@/modules/marketing/store';

const statCards = [
  { key: 'totalReach', label: 'Total Reach', icon: EyeIcon, color: 'bg-blue-500' },
  { key: 'engagement', label: 'Engagement', icon: HeartIcon, color: 'bg-pink-500' },
  { key: 'published', label: 'Published Posts', icon: ShareIcon, color: 'bg-purple-500' },
  { key: 'accounts', label: 'Connected Accounts', icon: UsersIcon, color: 'bg-green-500' },
];

const quickActions = [
  { label: 'Create Post', href: '/marketing/composer', icon: PencilSquareIcon, color: 'text-blue-500' },
  { label: 'New Campaign', href: '/marketing/campaigns?new=1', icon: RocketLaunchIcon, color: 'text-purple-500' },
  { label: 'View Schedule', href: '/marketing/schedule', icon: CalendarDaysIcon, color: 'text-orange-500' },
  { label: 'Settings', href: '/marketing/settings', icon: Cog6ToothIcon, color: 'text-gray-500' },
];

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  facebook: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function MarketingDashboardPage() {
  const { stats, fetchStats } = useMarketingSettingsStore();
  const { posts, fetchPosts } = usePostsStore();

  useEffect(() => {
    fetchStats();
    fetchPosts({ limit: 5 });
  }, [fetchStats, fetchPosts]);

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header
          title="Marketing"
          subtitle="Social media management & analytics"
          actions={
            <Link href="/marketing/composer">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                <PlusIcon className="w-4 h-4" /> New Post
              </button>
            </Link>
          }
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              let value = 0;
              if (stats) {
                if (card.key === 'totalReach') value = stats.totalReach;
                else if (card.key === 'engagement') value = stats.totalEngagement;
                else if (card.key === 'published') value = stats.posts.published;
                else if (card.key === 'accounts') value = (stats as any).connectedAccounts || 0;
              }
              return (
                <div key={card.key} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatNumber(value)}</p>
                    </div>
                    <div className={`${card.color} rounded-lg p-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Posts */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Posts</h3>
                <Link href="/marketing/schedule" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
                  View All →
                </Link>
              </div>

              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <PencilSquareIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm">No posts yet. Create your first post!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.slice(0, 5).map((post) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {(post.platforms ?? []).map((p) => (
                            <span key={p} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${PLATFORM_COLORS[p] || 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>
                              {p}
                            </span>
                          ))}
                          <span className="text-[10px] text-gray-400 ml-auto">
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : post.scheduledAt ? 'Scheduled' : 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${action.color}`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{action.label}</span>
                      </div>
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
