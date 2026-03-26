// Letters-module API endpoints
import { Letter } from '@/types';
import { apiFetch } from '@/lib/api-base';

export const lettersAPI = {
  list: () => apiFetch<Letter[]>('/letters'),

  get: (id: string) => apiFetch<Letter>(`/letters/${id}`),

  create: (data: Omit<Letter, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiFetch<Letter>('/letters', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: Partial<Letter>) =>
    apiFetch<Letter>(`/letters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/letters/${id}`, { method: 'DELETE' }),
};
