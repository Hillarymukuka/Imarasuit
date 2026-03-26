// Logistics module – Shipments store
import { create } from 'zustand';
import type { Shipment, CreateShipmentData, StatusHistoryEntry, UpdateShipmentStatusData } from '../types';
import { shipmentsAPI } from '../api';

interface ShipmentsState {
  shipments: Shipment[];
  loading: boolean;
  error: string | null;
  
  fetchShipments: (params?: { status?: string; search?: string }) => Promise<void>;
  getShipment: (trackingCode: string) => Promise<Shipment>;
  getHistory: (trackingCode: string) => Promise<StatusHistoryEntry[]>;
  createShipment: (data: CreateShipmentData) => Promise<Shipment>;
  updateStatus: (trackingCode: string, data: UpdateShipmentStatusData) => Promise<void>;
  deleteShipment: (trackingCode: string) => Promise<void>;
}

export const useShipmentsStore = create<ShipmentsState>((set, get) => ({
  shipments: [],
  loading: false,
  error: null,

  fetchShipments: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await shipmentsAPI.list(params);
      set({ shipments: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  getShipment: async (trackingCode) => {
    return shipmentsAPI.get(trackingCode);
  },

  getHistory: async (trackingCode) => {
    return shipmentsAPI.getHistory(trackingCode);
  },

  createShipment: async (data) => {
    const shipment = await shipmentsAPI.create(data);
    set({ shipments: [shipment, ...get().shipments] });
    return shipment;
  },

  updateStatus: async (trackingCode, data) => {
    await shipmentsAPI.updateStatus(trackingCode, data);
    set({
      shipments: get().shipments.map(s =>
        s.trackingCode === trackingCode ? { ...s, status: data.status as any } : s
      ),
    });
  },

  deleteShipment: async (trackingCode) => {
    await shipmentsAPI.delete(trackingCode);
    set({ shipments: get().shipments.filter(s => s.trackingCode !== trackingCode) });
  },
}));
