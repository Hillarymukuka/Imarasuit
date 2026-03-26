// Documents-module API endpoints (clients + documents)
import { Client, Document } from '@/types';
import { apiFetch } from '@/lib/api-base';

// Clients API
export const clientsAPI = {
  list: () => apiFetch<Client[]>('/clients'),

  get: (id: string) => apiFetch<Client>(`/clients/${id}`),

  create: (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Client>) =>
    apiFetch<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/clients/${id}`, { method: 'DELETE' }),
};

// Documents API
export const documentsAPI = {
  list: (type?: string) => {
    const query = type ? `?type=${type}` : '';
    return apiFetch<Document[]>(`/documents${query}`);
  },

  get: (id: string) => apiFetch<Document>(`/documents/${id}`),

  create: (data: any) =>
    apiFetch<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) =>
    apiFetch<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  updateStatus: (id: string, status: string) =>
    apiFetch<{ success: boolean; status: string }>(`/documents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),

  getNextNumber: (type: string) =>
    apiFetch<{ documentNumber: string }>(`/documents/next-number/${type}`),
};
