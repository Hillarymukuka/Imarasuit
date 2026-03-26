import { DocumentType, DocumentStatus } from '@/types';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quotation: 'Quotation',
  invoice: 'Invoice',
  purchase_order: 'Purchase Order',
  delivery_note: 'Delivery Note',
};

export const DOCUMENT_TYPE_PREFIXES: Record<DocumentType, string> = {
  quotation: 'QUO',
  invoice: 'INV',
  purchase_order: 'PO',
  delivery_note: 'DN',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  delivered: 'Delivered',
  pending: 'Pending',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  overdue: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  delivered: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  pending: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

// Zambia Tax Types
export type TaxType = 'none' | 'vat' | 'tot';

export const TAX_OPTIONS: { value: TaxType; label: string; rate: number }[] = [
  { value: 'none', label: 'No Tax (0%)', rate: 0 },
  { value: 'vat', label: 'VAT (16%)', rate: 16 },
  { value: 'tot', label: 'TOT (4%)', rate: 4 },
];

export const TAX_RATES: Record<TaxType, number> = {
  none: 0,
  vat: 16,
  tot: 4,
};

export const CURRENCY_SYMBOL = 'K';

// ── Supported currencies for the currency toggle ────────────────
export interface CurrencyOption {
  code: string;   // ISO 4217
  symbol: string; // displayed before amounts
  name: string;   // human-readable
  locale: string; // used for number formatting
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'ZMW', symbol: 'K',   name: 'Zambian Kwacha',    locale: 'en-ZM' },
  { code: 'USD', symbol: '$',   name: 'US Dollar',         locale: 'en-US' },
  { code: 'GBP', symbol: '£',   name: 'British Pound',     locale: 'en-GB' },
  { code: 'EUR', symbol: '€',   name: 'Euro',              locale: 'de-DE' },
  { code: 'ZAR', symbol: 'R',   name: 'South African Rand', locale: 'en-ZA' },
  { code: 'BWP', symbol: 'P',   name: 'Botswana Pula',     locale: 'en-BW' },
  { code: 'MZN', symbol: 'MT',  name: 'Mozambican Metical', locale: 'pt-MZ' },
  { code: 'MWK', symbol: 'MK',  name: 'Malawian Kwacha',   locale: 'en-MW' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', locale: 'sw-TZ' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling',   locale: 'en-KE' },
  { code: 'NGN', symbol: '₦',   name: 'Nigerian Naira',    locale: 'en-NG' },
  { code: 'INR', symbol: '₹',   name: 'Indian Rupee',      locale: 'en-IN' },
  { code: 'CNY', symbol: '¥',   name: 'Chinese Yuan',      locale: 'zh-CN' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham',        locale: 'ar-AE' },
];

export function getCurrencyByCode(code: string): CurrencyOption {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

export const DATE_FORMAT = 'MMM dd, yyyy';

export const STORAGE_KEYS = {
  COMPANY: 'business_suite_company',
  CLIENTS: 'business_suite_clients',
  DOCUMENTS: 'business_suite_documents',
  THEME: 'business_suite_theme',
  SETTINGS: 'business_suite_settings',
};

export const DEFAULT_TERMS = `
1. Payment is due within the specified payment terms.
2. Late payments may incur additional charges.
3. All prices are in ${CURRENCY_SYMBOL} unless otherwise stated.
4. This document is computer generated and valid without signature.
`;

export const DEFAULT_NOTES = 'Thank you for your business!';

// PDF Color Presets
export const PDF_COLOR_PRESETS = [
  {
    id: 'blue',
    name: 'Ocean Blue',
    primary: [14, 165, 233] as [number, number, number],
    secondary: [15, 23, 42] as [number, number, number],
    accent: [56, 189, 248] as [number, number, number],
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    primary: [16, 185, 129] as [number, number, number],
    secondary: [6, 78, 59] as [number, number, number],
    accent: [52, 211, 153] as [number, number, number],
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    primary: [139, 92, 246] as [number, number, number],
    secondary: [30, 27, 75] as [number, number, number],
    accent: [167, 139, 250] as [number, number, number],
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    primary: [244, 63, 94] as [number, number, number],
    secondary: [76, 5, 25] as [number, number, number],
    accent: [251, 113, 133] as [number, number, number],
  },
  {
    id: 'amber',
    name: 'Golden Amber',
    primary: [245, 158, 11] as [number, number, number],
    secondary: [69, 26, 3] as [number, number, number],
    accent: [252, 211, 77] as [number, number, number],
  },
  {
    id: 'slate',
    name: 'Professional Slate',
    primary: [71, 85, 105] as [number, number, number],
    secondary: [15, 23, 42] as [number, number, number],
    accent: [148, 163, 184] as [number, number, number],
  },
  {
    id: 'teal',
    name: 'Teal',
    primary: [20, 184, 166] as [number, number, number],
    secondary: [19, 78, 74] as [number, number, number],
    accent: [45, 212, 191] as [number, number, number],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    primary: [99, 102, 241] as [number, number, number],
    secondary: [30, 27, 75] as [number, number, number],
    accent: [129, 140, 248] as [number, number, number],
  },
];

export const PDF_TEMPLATE_LABELS = {
  modern: 'Modern',
  classic: 'Classic',
  minimal: 'Minimal',
  elegant: 'Elegant',
  bold: 'Bold',
};

export const DEFAULT_PDF_SETTINGS = {
  selectedColorId: 'blue',
  customColors: [] as Array<{
    id: string;
    name: string;
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
  }>,
  template: 'modern' as const,
  documentTemplates: {
    quotation: 'standard' as 'standard' | 'corporate' | 'classic' | 'modern',
    invoice: 'standard' as 'standard' | 'corporate' | 'classic' | 'modern',
    purchase_order: 'standard' as 'standard' | 'corporate' | 'classic' | 'modern',
    delivery_note: 'standard' as 'standard' | 'corporate' | 'classic' | 'modern',
    letter: 'standard' as 'standard' | 'corporate' | 'classic' | 'modern',
  },
  showLogo: true,
  logoSize: 'medium' as const,
  showBankInfo: true,
  showTerms: true,
  footerText: 'This document was generated electronically and is valid without signature.',
  currencyCode: 'ZMW',
};
