// API client barrel - re-exports core + module APIs
export { setToken, getToken, clearToken, apiFetch, authAPI, companyAPI, healthAPI } from './api-base';
export type { AuthUser, AuthResponse, MeResponse } from './api-base';
export { clientsAPI, documentsAPI } from '@/modules/business-documents/api/documents';
export { lettersAPI } from '@/modules/business-documents/api/letters';
export { settingsAPI } from './api-settings';
