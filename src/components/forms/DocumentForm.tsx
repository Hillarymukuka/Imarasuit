'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusIcon, TrashIcon, CalculatorIcon } from '@heroicons/react/24/solid';
import { Button, Input, Textarea, Select, Card, CardContent, CardHeader } from '@/components/ui';
import { useCompanyStore, useClientsStore, useDocumentsStore } from '@/store';
import { 
  DocumentType, 
  Document, 
  LineItem,
  Quotation,
  Invoice,
  PurchaseOrder,
  DeliveryNote,
  TaxType
} from '@/types';
import { 
  formatCurrency, 
  generateId,
  formatDateForInput
} from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS, TAX_OPTIONS, TAX_RATES, DEFAULT_TERMS, DEFAULT_NOTES } from '@/lib/constants';

const lineItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be positive'),
});

const documentSchema = z.object({
  clientId: z.string().min(1, 'Please select a client'),
  referenceNumber: z.string().optional(),
  dueDate: z.string().optional(),
  validUntil: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'At least one item is required'),
  taxType: z.enum(['none', 'vat', 'tot']).default('none'),
  discount: z.coerce.number().min(0).default(0),
  discountType: z.enum(['percentage', 'fixed']).default('fixed'),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentFormProps {
  documentType: DocumentType;
  existingDocument?: Document;
  onSuccess?: (document: Document) => void;
  onCancel?: () => void;
}

export function DocumentForm({ 
  documentType, 
  existingDocument, 
  onSuccess, 
  onCancel 
}: DocumentFormProps) {
  const { company } = useCompanyStore();
  const { clients } = useClientsStore();
  const documentsStore = useDocumentsStore();

  const getDefaultValues = (): Partial<DocumentFormData> => {
    if (existingDocument) {
      return {
        clientId: existingDocument.clientId,
        referenceNumber: existingDocument.referenceNumber,
        items: existingDocument.items.map(item => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        taxType: existingDocument.taxType || 'none',
        discount: existingDocument.discount,
        discountType: existingDocument.discountType,
        notes: existingDocument.notes,
        terms: existingDocument.terms,
        dueDate: (existingDocument as Invoice).dueDate ? 
          formatDateForInput((existingDocument as Invoice).dueDate) : undefined,
        validUntil: (existingDocument as Quotation).validUntil ? 
          formatDateForInput((existingDocument as Quotation).validUntil) : undefined,
        expectedDeliveryDate: (existingDocument as PurchaseOrder).expectedDeliveryDate ?
          formatDateForInput((existingDocument as PurchaseOrder).expectedDeliveryDate!) : undefined,
        deliveryDate: (existingDocument as DeliveryNote).deliveryDate ?
          formatDateForInput((existingDocument as DeliveryNote).deliveryDate) : undefined,
      };
    }
    
    return {
      items: [{ name: '', description: '', quantity: 1, unitPrice: 0 }],
      taxType: 'none',
      discount: 0,
      discountType: 'fixed',
      notes: DEFAULT_NOTES,
      terms: DEFAULT_TERMS,
    };
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: getDefaultValues(),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchDiscount = watch('discount');
  const watchDiscountType = watch('discountType');
  const watchTaxType = watch('taxType');

  // Compute totals inline so they update instantly on every render
  const computedSubtotal = (watchItems || []).reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }, 0);
  const computedTaxRate = TAX_RATES[watchTaxType as TaxType] || 0;
  const computedTaxTotal = computedSubtotal * (computedTaxRate / 100);
  const computedDiscount = Number(watchDiscount) || 0;
  const computedDiscountAmount = watchDiscountType === 'percentage'
    ? (computedSubtotal + computedTaxTotal) * (computedDiscount / 100)
    : computedDiscount;
  const computedGrandTotal = Math.max(0, computedSubtotal + computedTaxTotal - computedDiscountAmount);

  const totals = {
    subtotal: computedSubtotal,
    taxTotal: computedTaxTotal,
    discountAmount: computedDiscountAmount,
    grandTotal: computedGrandTotal,
  };

  const onSubmit = async (data: DocumentFormData) => {
    if (!company) {
      alert('Please set up your company profile first');
      return;
    }

    const lineItems: LineItem[] = data.items.map(item => ({
      id: generateId(),
      name: item.name,
      description: item.description || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const taxRate = TAX_RATES[data.taxType as TaxType] || 0;

    let document: Document;

    switch (documentType) {
      case 'quotation':
        document = await documentsStore.createQuotation({
          companyId: company.id,
          clientId: data.clientId,
          items: lineItems,
          taxType: data.taxType,
          taxPercent: taxRate,
          discount: data.discount,
          discountType: data.discountType,
          notes: data.notes,
          terms: data.terms,
          referenceNumber: data.referenceNumber,
          validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : undefined,
        });
        break;
      
      case 'invoice':
        if (!data.dueDate) {
          alert('Due date is required for invoices');
          return;
        }
        document = await documentsStore.createInvoice({
          companyId: company.id,
          clientId: data.clientId,
          items: lineItems,
          taxType: data.taxType,
          taxPercent: taxRate,
          discount: data.discount,
          discountType: data.discountType,
          notes: data.notes,
          terms: data.terms,
          referenceNumber: data.referenceNumber,
          dueDate: new Date(data.dueDate).toISOString(),
        });
        break;
      
      case 'purchase_order':
        document = await documentsStore.createPurchaseOrder({
          companyId: company.id,
          clientId: data.clientId,
          items: lineItems,
          taxType: data.taxType,
          taxPercent: taxRate,
          discount: data.discount,
          discountType: data.discountType,
          notes: data.notes,
          terms: data.terms,
          referenceNumber: data.referenceNumber,
          expectedDeliveryDate: data.expectedDeliveryDate ? 
            new Date(data.expectedDeliveryDate).toISOString() : undefined,
        });
        break;
      
      case 'delivery_note':
        document = await documentsStore.createDeliveryNote({
          companyId: company.id,
          clientId: data.clientId,
          items: lineItems,
          taxType: data.taxType,
          taxPercent: taxRate,
          discount: data.discount,
          discountType: data.discountType,
          notes: data.notes,
          terms: data.terms,
          referenceNumber: data.referenceNumber,
          deliveryDate: data.deliveryDate ? 
            new Date(data.deliveryDate).toISOString() : 
            new Date().toISOString(),
        });
        break;
    }

    onSuccess?.(document);
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name,
  }));

  const taxTypeOptions = TAX_OPTIONS.map(opt => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Client Selection */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {DOCUMENT_TYPE_LABELS[documentType]} Details
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select
            label="Client"
            {...register('clientId')}
            options={clientOptions}
            placeholder="Select a client"
            error={errors.clientId?.message}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Reference Number (optional)"
              {...register('referenceNumber')}
              placeholder="e.g., PO-12345"
            />
            
            {documentType === 'invoice' && (
              <Input
                label="Due Date"
                type="date"
                {...register('dueDate')}
                error={errors.dueDate?.message}
              />
            )}
            
            {documentType === 'quotation' && (
              <Input
                label="Valid Until"
                type="date"
                {...register('validUntil')}
              />
            )}
            
            {documentType === 'purchase_order' && (
              <Input
                label="Expected Delivery Date"
                type="date"
                {...register('expectedDeliveryDate')}
              />
            )}
            
            {documentType === 'delivery_note' && (
              <Input
                label="Delivery Date"
                type="date"
                {...register('deliveryDate')}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Items
          </h3>
        </CardHeader>
        <CardContent className="space-y-0 px-0 py-0">
          {/* Table Header - visible on md+ */}
          <div className="hidden md:grid md:grid-cols-[32px_1fr_1fr_90px_110px_90px_36px] gap-2 px-4 py-2.5 bg-gray-50 dark:bg-dark-900 border-b border-gray-200 dark:border-dark-600">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">#</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Item Name</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Qty</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Unit Price</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Total</span>
            <span></span>
          </div>

          {/* Item Rows - single set of inputs, responsive grid */}
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {fields.map((field, index) => {
              const lineTotal = (Number(watchItems?.[index]?.quantity) || 0) * (Number(watchItems?.[index]?.unitPrice) || 0);
              return (
                <div
                  key={field.id}
                  className="px-4 py-3 group hover:bg-gray-50/50 dark:hover:bg-dark-800/50 transition-colors"
                >
                  {/* Responsive grid: 2-col on mobile, 7-col on desktop */}
                  <div className="grid grid-cols-2 md:grid-cols-[32px_1fr_1fr_90px_110px_90px_36px] gap-x-2 gap-y-2 items-start">

                    {/* Row number — desktop only (hidden on mobile) */}
                    <div className="hidden md:flex items-center pt-2 text-sm text-gray-400 font-medium">
                      {index + 1}
                    </div>

                    {/* Item Name */}
                    <div>
                      <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                        Item {index + 1} — Name
                      </p>
                      <Input
                        {...register(`items.${index}.name`)}
                        placeholder="Item name"
                        error={errors.items?.[index]?.name?.message}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">
                        Description
                      </p>
                      <Input
                        {...register(`items.${index}.description`)}
                        placeholder="Description (optional)"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Qty</p>
                      <Input
                        {...register(`items.${index}.quantity`)}
                        type="number"
                        min="1"
                        className="text-right"
                        error={errors.items?.[index]?.quantity?.message}
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Unit Price</p>
                      <Input
                        {...register(`items.${index}.unitPrice`)}
                        type="number"
                        step="0.01"
                        min="0"
                        className="text-right"
                        error={errors.items?.[index]?.unitPrice?.message}
                      />
                    </div>

                    {/* Line Total */}
                    <div>
                      <p className="md:hidden text-xs text-gray-500 dark:text-gray-400 mb-1 font-medium">Total</p>
                      <div className="h-[38px] flex items-center justify-end px-3 bg-gray-50 dark:bg-dark-900 rounded-lg border border-gray-100 dark:border-dark-700">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="flex items-center justify-end md:justify-center pt-1">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-60 group-hover:opacity-100 transition-all"
                          title="Remove item"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Item */}
          <div className="border-t border-dashed border-gray-200 dark:border-dark-600">
            <button
              type="button"
              onClick={() => append({ name: '', description: '', quantity: 1, unitPrice: 0 })}
              className="w-full flex items-center gap-2 px-5 py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors duration-150 rounded-b-xl"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add new item</span>
            </button>
          </div>

          {errors.items?.message && (
            <p className="text-sm text-red-500 px-5 pb-3">{errors.items.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Tax, Discount & Summary */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalculatorIcon className="w-5 h-5" />
            Summary
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Tax Type Selection */}
              <Select
                label="Tax Type"
                {...register('taxType')}
                options={taxTypeOptions}
              />
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    label="Discount"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('discount')}
                  />
                </div>
                <div className="w-32">
                  <Select
                    label="Type"
                    {...register('discountType')}
                    options={[
                      { value: 'fixed', label: 'Fixed (K)' },
                      { value: 'percentage', label: 'Percent (%)' },
                    ]}
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Tax ({TAX_OPTIONS.find(t => t.value === watchTaxType)?.label || 'No Tax'})
                </span>
                <span className="font-medium">{formatCurrency(totals.taxTotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.discountAmount)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-dark-600 pt-2 mt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notes & Terms
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            label="Notes"
            {...register('notes')}
            placeholder="Additional notes for the client..."
          />
          <Textarea
            label="Terms & Conditions"
            {...register('terms')}
            placeholder="Payment terms, conditions, etc..."
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
          {existingDocument ? 'Update' : 'Create'} {DOCUMENT_TYPE_LABELS[documentType]}
        </Button>
      </div>
    </form>
  );
}
