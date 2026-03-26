// Company Store - backed by API
import { create } from 'zustand';
import { CompanyProfile } from '@/types';
import { companyAPI } from '@/lib/api-client';

interface CompanyStore {
  company: CompanyProfile | null;
  isLoading: boolean;
  fetchCompany: () => Promise<void>;
  setCompany: (company: CompanyProfile) => void;
  updateCompany: (updates: Partial<CompanyProfile>) => Promise<void>;
  clearCompany: () => void;
}

export const useCompanyStore = create<CompanyStore>()((set, get) => ({
  company: null,
  isLoading: false,

  fetchCompany: async () => {
    set({ isLoading: true });
    try {
      const company = await companyAPI.get();
      set({ company, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setCompany: (company) => set({ company }),

  updateCompany: async (updates) => {
    const current = get().company;
    if (!current) return;
    const updatedData = { ...current, ...updates, updatedAt: new Date().toISOString() };
    try {
      const company = await companyAPI.update(updatedData);
      set({ company });
    } catch (err) {
      console.error('Failed to update company:', err);
      throw err;
    }
  },

  clearCompany: () => set({ company: null }),
}));
