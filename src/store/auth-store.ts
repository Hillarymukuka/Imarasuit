// Auth Store - manages authentication state
import { create } from 'zustand';
import { CompanyProfile } from '@/types';
import { authAPI, setToken, clearToken, getToken, AuthUser, companyAPI } from '@/lib/api-client';

interface AuthStore {
  user: AuthUser | null;
  company: CompanyProfile | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (companyName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setCompany: (company: CompanyProfile) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  company: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    const token = getToken();
    if (!token) {
      set({ isInitialized: true, isLoading: false });
      return;
    }

    set({ isLoading: true, token });
    try {
      const { user, company } = await authAPI.me();
      set({ user, company, isInitialized: true, isLoading: false });
    } catch {
      clearToken();
      set({ user: null, company: null, token: null, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user, company } = await authAPI.login({ email, password });
      setToken(token);
      set({ user, company, token, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      throw err;
    }
  },

  signup: async (companyName: string, name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { token, user, company } = await authAPI.signup({ companyName, name, email, password });
      setToken(token);
      set({ user, company, token, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Signup failed' });
      throw err;
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, company: null, token: null, error: null });
  },

  setCompany: (company: CompanyProfile) => {
    set({ company });
  },

  clearError: () => {
    set({ error: null });
  },
}));
