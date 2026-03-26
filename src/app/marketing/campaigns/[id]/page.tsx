'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  EyeIcon,
  HeartIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCampaignsStore, usePostsStore } from '@/modules/marketing/store';
import type { CampaignDetail, CampaignStatus } from '@/modules/marketing/types';

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const POST_STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-orange-100 text-orange-700',
  published: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
};

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { getCampaign, updateCampaign, deleteCampaign } = useCampaignsStore();
  const { publishPost, deletePost } = usePostsStore();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const detail = await getCampaign(id);
      setCampaign(detail);
    } catch {
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (status: CampaignStatus) => {
    await updateCampaign(id, { status });
    load();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this campaign and all associated data?')) return;
    await deleteCampaign(id);
    router.push('/marketing/campaigns');
  };

  if (loading) {
    return (
      <ModuleGuard moduleId="marketing">
        <div className="min-h-screen">
          <Header title="Campaign" subtitle="Loading..." />
          <div className="p-6 text-center text-gray-500">Loading campaign...</div>
        </div>
      </ModuleGuard>
    );
  }

  if (!campaign) {
    return (
      <ModuleGuard moduleId="marketing">
        <div className="min-h-screen">
          <Header title="Campaign Not Found" subtitle="" />
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">This campaign does not exist.</p>
            <Link href="/marketing/campaigns" className="text-blue-600 hover:underline">← Back to Campaigns</Link>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header
          title={campaign.name}
          subtitle={campaign.description || 'Campaign details'}
          actions={
            <div className="flex items-center gap-2">
              <Link href="/marketing/campaigns">
                <button className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
              </Link>
              <Link href={`/marketing/composer?campaign=${id}`}>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                  <PlusIcon className="w-4 h-4" /> New Post
                </button>
              </Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Status + Actions Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[campaign.status]}`}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </span>

              {campaign.startDate && (
                <span className="text-sm text-gray-500">
                  {new Date(campaign.startDate).toLocaleDateString()}{campaign.endDate ? ` – ${new Date(campaign.endDate).toLocaleDateString()}` : ''}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {campaign.status === 'draft' && (
                  <button onClick={() => handleStatusChange('active')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition">
                    <PlayIcon className="w-3.5 h-3.5" /> Activate
                  </button>
                )}
                {campaign.status === 'active' && (
                  <>
                    <button onClick={() => handleStatusChange('paused')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600 transition">
                      <PauseIcon className="w-3.5 h-3.5" /> Pause
                    </button>
                    <button onClick={() => handleStatusChange('completed')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition">
                      <CheckCircleIcon className="w-3.5 h-3.5" /> Complete
                    </button>
                  </>
                )}
                {campaign.status === 'paused' && (
                  <button onClick={() => handleStatusChange('active')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition">
                    <PlayIcon className="w-3.5 h-3.5" /> Resume
                  </button>
                )}
                <button onClick={handleDelete} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition">
                  <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Posts', value: campaign.postCount || 0 },
              { label: 'Reach', value: campaign.totalReach || 0, icon: EyeIcon, color: 'text-blue-500' },
              { label: 'Engagement', value: campaign.totalEngagement || 0, icon: HeartIcon, color: 'text-pink-500' },
              { label: 'Platforms', value: campaign.platforms?.length || 0 },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1 mt-1">
                  {s.icon && <s.icon className={`w-4 h-4 ${s.color}`} />}
                  {typeof s.value === 'number' && s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}K` : s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Posts in campaign */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Campaign Posts</h3>
              <Link href={`/marketing/composer?campaign=${id}`} className="text-xs text-blue-600 hover:underline">+ Add Post</Link>
            </div>

            {(!campaign.posts || campaign.posts.length === 0) ? (
              <p className="text-sm text-gray-400 py-4 text-center">No posts in this campaign yet.</p>
            ) : (
              <div className="space-y-3">
                {campaign.posts.map((post) => (
                  <div key={post.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {post.platforms.map(p => (
                          <span key={p} className="text-[10px] text-gray-400 capitalize">{p}</span>
                        ))}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ml-auto ${POST_STATUS_BADGE[post.status] || ''}`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/marketing/composer?edit=${post.id}`}>
                        <button className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                          <PencilIcon className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </Link>
                      <button onClick={() => { if (confirm('Delete post?')) { deletePost(post.id); load(); } }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition">
                        <TrashIcon className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
