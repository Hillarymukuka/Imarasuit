// Clients Store - backed by API
import { create } from 'zustand';
import { Client } from '@/types';
import { clientsAPI } from '@/lib/api-client';

interface ClientsStore {
  clients: Client[];
  isLoading: boolean;
  isLoaded: boolean;
  fetchClients: () => Promise<void>;
  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClient: (id: string) => Client | undefined;
}

export const useClientsStore = create<ClientsStore>()((set, get) => ({
  clients: [],
  isLoading: false,
  isLoaded: false,

  fetchClients: async () => {
    if (get().isLoaded) return;
    set({ isLoading: true });
    try {
      const clients = await clientsAPI.list();
      set({ clients, isLoading: false, isLoaded: true });
    } catch {
      set({ isLoading: false });
    }
  },

  addClient: async (clientData) => {
    try {
      const newClient = await clientsAPI.create(clientData as any);
      set((state) => ({ clients: [newClient, ...state.clients] }));
      return newClient;
    } catch (err) {
      console.error('Failed to create client:', err);
      throw err;
    }
  },

  updateClient: async (id, updates) => {
    try {
      const current = get().clients.find(c => c.id === id);
      if (!current) return;
      const updated = await clientsAPI.update(id, { ...current, ...updates });
      set((state) => ({
        clients: state.clients.map((c) => c.id === id ? updated : c)
      }));
    } catch (err) {
      console.error('Failed to update client:', err);
      throw err;
    }
  },

  deleteClient: async (id) => {
    try {
      await clientsAPI.delete(id);
      set((state) => ({
        clients: state.clients.filter((c) => c.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete client:', err);
      throw err;
    }
  },

  getClient: (id) => get().clients.find((client) => client.id === id),
}));
