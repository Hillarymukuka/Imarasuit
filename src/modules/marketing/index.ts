// Marketing (MaaS) frontend module manifest
import type { SidebarItem } from '@/modules/registry';

export const MODULE_ID = 'marketing';
export const MODULE_NAME = 'Marketing';
export const MODULE_DESCRIPTION = 'Social media management, campaigns, scheduling & analytics';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/marketing', icon: 'MegaphoneIcon' },
  { label: 'Composer', href: '/marketing/composer', icon: 'PencilSquareIcon' },
  { label: 'Campaigns', href: '/marketing/campaigns', icon: 'RocketLaunchIcon' },
  { label: 'Schedule', href: '/marketing/schedule', icon: 'CalendarDaysIcon' },
  { label: 'Settings', href: '/marketing/settings', icon: 'Cog6ToothIcon' },
];

// Re-export all module pieces
export * from './types';
export * from './api';
export { usePostsStore, useCampaignsStore, useMarketingSettingsStore } from './store';
