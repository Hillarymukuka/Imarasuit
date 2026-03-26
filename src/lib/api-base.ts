// Base API infrastructure – token management & fetch wrapper
import { CompanyProfile } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

// Token management
let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('auth_token');
  }
  return authToken;
}

export function clearToken() {
  authToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

// Base fetch wrapper – used by all domain API files
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const isAuthEndpoint = path === '/auth/login' || path === '/auth/signup';
    if (!isAuthEndpoint) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({ error: 'Invalid credentials' }));
    throw new Error((errorData as any).error || 'Invalid credentials');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error((error as any).error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth types
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  company: CompanyProfile | null;
}

export interface MeResponse {
  user: AuthUser;
  company: CompanyProfile | null;
}

// Auth API (core – not module-specific)
export const authAPI = {
  signup: (data: { companyName: string; name: string; email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  me: () => apiFetch<MeResponse>('/auth/me'),
};

// Company API (core – shared across modules)
export const companyAPI = {
  get: () => apiFetch<CompanyProfile>('/company'),

  update: (data: Partial<CompanyProfile>) =>
    apiFetch<CompanyProfile>('/company', { method: 'PUT', body: JSON.stringify(data) }),
};

// Health check
export const healthAPI = {
  check: () => apiFetch<{ status: string; timestamp: string }>('/health'),
};
