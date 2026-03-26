'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserIcon,
  IdentificationIcon,
  TruckIcon,
  MapPinIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCompanyStore } from '@/store';
import { useShipmentsStore } from '@/modules/logistics/store';
import type { Shipment, StatusHistoryEntry, ShipmentStatus, UpdateShipmentStatusData } from '@/modules/logistics/types';
import { SHIPMENT_STATUS_ORDER } from '@/modules/logistics/constants';
import { printWaybill, printDeliveryReceipt } from '@/modules/logistics/utils/waybill';

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-700',
  pending: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-indigo-100 text-indigo-700',
  in_transit: 'bg-yellow-100 text-yellow-700',
  arrived: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_ICON_COLORS: Record<string, string> = {
  registered: 'bg-gray-400',
  pending: 'bg-gray-400',
  processing: 'bg-blue-500',
  dispatched: 'bg-indigo-500',
  in_transit: 'bg-yellow-500',
  arrived: 'bg-purple-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export default function ShipmentDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { getShipment, getHistory, updateStatus } = useShipmentsStore();
  const companyName = useCompanyStore(s => s.company?.name);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showReceiptPrompt, setShowReceiptPrompt] = useState(false);

  const loadData = async () => {
    if (!code) return;
    try {
      const [s, h] = await Promise.all([getShipment(code), getHistory(code)]);
      setShipment(s);
      setHistory(h);
    } catch {
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleStatusUpdated = async (wasDelivered: boolean) => {
    setShowStatusModal(false);
    await loadData();
    if (wasDelivered) {
      setShowReceiptPrompt(true);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!shipment) return <div className="p-8 text-center text-gray-500">Shipment not found</div>;

  // Build status pipeline
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(shipment.status as any);

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title={shipment.trackingCode}
          subtitle={`${shipment.origin} → ${shipment.destination}`}
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => printWaybill(shipment, companyName)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-purple-700 transition"
              >
                <PrinterIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Print Waybill</span>
              </button>
              {shipment.status !== 'delivered' && shipment.status !== 'cancelled' && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <TruckIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Update Status</span>
                </button>
              )}
              <Link href="/logistics/shipments">
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span>
                </button>
              </Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
          {/* Status Pipeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Shipment Progress</h3>
            <div className="flex items-center justify-between">
              {SHIPMENT_STATUS_ORDER.map((status, i) => {
                const reached = i <= currentIdx;
                const isCurrent = status === shipment.status;
                return (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrent ? `${STATUS_ICON_COLORS[status]} ring-4 ring-offset-2 ring-blue-200` :
                        reached ? STATUS_ICON_COLORS[status] : 'bg-gray-200'
                      }`}>
                        {reached ? (
                          <CheckCircleIcon className="w-5 h-5 text-white" />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <span className={`text-xs capitalize ${isCurrent ? 'font-bold text-gray-900' : 'text-gray-400'}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    {i < SHIPMENT_STATUS_ORDER.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded ${i < currentIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[shipment.status] || ''}`}>
                {shipment.status.replace('_', ' ')}
              </span>
              {shipment.weightKg && <span className="text-sm text-gray-500">{shipment.weightKg} kg</span>}
              {shipment.amount != null && shipment.amount > 0 && (
                <span className="text-sm text-gray-500">K {shipment.amount.toFixed(2)}</span>
              )}
              {shipment.containerId && (
                <Link
                  href={shipment.containerCode ? `/logistics/containers/${shipment.containerCode}` : '#'}
                  className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <CubeIcon className="w-3 h-3" />
                  {shipment.containerName || 'Container'}{shipment.containerCode ? ` (${shipment.containerCode})` : ''}
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Sender
                </h4>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shipment.senderName}</p>
                <p className="text-sm text-gray-500">{shipment.senderPhone}</p>
                {shipment.senderEmail && <p className="text-sm text-gray-500">{shipment.senderEmail}</p>}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Receiver
                </h4>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{shipment.receiverName}</p>
                <p className="text-sm text-gray-500">{shipment.receiverPhone}</p>
                {shipment.receiverEmail && <p className="text-sm text-gray-500">{shipment.receiverEmail}</p>}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Origin
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{shipment.origin}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Destination
                </h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{shipment.destination}</p>
              </div>
            </div>

            {/* Container info */}
            {shipment.containerId && (shipment.containerCode || shipment.containerName) && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-indigo-600 uppercase mb-2 flex items-center gap-1">
                  <CubeIcon className="w-3 h-3" /> Container
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {shipment.containerName && (
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{shipment.containerName}</p>
                    </div>
                  )}
                  {shipment.containerCode && (
                    <div>
                      <p className="text-sm text-gray-500">Code</p>
                      <Link href={`/logistics/containers/${shipment.containerCode}`} className="text-sm font-medium text-indigo-600 hover:underline">
                        {shipment.containerCode}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {shipment.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Description</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{shipment.description}</p>
              </div>
            )}

            {/* Delivery recipient info */}
            {shipment.recipientName && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" /> Delivery Recipient
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-sm font-medium text-gray-900">{shipment.recipientName}</p>
                  </div>
                  {shipment.recipientId && (
                    <div>
                      <p className="text-sm text-gray-500">ID/NRC</p>
                      <p className="text-sm font-medium text-gray-900">{shipment.recipientId}</p>
                    </div>
                  )}
                  {shipment.deliveredAt && (
                    <div>
                      <p className="text-sm text-gray-500">Delivered At</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(shipment.deliveredAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-6 text-xs text-gray-400">
              <span>Created: {new Date(shipment.createdAt).toLocaleString()}</span>
              <span>Updated: {new Date(shipment.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Visual Status Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status History</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No history entries</p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {history.map((h, i) => (
                    <div key={h.id} className="relative flex items-start gap-4 pl-10">
                      <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 border-white ${STATUS_ICON_COLORS[h.status] || 'bg-gray-400'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}`}>
                            {h.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        {h.note && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{h.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <StatusUpdateModal
            shipment={shipment}
            currentStatusIndex={currentIdx}
            onClose={() => setShowStatusModal(false)}
            onUpdated={handleStatusUpdated}
          />
        )}

        {/* Receipt Prompt */}
        {showReceiptPrompt && (
          <ReceiptPromptModal
            shipment={shipment}
            onClose={() => setShowReceiptPrompt(false)}
          />
        )}
      </div>
    </ModuleGuard>
  );
}

// ─── STATUS UPDATE MODAL ───

function StatusUpdateModal({
  shipment,
  currentStatusIndex,
  onClose,
  onUpdated,
}: {
  shipment: Shipment;
  currentStatusIndex: number;
  onClose: () => void;
  onUpdated: (wasDelivered: boolean) => void;
}) {
  const { updateStatus } = useShipmentsStore();
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | ''>('');
  const [note, setNote] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDelivery = selectedStatus === 'delivered';

  // Available statuses: only forward from current
  const availableStatuses = SHIPMENT_STATUS_ORDER.filter(
    (_s, i) => i > currentStatusIndex
  );

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError('');
    try {
      const data: UpdateShipmentStatusData = {
        status: selectedStatus as ShipmentStatus,
        note: note || undefined,
      };
      if (isDelivery) {
        if (!recipientName.trim()) {
          setError('Recipient name is required for delivery');
          setSubmitting(false);
          return;
        }
        data.recipientName = recipientName;
        data.recipientId = recipientId || undefined;
        data.deliveryTime = new Date().toISOString();
      }
      await updateStatus(shipment.trackingCode, data);
      onUpdated(isDelivery);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Update Shipment Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Status selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as ShipmentStatus)}
                  className={`px-3 py-2 text-sm rounded-lg border transition capitalize ${
                    selectedStatus === status
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add a note about this status change..."
            />
          </div>

          {/* Delivery recipient fields */}
          {isDelivery && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4" />
                Delivery Recipient Details
              </h4>
              <div>
                <label className="block text-sm text-green-700 mb-1">
                  <UserIcon className="w-3 h-3 inline mr-1" />
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  placeholder="Full name of person receiving"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-green-700 mb-1">
                  <IdentificationIcon className="w-3 h-3 inline mr-1" />
                  ID/NRC Number
                </label>
                <input
                  type="text"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  placeholder="National ID or NRC number"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStatus || submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── RECEIPT PROMPT MODAL ───

function ReceiptPromptModal({
  shipment,
  onClose,
}: {
  shipment: Shipment;
  onClose: () => void;
}) {
  const handlePrintReceipt = () => {
    printDeliveryReceipt(shipment);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Shipment Delivered!</h3>
        <p className="text-sm text-gray-600 mb-6">
          {shipment.trackingCode} has been marked as delivered.
          Would you like to print a delivery receipt?
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={handlePrintReceipt}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
