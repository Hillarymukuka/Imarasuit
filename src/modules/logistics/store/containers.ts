// Logistics module – Containers store
import { create } from 'zustand';
import type { Container, ContainerDetail, CreateContainerData, Shipment } from '../types';
import { containersAPI } from '../api';

interface ContainersState {
  containers: (Container & { shipmentCount: number })[];
  loading: boolean;
  error: string | null;

  fetchContainers: (params?: { status?: string; search?: string }) => Promise<void>;
  getContainer: (code: string) => Promise<ContainerDetail>;
  createContainer: (data: CreateContainerData) => Promise<Container>;
  updateContainer: (code: string, data: Partial<CreateContainerData>) => Promise<Container>;
  updateStatus: (code: string, status: string, note?: string, updateShipments?: boolean) => Promise<void>;
  addShipments: (code: string, trackingCodes: string[]) => Promise<number>;
  removeShipments: (code: string, trackingCodes: string[]) => Promise<number>;
  getAvailableShipments: (code: string) => Promise<Shipment[]>;
  deleteContainer: (code: string) => Promise<void>;
}

export const useContainersStore = create<ContainersState>((set, get) => ({
  containers: [],
  loading: false,
  error: null,

  fetchContainers: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await containersAPI.list(params);
      set({ containers: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  getContainer: async (code) => {
    return containersAPI.get(code);
  },

  createContainer: async (data) => {
    const container = await containersAPI.create(data);
    set({ containers: [{ ...container, shipmentCount: 0 }, ...get().containers] });
    return container;
  },

  updateContainer: async (code, data) => {
    const updated = await containersAPI.update(code, data);
    set({
      containers: get().containers.map(c =>
        c.containerCode === code ? { ...c, ...updated } : c
      ),
    });
    return updated;
  },

  updateStatus: async (code, status, note, updateShipments) => {
    await containersAPI.updateStatus(code, status, note, updateShipments);
    set({
      containers: get().containers.map(c =>
        c.containerCode === code ? { ...c, status: status as any } : c
      ),
    });
  },

  addShipments: async (code, trackingCodes) => {
    const res = await containersAPI.addShipments(code, trackingCodes);
    // Refresh container to get updated count
    await get().fetchContainers();
    return res.addedCount;
  },

  removeShipments: async (code, trackingCodes) => {
    const res = await containersAPI.removeShipments(code, trackingCodes);
    await get().fetchContainers();
    return res.removedCount;
  },

  getAvailableShipments: async (code) => {
    return containersAPI.getAvailableShipments(code);
  },

  deleteContainer: async (code) => {
    await containersAPI.delete(code);
    set({ containers: get().containers.filter(c => c.containerCode !== code) });
  },
}));
