// Financials module – API client
import { apiFetch } from '@/lib/api-base';
import type {
  FinancialExpense,
  FinancialInvoice,
  FinancialOverview,
  CreateExpenseData,
  CreateInvoiceData,
} from '../types';

export const financialsAPI = {
  // Overview / Dashboard data
  getOverview: () =>
    apiFetch<FinancialOverview>('/financials/overview'),

  // ─── Expenses ────────────────────────────────────────────────
  listExpenses: (params?: { month?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.month) q.set('month', params.month);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<{ expenses: FinancialExpense[] }>(`/financials/expenses${qs ? '?' + qs : ''}`);
  },

  createExpense: (data: CreateExpenseData) =>
    apiFetch<FinancialExpense>('/financials/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkCreateExpenses: (entries: CreateExpenseData[]) =>
    apiFetch<{ inserted: number }>('/financials/expenses/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  deleteExpense: (id: string) =>
    apiFetch<{ success: boolean }>(`/financials/expenses/${id}`, { method: 'DELETE' }),

  // ─── Invoices ────────────────────────────────────────────────
  listInvoices: (params?: { month?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.month) q.set('month', params.month);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return apiFetch<{ invoices: FinancialInvoice[] }>(`/financials/invoices${qs ? '?' + qs : ''}`);
  },

  createInvoice: (data: CreateInvoiceData) =>
    apiFetch<FinancialInvoice>('/financials/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkCreateInvoices: (entries: CreateInvoiceData[]) =>
    apiFetch<{ inserted: number }>('/financials/invoices/bulk', {
      method: 'POST',
      body: JSON.stringify({ entries }),
    }),

  deleteInvoice: (id: string) =>
    apiFetch<{ success: boolean }>(`/financials/invoices/${id}`, { method: 'DELETE' }),
};
