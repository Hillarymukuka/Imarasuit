'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  HeartIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCampaignsStore } from '@/modules/marketing/store';
import type { Campaign, CampaignStatus, Platform } from '@/modules/marketing/types';

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const PLATFORM_DOT: Record<string, string> = {
  twitter: 'bg-sky-400',
  instagram: 'bg-pink-400',
  linkedin: 'bg-blue-600',
  facebook: 'bg-indigo-500',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function NewCampaignModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (data: { name: string; description?: string; startDate?: string; endDate?: string; platforms: Platform[] }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  if (!open) return null;

  const togglePlatform = (p: Platform) =>
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New Campaign</h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Campaign name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-2">Platforms</label>
            <div className="flex gap-2">
              {(['twitter', 'instagram', 'linkedin', 'facebook'] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${platforms.includes(p) ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'border-gray-300 dark:border-gray-600 text-gray-500'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            Cancel
          </button>
          <button
            onClick={() => { if (name.trim()) { onCreate({ name, description: description || undefined, startDate: startDate || undefined, endDate: endDate || undefined, platforms }); onClose(); } }}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50"
          >
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { campaigns, loading, fetchCampaigns, createCampaign, updateCampaign, deleteCampaign } = useCampaignsStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    fetchCampaigns({ search: search || undefined, status: statusFilter || undefined });
  }, [fetchCampaigns, search, statusFilter]);

  // Check for ?new=1 query param
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      setShowNew(true);
    }
  }, []);

  const handleCreate = async (data: { name: string; description?: string; startDate?: string; endDate?: string; platforms: Platform[] }) => {
    await createCampaign(data);
  };

  return (
    <ModuleGuard moduleId="marketing">
      <div className="min-h-screen">
        <Header
          title="Campaigns"
          subtitle="Manage your marketing campaigns"
          actions={
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <PlusIcon className="w-4 h-4" /> New Campaign
            </button>
          }
        />

        <div className="p-4 lg:p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Campaign Cards */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <RocketLaunchIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No campaigns found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first campaign to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} onDelete={() => { if (confirm('Delete this campaign?')) deleteCampaign(c.id); }} onStatusChange={(status) => updateCampaign(c.id, { status: status as any })} />
              ))}
            </div>
          )}
        </div>

        <NewCampaignModal open={showNew} onClose={() => setShowNew(false)} onCreate={handleCreate} />
      </div>
    </ModuleGuard>
  );
}

function CampaignCard({ campaign: c, onDelete, onStatusChange }: { campaign: Campaign; onDelete: () => void; onStatusChange: (status: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const nextActions: { label: string; status: string; color: string }[] = [];
  if (c.status === 'draft') nextActions.push({ label: 'Activate', status: 'active', color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10' });
  if (c.status === 'active') {
    nextActions.push({ label: 'Pause', status: 'paused', color: 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/10' });
    nextActions.push({ label: 'Complete', status: 'completed', color: 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10' });
  }
  if (c.status === 'paused') nextActions.push({ label: 'Resume', status: 'active', color: 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/10' });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition relative">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{c.name}</h3>
          {c.startDate && (
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(c.startDate).toLocaleDateString()} {c.endDate ? `– ${new Date(c.endDate).toLocaleDateString()}` : ''}
            </p>
          )}
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <EllipsisVerticalIcon className="w-4 h-4 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              <Link href={`/marketing/campaigns/${c.id}`} className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                View Details
              </Link>
              {nextActions.map((a) => (
                <button key={a.status} onClick={() => { setMenuOpen(false); onStatusChange(a.status); }} className={`w-full text-left px-3 py-2 text-sm ${a.color}`}>
                  {a.label}
                </button>
              ))}
              <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10">
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
      </span>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <p className="text-xs text-gray-400">Posts</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{c.postCount || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Reach</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1">
            <EyeIcon className="w-3.5 h-3.5 text-blue-400" />
            {formatNumber(c.totalReach || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Likes</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-1">
            <HeartIcon className="w-3.5 h-3.5 text-pink-400" />
            {formatNumber(c.totalEngagement || 0)}
          </p>
        </div>
      </div>

      {/* Platform dots */}
      {c.platforms && c.platforms.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {c.platforms.map((p) => (
            <span key={p} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${PLATFORM_DOT[p] || 'bg-gray-400'}`} />
              <span className="text-[10px] text-gray-400 capitalize">{p}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
