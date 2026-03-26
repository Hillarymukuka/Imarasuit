// Documents Store - backed by API
import { create } from 'zustand';
import {
  Document,
  DocumentType,
  DocumentFilter,
  Quotation,
  Invoice,
  PurchaseOrder,
  DeliveryNote,
  LineItem,
  DocumentStatus,
  TaxType,
} from '@/types';
import { calculateDocumentTotals } from '@/lib/utils';
import { documentsAPI } from '@/lib/api-client';
import { useFinancialsStore } from '@/modules/financials/store';
import { useClientsStore } from './clients';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getMonthName(dateStr: string): string {
  try {
    return MONTHS[new Date(dateStr).getMonth()] || '';
  } catch {
    return '';
  }
}

/** Record a document to the Financials module (fire-and-forget). */
function recordToFinancials(doc: Document, action: 'expense' | 'income') {
  const clientsStore = useClientsStore.getState();
  const client = clientsStore.getClient(doc.clientId);
  const name = client?.name || 'Unknown';
  const date = doc.dateIssued?.split('T')[0] || new Date().toISOString().split('T')[0];
  const month = getMonthName(doc.dateIssued || new Date().toISOString());
  const store = useFinancialsStore.getState();

  if (action === 'expense') {
    store.addExpense({
      date,
      company: name,
      description: `${doc.documentNumber} — ${doc.items?.map((i) => i.name).join(', ') || 'Purchase Order'}`,
      amount: doc.grandTotal || 0,
      month,
    }).catch(() => {/* silent — financials is optional */});
  } else {
    store.addInvoice({
      date,
      client: name,
      description: `${doc.documentNumber} — ${doc.items?.map((i) => i.name).join(', ') || 'Invoice'}`,
      total: doc.grandTotal || 0,
      month,
    }).catch(() => {/* silent — financials is optional */});
  }
}

interface DocumentsStore {
  documents: Document[];
  isLoading: boolean;
  isLoaded: boolean;
  fetchDocuments: (type?: DocumentType) => Promise<void>;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => Document | undefined;
  getDocumentsByType: (type: DocumentType) => Document[];
  getDocumentsByClient: (clientId: string) => Document[];
  getFilteredDocuments: (filter: DocumentFilter) => Document[];
  getDocumentCount: (type: DocumentType) => number;
  createQuotation: (data: CreateDocumentData) => Promise<Quotation>;
  createInvoice: (data: CreateDocumentData & { dueDate: string }) => Promise<Invoice>;
  createPurchaseOrder: (data: CreateDocumentData) => Promise<PurchaseOrder>;
  createDeliveryNote: (data: CreateDocumentData & { deliveryDate: string }) => Promise<DeliveryNote>;
  convertToInvoice: (quotationId: string) => Promise<Invoice | null>;
  convertToPurchaseOrder: (sourceId: string) => Promise<PurchaseOrder | null>;
  convertToDeliveryNote: (sourceId: string) => Promise<DeliveryNote | null>;
  updateDocumentStatus: (id: string, status: DocumentStatus) => Promise<void>;
}

export interface CreateDocumentData {
  companyId: string;
  clientId: string;
  items: LineItem[];
  taxType?: TaxType;
  taxPercent?: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  notes?: string;
  terms?: string;
  referenceNumber?: string;
  validUntil?: string;
  expectedDeliveryDate?: string;
}

export const useDocumentsStore = create<DocumentsStore>()((set, get) => ({
  documents: [],
  isLoading: false,
  isLoaded: false,

  fetchDocuments: async (type?: DocumentType) => {
    set({ isLoading: true });
    try {
      const documents = await documentsAPI.list(type) as Document[];
      set({ documents, isLoading: false, isLoaded: true });
    } catch {
      set({ isLoading: false });
    }
  },

  addDocument: (document) => set((state) => ({
    documents: [document, ...state.documents]
  })),

  updateDocument: async (id, updates) => {
    try {
      const updated = await documentsAPI.update(id, updates) as Document;
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? updated : doc
        )
      }));
    } catch (err) {
      console.error('Failed to update document:', err);
      throw err;
    }
  },

  deleteDocument: async (id) => {
    try {
      await documentsAPI.delete(id);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete document:', err);
      throw err;
    }
  },

  getDocument: (id) => get().documents.find((doc) => doc.id === id),
  getDocumentsByType: (type) => get().documents.filter((doc) => doc.type === type),
  getDocumentsByClient: (clientId) => get().documents.filter((doc) => doc.clientId === clientId),

  getFilteredDocuments: (filter) => {
    let docs = get().documents;
    if (filter.type) docs = docs.filter((doc) => doc.type === filter.type);
    if (filter.status) docs = docs.filter((doc) => doc.status === filter.status);
    if (filter.clientId) docs = docs.filter((doc) => doc.clientId === filter.clientId);
    if (filter.dateFrom) docs = docs.filter((doc) => new Date(doc.dateIssued) >= new Date(filter.dateFrom!));
    if (filter.dateTo) docs = docs.filter((doc) => new Date(doc.dateIssued) <= new Date(filter.dateTo!));
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      docs = docs.filter((doc) =>
        doc.documentNumber.toLowerCase().includes(searchLower) ||
        doc.referenceNumber?.toLowerCase().includes(searchLower)
      );
    }
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getDocumentCount: (type) => get().documents.filter((doc) => doc.type === type).length,

  createQuotation: async (data) => {
    const now = new Date().toISOString();
    const taxPercent = data.taxPercent || 0;
    const totals = calculateDocumentTotals(data.items, data.discount || 0, data.discountType || 'fixed', taxPercent);

    const docData = {
      type: 'quotation',
      dateIssued: now,
      validUntil: data.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      referenceNumber: data.referenceNumber,
      companyId: data.companyId,
      clientId: data.clientId,
      items: data.items,
      subtotal: totals.subtotal,
      taxType: data.taxType || 'none',
      taxPercent,
      taxTotal: totals.taxTotal,
      discount: data.discount || 0,
      discountType: data.discountType || 'fixed',
      grandTotal: totals.grandTotal,
      notes: data.notes,
      terms: data.terms,
      status: 'draft',
    };

    const quotation = await documentsAPI.create(docData) as Quotation;
    set((state) => ({ documents: [quotation, ...state.documents] }));
    return quotation;
  },

  createInvoice: async (data) => {
    const now = new Date().toISOString();
    const taxPercent = data.taxPercent || 0;
    const totals = calculateDocumentTotals(data.items, data.discount || 0, data.discountType || 'fixed', taxPercent);

    const docData = {
      type: 'invoice',
      dateIssued: now,
      dueDate: data.dueDate,
      referenceNumber: data.referenceNumber,
      companyId: data.companyId,
      clientId: data.clientId,
      items: data.items,
      subtotal: totals.subtotal,
      taxType: data.taxType || 'none',
      taxPercent,
      taxTotal: totals.taxTotal,
      discount: data.discount || 0,
      discountType: data.discountType || 'fixed',
      grandTotal: totals.grandTotal,
      notes: data.notes,
      terms: data.terms,
      status: 'draft',
      paidAmount: 0,
    };

    const invoice = await documentsAPI.create(docData) as Invoice;
    set((state) => ({ documents: [invoice, ...state.documents] }));
    return invoice;
  },

  createPurchaseOrder: async (data) => {
    const now = new Date().toISOString();
    const taxPercent = data.taxPercent || 0;
    const totals = calculateDocumentTotals(data.items, data.discount || 0, data.discountType || 'fixed', taxPercent);

    const docData = {
      type: 'purchase_order',
      dateIssued: now,
      expectedDeliveryDate: data.expectedDeliveryDate,
      referenceNumber: data.referenceNumber,
      companyId: data.companyId,
      clientId: data.clientId,
      items: data.items,
      subtotal: totals.subtotal,
      taxType: data.taxType || 'none',
      taxPercent,
      taxTotal: totals.taxTotal,
      discount: data.discount || 0,
      discountType: data.discountType || 'fixed',
      grandTotal: totals.grandTotal,
      notes: data.notes,
      terms: data.terms,
      status: 'draft',
    };

    const po = await documentsAPI.create(docData) as PurchaseOrder;
    set((state) => ({ documents: [po, ...state.documents] }));
    // Financials will record when the PO is marked as 'sent'
    return po;
  },

  createDeliveryNote: async (data) => {
    const now = new Date().toISOString();
    const taxPercent = data.taxPercent || 0;
    const totals = calculateDocumentTotals(data.items, data.discount || 0, data.discountType || 'fixed', taxPercent);

    const docData = {
      type: 'delivery_note',
      dateIssued: now,
      deliveryDate: (data as any).deliveryDate || now,
      referenceNumber: data.referenceNumber,
      companyId: data.companyId,
      clientId: data.clientId,
      items: data.items,
      subtotal: totals.subtotal,
      taxType: data.taxType || 'none',
      taxPercent,
      taxTotal: totals.taxTotal,
      discount: data.discount || 0,
      discountType: data.discountType || 'fixed',
      grandTotal: totals.grandTotal,
      notes: data.notes,
      terms: data.terms,
      status: 'draft',
    };

    const dn = await documentsAPI.create(docData) as DeliveryNote;
    set((state) => ({ documents: [dn, ...state.documents] }));
    return dn;
  },

  convertToInvoice: async (quotationId) => {
    const quotation = get().getDocument(quotationId) as Quotation;
    if (!quotation || quotation.type !== 'quotation') return null;

    const now = new Date().toISOString();
    const docData = {
      type: 'invoice',
      dateIssued: now,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      referenceNumber: quotation.documentNumber,
      companyId: quotation.companyId,
      clientId: quotation.clientId,
      items: quotation.items,
      subtotal: quotation.subtotal,
      taxType: quotation.taxType || 'none',
      taxPercent: quotation.taxPercent || 0,
      taxTotal: quotation.taxTotal,
      discount: quotation.discount,
      discountType: quotation.discountType,
      grandTotal: quotation.grandTotal,
      notes: quotation.notes,
      terms: quotation.terms,
      status: 'draft',
      paidAmount: 0,
    };

    try {
      const invoice = await documentsAPI.create(docData) as Invoice;
      await get().updateDocumentStatus(quotationId, 'accepted');
      set((state) => ({ documents: [invoice, ...state.documents] }));
      return invoice;
    } catch (err) {
      console.error('Failed to convert to invoice:', err);
      return null;
    }
  },

  convertToPurchaseOrder: async (sourceId) => {
    const source = get().getDocument(sourceId);
    if (!source) return null;

    const now = new Date().toISOString();
    const docData = {
      type: 'purchase_order',
      dateIssued: now,
      referenceNumber: source.documentNumber,
      companyId: source.companyId,
      clientId: source.clientId,
      items: source.items,
      subtotal: source.subtotal,
      taxType: source.taxType || 'none',
      taxPercent: source.taxPercent || 0,
      taxTotal: source.taxTotal,
      discount: source.discount,
      discountType: source.discountType,
      grandTotal: source.grandTotal,
      notes: source.notes,
      terms: source.terms,
      status: 'draft',
    };

    try {
      const po = await documentsAPI.create(docData) as PurchaseOrder;
      if (source.type === 'invoice') await get().updateDocumentStatus(sourceId, 'sent');
      else if (source.type === 'quotation') await get().updateDocumentStatus(sourceId, 'accepted');
      set((state) => ({ documents: [po, ...state.documents] }));
      // Financials will record when the PO is marked as 'sent'
      return po;
    } catch (err) {
      console.error('Failed to convert to purchase order:', err);
      return null;
    }
  },

  convertToDeliveryNote: async (sourceId) => {
    const source = get().getDocument(sourceId);
    if (!source) return null;

    const now = new Date().toISOString();
    const docData = {
      type: 'delivery_note',
      dateIssued: now,
      deliveryDate: now,
      referenceNumber: source.documentNumber,
      companyId: source.companyId,
      clientId: source.clientId,
      items: source.items,
      subtotal: source.subtotal,
      taxType: source.taxType || 'none',
      taxPercent: source.taxPercent || 0,
      taxTotal: source.taxTotal,
      discount: source.discount,
      discountType: source.discountType,
      grandTotal: source.grandTotal,
      notes: source.notes,
      terms: source.terms,
      status: 'draft',
    };

    try {
      const dn = await documentsAPI.create(docData) as DeliveryNote;
      if (source.type === 'purchase_order' || source.type === 'invoice') {
        await get().updateDocumentStatus(sourceId, 'sent');
      } else if (source.type === 'quotation') {
        await get().updateDocumentStatus(sourceId, 'accepted');
      }
      set((state) => ({ documents: [dn, ...state.documents] }));
      return dn;
    } catch (err) {
      console.error('Failed to convert to delivery note:', err);
      return null;
    }
  },

  updateDocumentStatus: async (id, status) => {
    try {
      await documentsAPI.updateStatus(id, status);
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === id ? { ...doc, status, updatedAt: new Date().toISOString() } as Document : doc
        )
      }));

      // Auto-sync to Financials:
      //  - Purchase Order marked 'sent'  → record as expense
      //  - Invoice marked 'paid'         → record as income
      const doc = get().getDocument(id);
      if (doc) {
        if (status === 'sent' && doc.type === 'purchase_order') {
          recordToFinancials(doc, 'expense');
        } else if (status === 'paid' && doc.type === 'invoice') {
          recordToFinancials(doc, 'income');
        }
      }
    } catch (err) {
      console.error('Failed to update document status:', err);
      throw err;
    }
  },
}));
