// Settings API endpoints
import { PDFSettings } from '@/types';
import { apiFetch } from './api-base';

export const settingsAPI = {
  getPDF: () => apiFetch<PDFSettings>('/settings/pdf'),

  updatePDF: (data: Partial<PDFSettings>) =>
    apiFetch<PDFSettings>('/settings/pdf', { method: 'PUT', body: JSON.stringify(data) }),
};
