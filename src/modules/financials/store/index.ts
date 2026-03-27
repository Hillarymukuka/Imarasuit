// Financials module – Zustand store
import { create } from 'zustand';
import { financialsAPI } from '../api';
import type {
  FinancialExpense,
  FinancialInvoice,
  FinancialTotals,
  MonthlyTotals,
  CreateExpenseData,
  CreateInvoiceData,
} from '../types';

interface FinancialsState {
  // Overview data
  totals: FinancialTotals;
  expensesTotals: MonthlyTotals;
  invoicesTotals: MonthlyTotals;

  // Lists
  expenses: FinancialExpense[];
  invoices: FinancialInvoice[];

  loading: boolean;
  error: string | null;

  // Actions
  fetchOverview: () => Promise<void>;
  fetchExpenses: (params?: { month?: string; search?: string }) => Promise<void>;
  fetchInvoices: (params?: { month?: string; search?: string }) => Promise<void>;
  addExpense: (data: CreateExpenseData) => Promise<void>;
  addInvoice: (data: CreateInvoiceData) => Promise<void>;
  bulkAddExpenses: (entries: CreateExpenseData[]) => Promise<void>;
  bulkAddInvoices: (entries: CreateInvoiceData[]) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
}

export const useFinancialsStore = create<FinancialsState>((set, get) => ({
  totals: { expenses: { amount: 0 }, invoices: { total: 0 } },
  expensesTotals: {},
  invoicesTotals: {},
  expenses: [],
  invoices: [],
  loading: false,
  error: null,

  fetchOverview: async () => {
    set({ loading: true, error: null });
    try {
      const data = await financialsAPI.getOverview();
      set({
        totals: data.totals,
        expensesTotals: data.expensesTotals,
        invoicesTotals: data.invoicesTotals,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchExpenses: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await financialsAPI.listExpenses(params);
      set({ expenses: data.expenses, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchInvoices: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await financialsAPI.listInvoices(params);
      set({ invoices: data.invoices, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addExpense: async (data) => {
    await financialsAPI.createExpense(data);
    await get().fetchOverview();
    await get().fetchExpenses();
  },

  addInvoice: async (data) => {
    await financialsAPI.createInvoice(data);
    await get().fetchOverview();
    await get().fetchInvoices();
  },

  bulkAddExpenses: async (entries) => {
    await financialsAPI.bulkCreateExpenses(entries);
    await get().fetchOverview();
    await get().fetchExpenses();
  },

  bulkAddInvoices: async (entries) => {
    await financialsAPI.bulkCreateInvoices(entries);
    await get().fetchOverview();
    await get().fetchInvoices();
  },

  deleteExpense: async (id) => {
    await financialsAPI.deleteExpense(id);
    set({ expenses: get().expenses.filter((e) => e.id !== id) });
    await get().fetchOverview();
  },

  deleteInvoice: async (id) => {
    await financialsAPI.deleteInvoice(id);
    set({ invoices: get().invoices.filter((i) => i.id !== id) });
    await get().fetchOverview();
  },
}));
