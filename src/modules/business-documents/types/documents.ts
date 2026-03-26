// Business Documents module types
import { Address } from '@/types/core';

export type DocumentType = 'quotation' | 'invoice' | 'purchase_order' | 'delivery_note';

export interface Client {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address: Address;
  tin?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type TaxType = 'none' | 'vat' | 'tot';

export interface DocumentBase {
  id: string;
  documentNumber: string;
  type: DocumentType;
  dateIssued: string;
  referenceNumber?: string;
  companyId: string;
  clientId: string;
  items: LineItem[];
  subtotal: number;
  taxType: TaxType;
  taxPercent: number;
  taxTotal: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  grandTotal: number;
  notes?: string;
  terms?: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Quotation extends DocumentBase {
  type: 'quotation';
  validUntil: string;
}

export interface Invoice extends DocumentBase {
  type: 'invoice';
  dueDate: string;
  paymentTerms?: string;
  paidAmount: number;
  paidDate?: string;
}

export interface PurchaseOrder extends DocumentBase {
  type: 'purchase_order';
  expectedDeliveryDate?: string;
  shippingMethod?: string;
}

export interface DeliveryNote extends DocumentBase {
  type: 'delivery_note';
  deliveryDate: string;
  receivedBy?: string;
  deliveryAddress?: Address;
}

export type Document = Quotation | Invoice | PurchaseOrder | DeliveryNote;

export type DocumentStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'cancelled'
  | 'delivered'
  | 'pending';

export interface DocumentFilter {
  type?: DocumentType;
  status?: DocumentStatus;
  clientId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DashboardStats {
  totalQuotations: number;
  totalInvoices: number;
  totalPurchaseOrders: number;
  totalDeliveryNotes: number;
  pendingAmount: number;
  paidAmount: number;
  overdueAmount: number;
  recentDocuments: Document[];
}

// Form types
export interface LineItemFormData {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface DocumentFormData {
  clientId: string;
  referenceNumber?: string;
  dueDate?: string;
  validUntil?: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  items: LineItemFormData[];
  taxType: TaxType;
  discount: number;
  discountType: 'percentage' | 'fixed';
  notes?: string;
  terms?: string;
}
