'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClockIcon,
  CubeIcon,
  TruckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  PrinterIcon,
  ScaleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCompanyStore } from '@/store';
import { useContainersStore } from '@/modules/logistics/store';
import type { ContainerDetail, ContainerStatus, Shipment } from '@/modules/logistics/types';

const CONTAINER_STATUS_ORDER: ContainerStatus[] = ['loading', 'dispatched', 'in_transit', 'arrived', 'delivered'];

const NEXT_STATUS: Record<string, ContainerStatus> = {
  loading: 'dispatched', dispatched: 'in_transit', in_transit: 'arrived', arrived: 'delivered',
};

const STATUS_COLORS: Record<string, string> = {
  loading: 'bg-yellow-100 text-yellow-700', dispatched: 'bg-indigo-100 text-indigo-700',
  in_transit: 'bg-blue-100 text-blue-700', arrived: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

const STATUS_DOT_COLORS: Record<string, string> = {
  loading: 'bg-yellow-400', dispatched: 'bg-indigo-500',
  in_transit: 'bg-blue-500', arrived: 'bg-purple-500',
  delivered: 'bg-green-500', cancelled: 'bg-red-500',
};

const SHIPMENT_STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-700',
  pending: 'bg-gray-100 text-gray-700', processing: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-indigo-100 text-indigo-700', in_transit: 'bg-yellow-100 text-yellow-700',
  arrived: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ContainerDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { getContainer, updateStatus, removeShipments, addShipments, getAvailableShipments } = useContainersStore();
  const [container, setContainer] = useState<ContainerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAddShipments, setShowAddShipments] = useState(false);
  const [removingCode, setRemovingCode] = useState<string | null>(null);

  const load = async () => {
    if (!code) return;
    try { setContainer(await getContainer(code)); } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, [code]);

  const handleRemoveShipment = async (trackingCode: string) => {
    if (!container || !confirm('Remove this shipment from the container?')) return;
    setRemovingCode(trackingCode);
    try {
      await removeShipments(container.containerCode, [trackingCode]);
      await load();
    } catch { }
    setRemovingCode(null);
  };

  if (loading) return <div className="p-8 text-center text-gray-500"><ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</div>;
  if (!container) return <div className="p-8 text-center text-gray-500">Container not found</div>;

  const next = NEXT_STATUS[container.status];
  const currentIdx = CONTAINER_STATUS_ORDER.indexOf(container.status);
  const totalWeight = container.shipments.reduce((sum, s) => sum + (s.weightKg || 0), 0);
  const totalAmount = container.shipments.reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title={container.containerCode}
          subtitle={`${container.name} — ${container.origin} → ${container.destination}`}
          actions={
            <div className="flex gap-2">
              {container.status === 'loading' && (
                <button
                  onClick={() => setShowAddShipments(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Add Shipments</span>
                </button>
              )}
              {next && (
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-purple-700 transition"
                >
                  <PaperAirplaneIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Update Status</span>
                </button>
              )}
              <Link href="/logistics/containers"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
          {/* Status Pipeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Container Progress</h3>
            <div className="flex items-center justify-between">
              {CONTAINER_STATUS_ORDER.map((status, i) => {
                const reached = i <= currentIdx;
                const isCurrent = status === container.status;
                return (
                  <React.Fragment key={status}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrent ? `${STATUS_DOT_COLORS[status]} ring-4 ring-offset-2 ring-purple-200` :
                        reached ? STATUS_DOT_COLORS[status] : 'bg-gray-200'
                      }`}>
                        {reached ? (
                          <CheckIcon className="w-5 h-5 text-white" />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-gray-400" />
                        )}
                      </div>
                      <span className={`text-xs capitalize ${isCurrent ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    {i < CONTAINER_STATUS_ORDER.length - 1 && (
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
              <TruckIcon className="w-5 h-5 text-purple-500" />
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[container.status]}`}>{container.status.replace('_', ' ')}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              {container.vehicleType && <div><span className="text-gray-500 dark:text-gray-400">Vehicle Type</span><p className="font-medium text-gray-900 dark:text-white">{container.vehicleType}</p></div>}
              {container.vehicleNumber && <div><span className="text-gray-500 dark:text-gray-400">Vehicle #</span><p className="font-medium text-gray-900 dark:text-white">{container.vehicleNumber}</p></div>}
              {container.driverName && <div><span className="text-gray-500 dark:text-gray-400">Driver</span><p className="font-medium text-gray-900 dark:text-white">{container.driverName}</p></div>}
              {container.driverPhone && <div><span className="text-gray-500 dark:text-gray-400">Driver Phone</span><p className="font-medium text-gray-900 dark:text-white">{container.driverPhone}</p></div>}
            </div>
            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CubeIcon className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{container.shipmentCount}</span> shipments
              </div>
              {totalWeight > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <ScaleIcon className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">{totalWeight.toFixed(1)}</span> kg
                </div>
              )}
              {totalAmount > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <BanknotesIcon className="w-4 h-4 text-green-500" />
                  K <span className="font-medium">{totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shipments */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><CubeIcon className="w-5 h-5 text-blue-500" /> Shipments</h3>
                {container.status === 'loading' && (
                  <button
                    onClick={() => setShowAddShipments(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition"
                  >
                    <PlusIcon className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              {container.shipments.length === 0 ? (
                <div className="py-6 text-center text-gray-500 dark:text-gray-400">
                  <CubeIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm">No shipments in this container</p>
                  {container.status === 'loading' && (
                    <button
                      onClick={() => setShowAddShipments(true)}
                      className="mt-2 text-sm text-blue-600 hover:underline"
                    >
                      Add shipments now
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {container.shipments.map(s => (
                    <div key={s.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition group">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/logistics/shipments/${s.trackingCode}`}>
                          <span className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline">{s.trackingCode}</span>
                        </Link>
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${SHIPMENT_STATUS_COLORS[s.status]}`}>{s.status.replace('_', ' ')}</span>
                          <button
                            onClick={async () => { const { printWaybill } = await import('@/modules/logistics/utils/waybill'); printWaybill(s, useCompanyStore.getState().company?.name); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                            title="Print Waybill"
                          >
                            <PrinterIcon className="w-3.5 h-3.5 text-purple-500" />
                          </button>
                          {container.status === 'loading' && (
                            <button
                              onClick={() => handleRemoveShipment(s.trackingCode)}
                              disabled={removingCode === s.trackingCode}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                              title="Remove from container"
                            >
                              {removingCode === s.trackingCode ? (
                                <ArrowPathIcon className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                              ) : (
                                <TrashIcon className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{s.senderName} → {s.receiverName}</p>
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        {s.weightKg ? <span>{s.weightKg} kg</span> : null}
                        {s.amount != null && s.amount > 0 ? <span>K {s.amount.toFixed(2)}</span> : null}
                        {s.description ? <span className="truncate">{s.description}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-gray-400" /> Status History</h3>
              {container.statusHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No history</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-4">
                    {container.statusHistory.map(h => (
                      <div key={h.id} className="relative flex items-start gap-4 pl-10">
                        <div className={`absolute left-2.5 top-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${STATUS_DOT_COLORS[h.status] || 'bg-gray-400'}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}`}>{h.status.replace('_', ' ')}</span>
                            <span className="text-xs text-gray-400">{new Date(h.timestamp).toLocaleString()}</span>
                          </div>
                          {h.note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{h.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <ContainerStatusModal
            container={container}
            onClose={() => setShowStatusModal(false)}
            onUpdated={() => { setShowStatusModal(false); load(); }}
          />
        )}

        {/* Add Shipments Modal */}
        {showAddShipments && (
          <AddShipmentsModal
            container={container}
            onClose={() => setShowAddShipments(false)}
            onAdded={() => { setShowAddShipments(false); load(); }}
          />
        )}
      </div>
    </ModuleGuard>
  );
}

// ─── CONTAINER STATUS UPDATE MODAL ───

function ContainerStatusModal({
  container,
  onClose,
  onUpdated,
}: {
  container: ContainerDetail;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { updateStatus } = useContainersStore();
  const currentIdx = CONTAINER_STATUS_ORDER.indexOf(container.status);
  const availableStatuses = CONTAINER_STATUS_ORDER.filter((_, i) => i > currentIdx);

  const [selectedStatus, setSelectedStatus] = useState<ContainerStatus | ''>(availableStatuses[0] || '');
  const [note, setNote] = useState('');
  const [updateShipments, setUpdateShipments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selectedStatus) return;
    setSubmitting(true);
    setError('');
    try {
      await updateStatus(container.containerCode, selectedStatus, note || undefined, updateShipments);
      onUpdated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update Container Status</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Status</p>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[container.status]}`}>
            {container.status.replace('_', ' ')}
          </span>
          <p className="text-xs text-gray-500 mt-2">{container.shipmentCount} shipment{container.shipmentCount !== 1 ? 's' : ''} in container</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Status</label>
            <div className="grid grid-cols-2 gap-2">
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 py-2 text-sm rounded-lg border transition capitalize ${
                    selectedStatus === status
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 font-medium'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Add a note about this status change..."
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={updateShipments}
              onChange={(e) => setUpdateShipments(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Update all shipment statuses</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Also advance all shipments in this container to the new status</p>
            </div>
          </label>

          {error && (
            <div className="text-sm text-red-600 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={!selectedStatus || submitting}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Updating...' : `Update to ${selectedStatus ? selectedStatus.replace('_', ' ') : '...'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADD SHIPMENTS MODAL ───

function AddShipmentsModal({
  container,
  onClose,
  onAdded,
}: {
  container: ContainerDetail;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { addShipments, getAvailableShipments } = useContainersStore();
  const [available, setAvailable] = useState<Shipment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const shipments = await getAvailableShipments(container.containerCode);
        setAvailable(shipments);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingShipments(false);
      }
    })();
  }, [container.containerCode, getAvailableShipments]);

  const toggleSelect = (trackingCode: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(trackingCode)) next.delete(trackingCode);
      else next.add(trackingCode);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === available.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(available.map(s => s.trackingCode)));
    }
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await addShipments(container.containerCode, Array.from(selected));
      onAdded();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Shipments to Container</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Showing registered shipments from <strong>{container.origin}</strong> to <strong>{container.destination}</strong>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-3">
          {loadingShipments ? (
            <div className="py-8 text-center text-gray-500">
              <ArrowPathIcon className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading available shipments...
            </div>
          ) : available.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <CubeIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="font-medium">No available shipments</p>
              <p className="text-xs mt-1">No registered shipments match this container&apos;s route</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={toggleAll}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selected.size === available.length ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selected.size === available.length && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                Select All ({available.length} shipments)
              </button>

              {available.map((s) => (
                <button
                  key={s.trackingCode}
                  onClick={() => toggleSelect(s.trackingCode)}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition text-left ${
                    selected.has(s.trackingCode)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                    selected.has(s.trackingCode) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selected.has(s.trackingCode) && <CheckIcon className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{s.trackingCode}</span>
                      {s.weightKg ? <span className="text-xs text-gray-400">{s.weightKg} kg</span> : null}
                      {s.amount != null && s.amount > 0 ? <span className="text-xs text-gray-400">K {s.amount.toFixed(2)}</span> : null}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{s.senderName} → {s.receiverName}</p>
                    {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="px-6 py-2 text-sm text-red-600 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex justify-end gap-2 p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || submitting}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {submitting ? 'Adding...' : `Add ${selected.size} Shipment${selected.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
