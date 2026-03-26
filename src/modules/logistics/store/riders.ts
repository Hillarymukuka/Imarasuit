// Logistics module – Riders store
import { create } from 'zustand';
import type { Rider, RiderDetail, CreateRiderData } from '../types';
import { ridersAPI } from '../api';

interface RidersState {
  riders: Rider[];
  loading: boolean;
  error: string | null;

  fetchRiders: (params?: { active?: boolean; available?: boolean; search?: string }) => Promise<void>;
  getRider: (code: string) => Promise<RiderDetail>;
  createRider: (data: CreateRiderData) => Promise<Rider>;
  updateRider: (code: string, data: Partial<CreateRiderData & { isActive: boolean; isAvailable: boolean }>) => Promise<Rider>;
  deleteRider: (code: string) => Promise<void>;
}

export const useRidersStore = create<RidersState>((set, get) => ({
  riders: [],
  loading: false,
  error: null,

  fetchRiders: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await ridersAPI.list(params);
      set({ riders: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  getRider: async (code) => {
    return ridersAPI.get(code);
  },

  createRider: async (data) => {
    const rider = await ridersAPI.create(data);
    set({ riders: [rider, ...get().riders] });
    return rider;
  },

  updateRider: async (code, data) => {
    const updated = await ridersAPI.update(code, data);
    set({
      riders: get().riders.map(r =>
        r.riderCode === code ? { ...r, ...updated } : r
      ),
    });
    return updated;
  },

  deleteRider: async (code) => {
    await ridersAPI.delete(code);
    set({ riders: get().riders.filter(r => r.riderCode !== code) });
  },
}));
