// Logistics module – Reports store
import { create } from 'zustand';
import type { ReportSummary } from '../types';
import { reportsAPI } from '../api';

interface ReportsState {
  summary: ReportSummary | null;
  loading: boolean;
  error: string | null;
  exporting: boolean;

  fetchSummary: () => Promise<void>;
  exportShipmentsCsv: (statusFilter?: string) => Promise<void>;
  exportDeliveriesCsv: (statusFilter?: string) => Promise<void>;
}

export const useReportsStore = create<ReportsState>((set) => ({
  summary: null,
  loading: false,
  error: null,
  exporting: false,

  fetchSummary: async () => {
    set({ loading: true, error: null });
    try {
      const data = await reportsAPI.getSummary();
      set({ summary: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  exportShipmentsCsv: async (statusFilter) => {
    set({ exporting: true });
    try {
      await reportsAPI.downloadShipmentsCsv(statusFilter);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ exporting: false });
    }
  },

  exportDeliveriesCsv: async (statusFilter) => {
    set({ exporting: true });
    try {
      await reportsAPI.downloadDeliveriesCsv(statusFilter);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ exporting: false });
    }
  },
}));
