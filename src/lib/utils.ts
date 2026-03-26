import { v4 as uuidv4 } from 'uuid';
import { format, parseISO } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  DocumentType, 
  LineItem, 
  LineItemFormData,
  Document,
  DocumentBase
} from '@/types';
import { DOCUMENT_TYPE_PREFIXES, CURRENCY_SYMBOL, DATE_FORMAT, getCurrencyByCode } from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return uuidv4();
}

export function generateDocumentNumber(type: DocumentType, existingCount: number): string {
  const prefix = DOCUMENT_TYPE_PREFIXES[type];
  const year = new Date().getFullYear();
  const number = String(existingCount + 1).padStart(4, '0');
  return `${prefix}-${year}-${number}`;
}

/**
 * Format a number as currency.
 *
 * When called with no `currencyCode` it reads the user's saved
 * preference from the PDF settings store (falls back to 'K' / ZMW).
 * Pass an explicit code to override — e.g. `formatCurrency(100, 'USD')`.
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  let symbol = CURRENCY_SYMBOL; // default 'K'
  try {
    // Lazy-import the store to avoid circular deps at module-load time
    const { usePDFSettingsStore } = require('@/store/pdf-settings-store');
    const code = currencyCode || usePDFSettingsStore.getState().settings.currencyCode || 'ZMW';
    symbol = getCurrencyByCode(code).symbol;
  } catch {
    if (currencyCode) {
      symbol = getCurrencyByCode(currencyCode).symbol;
    }
  }
  return `${symbol}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date): string {
  if (typeof date === 'string') {
    return format(parseISO(date), DATE_FORMAT);
  }
  return format(date, DATE_FORMAT);
}

export function formatDateForInput(date: string | Date): string {
  if (typeof date === 'string') {
    return format(parseISO(date), 'yyyy-MM-dd');
  }
  return format(date, 'yyyy-MM-dd');
}

export function calculateLineItemTotal(item: LineItemFormData): number {
  return item.quantity * item.unitPrice;
}

export function calculateDocumentTotals(
  items: LineItem[], 
  discount: number, 
  discountType: 'percentage' | 'fixed',
  taxPercent: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxTotal = subtotal * (taxPercent / 100);
  
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (subtotal + taxTotal) * (discount / 100);
  } else {
    discountAmount = discount;
  }
  
  const grandTotal = subtotal + taxTotal - discountAmount;
  
  return {
    subtotal,
    taxTotal,
    discountAmount,
    grandTotal: Math.max(0, grandTotal),
  };
}

export function createLineItem(data: LineItemFormData): LineItem {
  return {
    id: generateId(),
    name: data.name,
    description: data.description,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    total: calculateLineItemTotal(data),
  };
}

export function getDefaultLineItem(): LineItemFormData {
  return {
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
  };
}

export function convertDocument(
  source: Document,
  targetType: DocumentType,
  documentNumber: string
): Partial<DocumentBase> {
  const now = new Date().toISOString();
  
  return {
    id: generateId(),
    documentNumber,
    type: targetType,
    dateIssued: now,
    referenceNumber: source.documentNumber,
    companyId: source.companyId,
    clientId: source.clientId,
    items: source.items.map(item => ({ ...item, id: generateId() })),
    subtotal: source.subtotal,
    taxTotal: source.taxTotal,
    discount: source.discount,
    discountType: source.discountType,
    grandTotal: source.grandTotal,
    notes: source.notes,
    terms: source.terms,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

export function getDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
