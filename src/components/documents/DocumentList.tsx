'use client';

import React, { useState, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  TruckIcon,
  PaperAirplaneIcon
} from '@heroicons/react/24/solid';
import { Button, Input, Select, Card, StatusBadge, DocumentRowSkeleton } from '@/components/ui';
import { Document, DocumentType, DocumentStatus, Client } from '@/types';
import { useDocumentsStore, useClientsStore, useCompanyStore } from '@/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS } from '@/lib/constants';
import { DocumentPreview } from './DocumentPreview';

interface DocumentListProps {
  type?: DocumentType;
  onEdit?: (document: Document) => void;
  onCreateNew?: () => void;
}

export function DocumentList({ type, onEdit, onCreateNew }: DocumentListProps) {
  const { documents, deleteDocument, convertToInvoice, convertToPurchaseOrder, convertToDeliveryNote, updateDocumentStatus, isLoading } = useDocumentsStore();
  const { clients, getClient } = useClientsStore();
  const { company } = useCompanyStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'' | 'week' | 'month' | 'year'>('');
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const filteredDocuments = useMemo(() => {
    let filtered = type
      ? documents.filter(doc => doc.type === type)
      : documents;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.documentNumber.toLowerCase().includes(search) ||
        doc.referenceNumber?.toLowerCase().includes(search) ||
        getClient(doc.clientId)?.name.toLowerCase().includes(search) ||
        doc.items.some(item =>
          item.name?.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search)
        )
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(doc => doc.status === statusFilter);
    }

    if (clientFilter) {
      filtered = filtered.filter(doc => doc.clientId === clientFilter);
    }

    if (dateFilter) {
      const now = new Date();
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.dateIssued || doc.createdAt);
        if (dateFilter === 'week') {
          const weekAgo = new Date(now);
          weekAgo.setDate(now.getDate() - 7);
          return docDate >= weekAgo && docDate <= now;
        }
        if (dateFilter === 'month') {
          return docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear();
        }
        if (dateFilter === 'year') {
          return docDate.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [documents, type, searchTerm, statusFilter, clientFilter, dateFilter, getClient]);

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument(id);
    }
  };

  const handleMarkCleared = async (doc: Document) => {
    await updateDocumentStatus(doc.id, 'paid');
    setActiveMenu(null);
  };

  const handleMarkDelivered = async (doc: Document) => {
    await updateDocumentStatus(doc.id, 'delivered');
    setActiveMenu(null);
  };

  const handleMarkSent = async (doc: Document) => {
    await updateDocumentStatus(doc.id, 'sent');
    setActiveMenu(null);
  };

  // Returns true if `doc` has already been converted into a document of `targetType`.
  // Relies on the fact that every converted document stores the source's documentNumber
  // in its own `referenceNumber` field.
  const hasBeenConverted = (doc: Document, targetType: string): boolean =>
    documents.some((d) => d.type === targetType && d.referenceNumber === doc.documentNumber);

  const handleConvert = async (doc: Document, targetType: 'invoice' | 'purchase_order' | 'delivery_note') => {
    let newDoc: Document | null = null;

    switch (targetType) {
      case 'invoice':
        newDoc = await convertToInvoice(doc.id);
        break;
      case 'purchase_order':
        newDoc = await convertToPurchaseOrder(doc.id);
        break;
      case 'delivery_note':
        newDoc = await convertToDeliveryNote(doc.id);
        break;
    }

    if (newDoc) {
      setPreviewDocument(newDoc);
    }
    setActiveMenu(null);
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))
  ];

  const clientOptions = [
    { value: '', label: 'All Clients' },
    ...clients.map(client => ({ value: client.id, label: client.name }))
  ];

  const previewClient = previewDocument ? getClient(previewDocument.clientId) : null;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2.5">
        {/* Search — always full width */}
        <Input
          placeholder="Search by document number, reference, client or item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
        />
        {/* Secondary filters — wrap on mobile, single row on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[130px]">
            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[130px]">
            <Select
              options={clientOptions}
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            />
          </div>
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
            {(['week', 'month', 'year'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(dateFilter === period ? '' : period)}
                className={`px-3 sm:px-4 py-1.5 text-xs font-medium transition-colors ${
                  dateFilter === period
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                } border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Document List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <DocumentRowSkeleton key={i} />
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card className="p-8 text-center">
          <DocumentTextIcon className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            No documents found
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {type
              ? `You haven't created any ${DOCUMENT_TYPE_LABELS[type].toLowerCase()}s yet.`
              : 'Start by creating your first document.'}
          </p>
          {onCreateNew && (
            <Button onClick={onCreateNew}>
              Create {type ? DOCUMENT_TYPE_LABELS[type] : 'Document'}
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredDocuments.map((doc, i) => {
            const client = getClient(doc.clientId);

            return (
              <div key={doc.id} className={activeMenu === doc.id ? 'relative z-50' : 'relative'}>
              <Card
                className="p-4 hover:shadow-md transition-all duration-200 cursor-pointer animate-slide-up-fade"
                style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}
                hover
                onClick={() => setPreviewDocument(doc)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="hidden sm:flex w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg items-center justify-center flex-shrink-0">
                      <DocumentTextIcon className="w-5 h-5 text-primary-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {doc.documentNumber}
                        </span>
                        <StatusBadge status={doc.status} />
                        {!type && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark-700 rounded">
                            {DOCUMENT_TYPE_LABELS[doc.type]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="truncate">{client?.name || 'Unknown Client'}</span>
                        <span className="hidden sm:inline flex-shrink-0">•</span>
                        <span className="hidden sm:inline flex-shrink-0">{formatDate(doc.dateIssued)}</span>
                      </div>
                      {doc.items.length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {doc.items.slice(0, 3).map(item =>
                            item.quantity && item.quantity !== 1
                              ? `${item.quantity}× ${item.name}`
                              : item.name
                          ).join(' · ')}
                          {doc.items.length > 3 && (
                            <span className="text-gray-300 dark:text-gray-600"> +{doc.items.length - 3} more</span>
                          )}
                        </p>
                      )}
                      {/* Amount visible on mobile only */}
                      <p className="sm:hidden text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">
                        {formatCurrency(doc.grandTotal)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(doc.grandTotal)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.items.length} item{doc.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 sm:gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewDocument(doc)}
                        title="Preview"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>

                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(doc)}
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Button>
                      )}

                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                        >
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </Button>

                        {activeMenu === doc.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-700 py-1 z-50">
                              {/* Invoice: Mark as Cleared (only shown when not yet paid) */}
                              {doc.type === 'invoice' && doc.status !== 'paid' && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  onClick={() => handleMarkCleared(doc)}
                                >
                                  <CheckCircleIcon className="w-4 h-4" />Mark as Cleared
                                </button>
                              )}
                              {/* Delivery Note: Mark as Delivered (only shown when not yet delivered) */}
                              {doc.type === 'delivery_note' && doc.status !== 'delivered' && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                                  onClick={() => handleMarkDelivered(doc)}
                                >
                                  <TruckIcon className="w-4 h-4" />Mark as Delivered
                                </button>
                              )}
                              {/* Convert to Invoice (quotations only, once only) */}
                              {doc.type === 'quotation' && !hasBeenConverted(doc, 'invoice') && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center gap-2"
                                  onClick={() => handleConvert(doc, 'invoice')}
                                >
                                  <ArrowRightIcon className="w-4 h-4" />
                                  Convert to Invoice
                                </button>
                              )}
                              {/* Create Purchase Order (quotations only, once only) */}
                              {doc.type === 'quotation' && !hasBeenConverted(doc, 'purchase_order') && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center gap-2"
                                  onClick={() => handleConvert(doc, 'purchase_order')}
                                >
                                  <ArrowRightIcon className="w-4 h-4" />
                                  Create Purchase Order
                                </button>
                              )}
                              {/* Purchase Order: Mark as Sent (only shown when not yet sent) */}
                              {doc.type === 'purchase_order' && doc.status !== 'sent' && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  onClick={() => handleMarkSent(doc)}
                                >
                                  <PaperAirplaneIcon className="w-4 h-4" />Mark as Sent
                                </button>
                              )}
                              {/* Create Delivery Note (not for delivery notes or purchase orders, once only) */}
                              {doc.type !== 'delivery_note' && doc.type !== 'purchase_order' && !hasBeenConverted(doc, 'delivery_note') && (
                                <button
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-dark-700 flex items-center gap-2"
                                  onClick={() => handleConvert(doc, 'delivery_note')}
                                >
                                  <ArrowRightIcon className="w-4 h-4" />
                                  Create Delivery Note
                                </button>
                              )}
                              <hr className="my-1 border-gray-200 dark:border-dark-700" />
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                onClick={() => {
                                  handleDelete(doc.id);
                                  setActiveMenu(null);
                                }}
                              >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewDocument && previewClient && company && (
        <DocumentPreview
          document={previewDocument}
          company={company}
          client={previewClient}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </div>
  );
}
