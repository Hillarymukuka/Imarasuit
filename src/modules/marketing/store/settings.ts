// Marketing module – Settings store (connected accounts + notification prefs)
import { create } from 'zustand';
import type { ConnectedAccount, NotificationPreferences, MarketingStats } from '../types';
import { accountsAPI, notificationsAPI, marketingStatsAPI } from '../api';

interface MarketingSettingsState {
  accounts: ConnectedAccount[];
  notifications: NotificationPreferences | null;
  stats: MarketingStats | null;
  loading: boolean;
  error: string | null;

  fetchAccounts: () => Promise<void>;
  connectAccount: (data: { platform: string; accountName: string; accountHandle?: string }) => Promise<void>;
  disconnectAccount: (platform: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  updateNotifications: (data: NotificationPreferences) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useMarketingSettingsStore = create<MarketingSettingsState>((set, get) => ({
  accounts: [],
  notifications: null,
  stats: null,
  loading: false,
  error: null,

  fetchAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const data = await accountsAPI.list();
      set({ accounts: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  connectAccount: async (data) => {
    const account = await accountsAPI.connect(data);
    set({ accounts: [...get().accounts, account] });
  },

  disconnectAccount: async (platform) => {
    await accountsAPI.disconnect(platform);
    set({ accounts: get().accounts.filter((a) => a.platform !== platform) });
  },

  fetchNotifications: async () => {
    try {
      const data = await notificationsAPI.get();
      set({ notifications: data });
    } catch (e: any) {
      console.error('Failed to fetch notification prefs:', e);
    }
  },

  updateNotifications: async (data) => {
    const updated = await notificationsAPI.update(data);
    set({ notifications: updated });
  },

  fetchStats: async () => {
    try {
      const data = await marketingStatsAPI.get();
      set({ stats: data });
    } catch (e: any) {
      console.error('Failed to fetch marketing stats:', e);
    }
  },
}));
