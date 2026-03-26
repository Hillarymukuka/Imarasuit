// Marketing module – Frontend types

export type Platform = 'twitter' | 'instagram' | 'linkedin' | 'facebook';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface ConnectedAccount {
  id: string;
  platform: Platform;
  accountName: string;
  accountHandle?: string;
  isConnected: boolean;
  connectedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
  totalReach: number;
  totalEngagement: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail extends Campaign {
  posts: Post[];
}

export interface Post {
  id: string;
  campaignId?: string;
  content: string;
  platforms: Platform[];
  mediaUrls: string[];
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  reach: number;
  engagement: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content: string;
  platforms: Platform[];
  mediaUrls?: string[];
  campaignId?: string;
  scheduledAt?: string;
  status?: PostStatus;
  publish?: boolean;
}

export interface CreateCampaignData {
  name: string;
  description?: string;
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
}

export interface NotificationPreferences {
  postPublishedAlerts: boolean;
  engagementMilestones: boolean;
  scheduledPostReminders: boolean;
}

export interface MarketingStats {
  posts: { total: number; published: number; scheduled: number; drafts: number };
  campaigns: { total: number; active: number };
  totalReach: number;
  totalEngagement: number;
  connectedAccounts: number;
  recentPosts: Array<{
    id: string;
    content: string;
    platforms: Platform[];
    status: PostStatus;
    reach: number;
    engagement: number;
    publishedAt?: string;
    scheduledAt?: string;
    createdAt: string;
  }>;
}
