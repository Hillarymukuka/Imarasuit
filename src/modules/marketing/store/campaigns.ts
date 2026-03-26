// Marketing module – Campaigns store
import { create } from 'zustand';
import type { Campaign, CampaignDetail, CreateCampaignData } from '../types';
import { campaignsAPI } from '../api';

interface CampaignsState {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;

  fetchCampaigns: (params?: { status?: string; search?: string }) => Promise<void>;
  getCampaign: (id: string) => Promise<CampaignDetail>;
  createCampaign: (data: CreateCampaignData) => Promise<Campaign>;
  updateCampaign: (id: string, data: Partial<CreateCampaignData>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

export const useCampaignsStore = create<CampaignsState>((set, get) => ({
  campaigns: [],
  loading: false,
  error: null,

  fetchCampaigns: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await campaignsAPI.list(params);
      set({ campaigns: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  getCampaign: async (id) => {
    return campaignsAPI.get(id);
  },

  createCampaign: async (data) => {
    const campaign = await campaignsAPI.create(data);
    set({ campaigns: [campaign, ...get().campaigns] });
    return campaign;
  },

  updateCampaign: async (id, data) => {
    const updated = await campaignsAPI.update(id, data);
    set({
      campaigns: get().campaigns.map((c) => (c.id === id ? updated : c)),
    });
  },

  deleteCampaign: async (id) => {
    await campaignsAPI.delete(id);
    set({ campaigns: get().campaigns.filter((c) => c.id !== id) });
  },
}));
