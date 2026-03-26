// Logistics module – Deliveries store
import { create } from 'zustand';
import type { Delivery, DeliveryDetail, CreateDeliveryData, LocationPoint, LogisticsStats } from '../types';
import { deliveriesAPI, logisticsStatsAPI } from '../api';

interface DeliveriesState {
  deliveries: Delivery[];
  stats: LogisticsStats | null;
  loading: boolean;
  error: string | null;

  fetchDeliveries: (params?: { status?: string; riderId?: string; search?: string }) => Promise<void>;
  getDelivery: (code: string) => Promise<DeliveryDetail>;
  createDelivery: (data: CreateDeliveryData) => Promise<Delivery>;
  assignRider: (code: string, riderId: string) => Promise<void>;
  updateStatus: (code: string, status: string, note?: string) => Promise<void>;
  updatePayment: (code: string, paymentStatus: string) => Promise<void>;
  addLocation: (code: string, loc: { lat: number; lng: number; accuracy?: number; speed?: number; heading?: number }) => Promise<void>;
  getLocations: (code: string) => Promise<LocationPoint[]>;
  deleteDelivery: (code: string) => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const useDeliveriesStore = create<DeliveriesState>((set, get) => ({
  deliveries: [],
  stats: null,
  loading: false,
  error: null,

  fetchDeliveries: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await deliveriesAPI.list(params);
      set({ deliveries: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  getDelivery: async (code) => {
    return deliveriesAPI.get(code);
  },

  createDelivery: async (data) => {
    const delivery = await deliveriesAPI.create(data);
    set({ deliveries: [delivery, ...get().deliveries] });
    return delivery;
  },

  assignRider: async (code, riderId) => {
    await deliveriesAPI.assign(code, riderId);
    set({
      deliveries: get().deliveries.map(d =>
        d.deliveryCode === code ? { ...d, riderId, status: 'assigned' as any } : d
      ),
    });
  },

  updateStatus: async (code, status, note) => {
    await deliveriesAPI.updateStatus(code, status, note);
    set({
      deliveries: get().deliveries.map(d =>
        d.deliveryCode === code ? { ...d, status: status as any } : d
      ),
    });
  },

  updatePayment: async (code, paymentStatus) => {
    await deliveriesAPI.updatePayment(code, paymentStatus);
    set({
      deliveries: get().deliveries.map(d =>
        d.deliveryCode === code ? { ...d, paymentStatus: paymentStatus as any } : d
      ),
    });
  },

  addLocation: async (code, loc) => {
    await deliveriesAPI.addLocation(code, loc);
  },

  getLocations: async (code) => {
    return deliveriesAPI.getLocations(code);
  },

  deleteDelivery: async (code) => {
    await deliveriesAPI.delete(code);
    set({ deliveries: get().deliveries.filter(d => d.deliveryCode !== code) });
  },

  fetchStats: async () => {
    try {
      const stats = await logisticsStatsAPI.get();
      set({ stats });
    } catch (e: any) {
      console.error('Failed to fetch logistics stats:', e);
    }
  },
}));
