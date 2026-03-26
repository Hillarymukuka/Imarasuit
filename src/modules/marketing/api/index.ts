// Marketing module – API client
import { apiFetch } from '@/lib/api-base';
import type {
  Campaign, CampaignDetail, CreateCampaignData,
  Post, CreatePostData,
  ConnectedAccount,
  NotificationPreferences, MarketingStats,
} from '../types';

// ===================== CAMPAIGNS =====================

export const campaignsAPI = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<Campaign[]>(`/marketing/campaigns${qs ? '?' + qs : ''}`);
  },
  get: (id: string) =>
    apiFetch<CampaignDetail>(`/marketing/campaigns/${id}`),
  create: (data: CreateCampaignData) =>
    apiFetch<Campaign>('/marketing/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateCampaignData>) =>
    apiFetch<Campaign>(`/marketing/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/marketing/campaigns/${id}`, { method: 'DELETE' }),
};

// ===================== POSTS =====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

export const postsAPI = {
  list: (params?: { status?: string; campaignId?: string; limit?: number; skip?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.campaignId) q.set('campaignId', params.campaignId);
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.skip) q.set('skip', String(params.skip));
    const qs = q.toString();
    return apiFetch<Post[]>(`/marketing/posts${qs ? '?' + qs : ''}`);
  },
  getScheduled: () =>
    apiFetch<Post[]>('/marketing/posts/scheduled'),
  get: (id: string) =>
    apiFetch<Post>(`/marketing/posts/${id}`),
  create: (data: CreatePostData) =>
    apiFetch<Post>('/marketing/posts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreatePostData & { status: string }>) =>
    apiFetch<Post>(`/marketing/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/marketing/posts/${id}`, { method: 'DELETE' }),
  publish: (id: string) =>
    apiFetch<Post>(`/marketing/posts/${id}/publish`, { method: 'POST' }),
  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const form = new FormData();
    form.append('file', file);
    const resp = await fetch(`${API_BASE_URL}/marketing/posts/upload-media`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error((data as any).error || 'Upload failed');
    return data as { url: string };
  },
};

// ===================== ACCOUNTS =====================

export const accountsAPI = {
  list: () =>
    apiFetch<ConnectedAccount[]>('/marketing/accounts'),
  connect: (data: { platform: string; accountName: string; accountHandle?: string }) =>
    apiFetch<ConnectedAccount>('/marketing/accounts', { method: 'POST', body: JSON.stringify(data) }),
  disconnect: (platform: string) =>
    apiFetch<{ success: boolean }>(`/marketing/accounts/${platform}`, { method: 'DELETE' }),
};

// ===================== NOTIFICATIONS =====================

export const notificationsAPI = {
  get: () =>
    apiFetch<NotificationPreferences>('/marketing/notifications'),
  update: (data: NotificationPreferences) =>
    apiFetch<NotificationPreferences>('/marketing/notifications', { method: 'PUT', body: JSON.stringify(data) }),
};

// ===================== STATS =====================

export const marketingStatsAPI = {
  get: () =>
    apiFetch<MarketingStats>('/marketing/stats'),
};

// ===================== AI COPY ASSISTANT =====================

export interface AIGenerateRequest {
  prompt: string;
  platforms?: string[];
  tone?: string;
  maxLength?: number;
}

export interface AIRewriteRequest {
  content: string;
  instruction?: string;
  platform?: string;
}

export const marketingAIAPI = {
  generate: (data: AIGenerateRequest) =>
    apiFetch<{ content: string }>('/marketing/ai/generate', { method: 'POST', body: JSON.stringify(data) }),
  rewrite: (data: AIRewriteRequest) =>
    apiFetch<{ content: string }>('/marketing/ai/rewrite', { method: 'POST', body: JSON.stringify(data) }),
  hashtags: (content: string, count?: number) =>
    apiFetch<{ hashtags: string[] }>('/marketing/ai/hashtags', { method: 'POST', body: JSON.stringify({ content, count }) }),
};
