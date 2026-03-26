'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowDownTrayIcon, 
  PencilIcon, 
  CheckIcon, 
  XMarkIcon, 
  DocumentTextIcon,
  ArrowPathIcon,
  EnvelopeIcon
} from '@heroicons/react/24/solid';
import { Button, Card, CardContent, CardHeader, Input, Textarea } from '@/components/ui';
import { Document, CompanyProfile, Client, Invoice, Quotation, PurchaseOrder, DeliveryNote } from '@/types';
import { generateDocumentPDF, downloadPDF } from '@/lib/pdf-generator';
import { formatCurrency, formatDate, formatDateForInput } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { useDocumentsStore, usePDFSettingsStore } from '@/store';
import { EmailModal } from './EmailModal';

interface DocumentPreviewProps {
  document: Document;
  company: CompanyProfile;
  client: Client;
  onClose?: () => void;
}

interface EditableFields {
  notes: string;
  terms: string;
  dueDate?: string;
  validUntil?: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
}

export function DocumentPreview({ document, company, client, onClose }: DocumentPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [editableFields, setEditableFields] = useState<EditableFields>({
    notes: document.notes || '',
    terms: document.terms || '',
    dueDate: (document as Invoice).dueDate ? formatDateForInput((document as Invoice).dueDate) : undefined,
    validUntil: (document as Quotation).validUntil ? formatDateForInput((document as Quotation).validUntil) : undefined,
    deliveryDate: (document as DeliveryNote).deliveryDate ? formatDateForInput((document as DeliveryNote).deliveryDate) : undefined,
    expectedDeliveryDate: (document as PurchaseOrder).expectedDeliveryDate ? formatDateForInput((document as PurchaseOrder).expectedDeliveryDate!) : undefined,
  });
  
  const { updateDocument } = useDocumentsStore();
  const { settings: pdfSettings } = usePDFSettingsStore();

  const generatePDF = async (doc: Document = document) => {
    setIsGenerating(true);
    try {
      const blob = await generateDocumentPDF({ document: doc, company, client, pdfSettings });
      const url = URL.createObjectURL(blob);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      setPdfUrl(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate PDF when settings change (color scheme, logo settings, etc.)
  useEffect(() => {
    generatePDF();
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfSettings.selectedColorId, pdfSettings.showLogo, pdfSettings.logoSize, pdfSettings.showBankInfo, pdfSettings.showTerms, pdfSettings.footerText, pdfSettings.customColors.length]);

  const handleDownload = async () => {
    const blob = await generateDocumentPDF({ document, company, client, pdfSettings });
    const clientSlug = client.name.replace(/\s+/g, '_');
    downloadPDF(blob, `${document.documentNumber}_${clientSlug}.pdf`);
  };

  const handleSaveChanges = async () => {
    const updates: Partial<Document> = {
      notes: editableFields.notes,
      terms: editableFields.terms,
    };

    if (document.type === 'invoice' && editableFields.dueDate) {
      (updates as Partial<Invoice>).dueDate = new Date(editableFields.dueDate).toISOString();
    }
    if (document.type === 'quotation' && editableFields.validUntil) {
      (updates as Partial<Quotation>).validUntil = new Date(editableFields.validUntil).toISOString();
    }
    if (document.type === 'delivery_note' && editableFields.deliveryDate) {
      (updates as Partial<DeliveryNote>).deliveryDate = new Date(editableFields.deliveryDate).toISOString();
    }
    if (document.type === 'purchase_order' && editableFields.expectedDeliveryDate) {
      (updates as Partial<PurchaseOrder>).expectedDeliveryDate = new Date(editableFields.expectedDeliveryDate).toISOString();
    }

    updateDocument(document.id, updates);
    
    // Regenerate PDF with updated document
    const updatedDoc = { ...document, ...updates } as Document;
    await generatePDF(updatedDoc);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 sm:p-4 overflow-hidden">
        {/* PDF Preview */}
        <div className="flex-1 bg-white dark:bg-dark-900 rounded-xl overflow-hidden flex flex-col min-h-0">
          {/* Header: title left, action buttons right — icon-only on mobile */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-dark-700 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <DocumentTextIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600 flex-shrink-0" />
              <h2 className="text-sm sm:text-lg font-semibold truncate">
                {DOCUMENT_TYPE_LABELS[document.type]} - {document.documentNumber}
              </h2>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatePDF()}
                isLoading={isGenerating}
                title="Refresh PDF"
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailModal(true)}
                title="Send by email"
              >
                <EnvelopeIcon className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Email</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline ml-1.5">Download</span>
              </Button>
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose} title="Close">
                  <XMarkIcon className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-gray-100 dark:bg-dark-950 p-3 sm:p-4 overflow-auto">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full min-h-[280px] sm:min-h-[420px] lg:min-h-[600px] bg-white rounded-lg shadow-lg"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Edit Panel */}
        <div className="w-full lg:w-96 bg-white dark:bg-dark-800 rounded-xl overflow-auto flex-shrink-0 max-h-[45vh] lg:max-h-none">
          <div className="p-4 border-b border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Document Details</h3>
              <Button
                variant={isEditing ? 'primary' : 'outline'}
                size="sm"
                onClick={() => isEditing ? handleSaveChanges() : setIsEditing(true)}
                leftIcon={isEditing ? <CheckIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
              >
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
          </div>

          <div className="p-4 space-y-6">
            {/* Document Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Document Info</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Number:</span>
                <span className="font-medium">{document.documentNumber}</span>
                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                <span>{formatDate(document.dateIssued)}</span>
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="capitalize">{document.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Date Fields */}
            {document.type === 'invoice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editableFields.dueDate}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm">{formatDate((document as Invoice).dueDate)}</p>
                )}
              </div>
            )}

            {document.type === 'quotation' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valid Until
                </label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editableFields.validUntil}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, validUntil: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm">{formatDate((document as Quotation).validUntil)}</p>
                )}
              </div>
            )}

            {/* Client Info */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Client</h4>
              <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-3">
                <p className="font-medium">{client.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{client.contactPerson}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{client.email}</p>
              </div>
            </div>

            {/* Items Summary */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Items ({document.items.length})</h4>
              <div className="space-y-2 max-h-40 overflow-auto">
                {document.items.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 dark:bg-dark-900 rounded-lg p-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.name}</span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 bg-gray-50 dark:bg-dark-900 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span>{formatCurrency(document.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax</span>
                <span>{formatCurrency(document.taxTotal)}</span>
              </div>
              {document.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(
                    document.discountType === 'percentage' 
                      ? (document.subtotal + document.taxTotal) * (document.discount / 100)
                      : document.discount
                  )}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-dark-700 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatCurrency(document.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              {isEditing ? (
                <Textarea
                  value={editableFields.notes}
                  onChange={(e) => setEditableFields(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {document.notes || 'No notes'}
                </p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms & Conditions
              </label>
              {isEditing ? (
                <Textarea
                  value={editableFields.terms}
                  onChange={(e) => setEditableFields(prev => ({ ...prev, terms: e.target.value }))}
                  className="min-h-[80px]"
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {document.terms || 'No terms specified'}
                </p>
              )}
            </div>

            {isEditing && (
              <div className="flex gap-2 pt-4">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleSaveChanges}
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Modal */}
      <EmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        document={document}
        company={company}
        client={client}
      />
    </div>
  );
}
