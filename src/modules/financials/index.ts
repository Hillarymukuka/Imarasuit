// Financials frontend module manifest
import type { SidebarItem } from '@/modules/registry';

export const MODULE_ID = 'financials';
export const MODULE_NAME = 'Financials';
export const MODULE_DESCRIPTION = 'Track expenses, invoices, and financial reports with visual dashboards';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/financials', icon: 'ChartBarIcon' },
  { label: 'Expenses', href: '/financials/expenses', icon: 'BanknotesIcon' },
  { label: 'Invoices', href: '/financials/invoices', icon: 'DocumentCurrencyDollarIcon' },
  { label: 'Reports', href: '/financials/reports', icon: 'ChartPieIcon' },
  { label: 'Entries', href: '/financials/entries', icon: 'TableCellsIcon' },
];

// Re-export all module pieces for convenience
export * from './types';
export * from './api';
export { useFinancialsStore } from './store';
