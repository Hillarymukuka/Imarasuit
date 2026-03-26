'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDaysIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  TrashIcon,
  PencilIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { usePostsStore } from '@/modules/marketing/store';
import type { Post } from '@/modules/marketing/types';

const PLATFORM_COLORS: Record<string, string> = {
  twitter: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  linkedin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  facebook: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  scheduled: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function groupByDay(posts: Post[]): { label: string; date: string; posts: Post[] }[] {
  const groups: Record<string, Post[]> = {};

  for (const post of posts) {
    const dateStr = post.scheduledAt || post.publishedAt || post.createdAt;
    if (!dateStr) continue;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(post);
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, posts]) => ({
      label: date === today ? 'TODAY' : date === tomorrow ? 'TOMORROW' : new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(),
      date,
      posts: posts.sort((a, b) => {
        const at = a.scheduledAt || a.createdAt;
        const bt = b.scheduledAt || b.createdAt;
        return at.localeCompare(bt);
      }),
    }));
}

export default function SchedulePage() {
  const { posts, loading, fetchPosts, deletePost, publishPost } = usePostsStore();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');

  useEffect(() => {
    fetchPosts(statusFilter ? { status: statusFilter } : undefined);
  }, [fetchPosts, statusFilter]);

  const filtered = platformFilter
    ? posts.filter(p => p.platforms.includes(platformFilter as any))
    : posts;

  const groups = groupByDay(filtered);

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header
          title="Schedule"
          subtitle="View and manage your content calendar"
          actions={
            <Link href="/marketing/composer">
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                <PlusIcon className="w-4 h-4" /> New Post
              </button>
            </Link>
          }
        />

        <div className="p-4 lg:p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
            >
              <option value="">All Statuses</option>
              <option value="draft">Drafts</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
            >
              <option value="">All Platforms</option>
              <option value="twitter">Twitter</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No posts yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first post to see it here</p>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.date}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest">{group.label}</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Posts for this day */}
                  <div className="space-y-2">
                    {group.posts.map((post) => {
                      const time = new Date(post.scheduledAt || post.publishedAt || post.createdAt);
                      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition">
                          <div className="flex items-start gap-4">
                            {/* Time column */}
                            <div className="flex-shrink-0 w-16 text-center">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{timeStr}</p>
                            </div>

                            {/* Divider */}
                            <div className="flex-shrink-0 w-px h-12 bg-gray-200 dark:bg-gray-700 self-center" />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{post.content}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {post.platforms.map((p) => (
                                  <span key={p} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${PLATFORM_COLORS[p] || 'bg-gray-100 text-gray-600'}`}>
                                    {p}
                                  </span>
                                ))}
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ml-auto ${STATUS_BADGE[post.status] || ''}`}>
                                  {post.status}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="relative flex-shrink-0">
                              <button onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                <EllipsisHorizontalIcon className="w-4 h-4 text-gray-400" />
                              </button>
                              {menuOpen === post.id && (
                                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                                  {post.status !== 'published' && (
                                    <button
                                      onClick={() => { setMenuOpen(null); publishPost(post.id); }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10"
                                    >
                                      <PaperAirplaneIcon className="w-3.5 h-3.5" /> Publish Now
                                    </button>
                                  )}
                                  <Link href={`/marketing/composer?edit=${post.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <PencilIcon className="w-3.5 h-3.5" /> Edit
                                  </Link>
                                  <button
                                    onClick={() => { setMenuOpen(null); if (confirm('Delete this post?')) deletePost(post.id); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleGuard>
  );
}
