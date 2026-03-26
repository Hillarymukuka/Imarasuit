// Marketing module – D1 row types & converters
import { AppEnv } from '../../types';

// ─── Row Types (snake_case from D1) ───

export interface ConnectedAccountRow {
  id: string;
  company_id: string;
  platform: string;
  account_name: string;
  account_handle: string | null;
  access_token: string | null;
  refresh_token: string | null;
  platform_user_id: string | null;
  is_connected: number;
  connected_at: string;
  updated_at: string;
}

export interface CampaignRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  platforms: string;   // JSON
  total_reach: number;
  total_engagement: number;
  created_at: string;
  updated_at: string;
}

export interface PostRow {
  id: string;
  company_id: string;
  campaign_id: string | null;
  content: string;
  platforms: string;   // JSON
  media_urls: string;  // JSON
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  reach: number;
  engagement: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefsRow {
  id: string;
  company_id: string;
  post_published_alerts: number;
  engagement_milestones: number;
  scheduled_post_reminders: number;
  updated_at: string;
}

// ─── Row → Response Converters ───

export function accountRowToResponse(row: ConnectedAccountRow) {
  return {
    id: row.id,
    platform: row.platform,
    accountName: row.account_name,
    accountHandle: row.account_handle || undefined,
    platformUserId: row.platform_user_id || undefined,
    hasToken: !!row.access_token,
    isConnected: row.is_connected === 1,
    connectedAt: row.connected_at,
  };
}

export function campaignRowToResponse(row: CampaignRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    platforms: JSON.parse(row.platforms || '[]') as string[],
    totalReach: row.total_reach,
    totalEngagement: row.total_engagement,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function postRowToResponse(row: PostRow) {
  return {
    id: row.id,
    campaignId: row.campaign_id || undefined,
    content: row.content,
    platforms: JSON.parse(row.platforms || '[]') as string[],
    mediaUrls: JSON.parse(row.media_urls || '[]') as string[],
    status: row.status,
    scheduledAt: row.scheduled_at || undefined,
    publishedAt: row.published_at || undefined,
    reach: row.reach,
    engagement: row.engagement,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function notifPrefsRowToResponse(row: NotificationPrefsRow) {
  return {
    postPublishedAlerts: row.post_published_alerts === 1,
    engagementMilestones: row.engagement_milestones === 1,
    scheduledPostReminders: row.scheduled_post_reminders === 1,
  };
}
