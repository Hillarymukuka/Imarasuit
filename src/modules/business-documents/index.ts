// Business Documents module manifest
// This file describes the module so the platform can register it dynamically.

export const MODULE_ID = 'business-documents';
export const MODULE_NAME = 'Business Documents';
export const MODULE_DESCRIPTION = 'Quotations, invoices, purchase orders, delivery notes, letters, and client management.';

// Sidebar navigation items for this module
export const SIDEBAR_ITEMS = [
  { label: 'Quotations', href: '/quotations', icon: 'DocumentTextIcon' },
  { label: 'Invoices', href: '/invoices', icon: 'CurrencyDollarIcon' },
  { label: 'Purchase Orders', href: '/purchase-orders', icon: 'ShoppingCartIcon' },
  { label: 'Delivery Notes', href: '/delivery-notes', icon: 'TruckIcon' },
  { label: 'Letters', href: '/letters', icon: 'EnvelopeIcon' },
  { label: 'Clients', href: '/clients', icon: 'UsersIcon' },
];

// Re-export module stores for convenience
export { useDocumentsStore, type CreateDocumentData } from './store/documents';
export { useClientsStore } from './store/clients';
export { useLettersStore } from './store/letters';

// Re-export module API clients
export { clientsAPI, documentsAPI } from './api/documents';
export { lettersAPI } from './api/letters';

// Re-export module types
export * from './types/documents';
export * from './types/letters';
