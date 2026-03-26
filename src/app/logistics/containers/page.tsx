'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  EyeIcon,
  CubeIcon,
  TruckIcon,
  ArrowPathIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  CogIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
  BanknotesIcon,
  UserIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useContainersStore } from '@/modules/logistics/store';
import type { Container, ContainerStatus, Shipment } from '@/modules/logistics/types';

const STATUS_COLORS: Record<ContainerStatus, string> = {
  loading: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  dispatched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  arrived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CONTAINER_STATUS_ORDER: ContainerStatus[] = ['loading', 'dispatched', 'in_transit', 'arrived', 'delivered'];

function getNextContainerStatus(current: ContainerStatus): ContainerStatus | null {
  const idx = CONTAINER_STATUS_ORDER.indexOf(current);
  if (idx < 0 || idx >= CONTAINER_STATUS_ORDER.length - 1) return null;
  return CONTAINER_STATUS_ORDER[idx + 1];
}

export default function ContainersPage() {
  const { containers, loading, fetchContainers, deleteContainer, updateStatus, addShipments, getAvailableShipments } = useContainersStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [statusModal, setStatusModal] = useState<(Container & { shipmentCount: number }) | null>(null);
  const [addShipmentsModal, setAddShipmentsModal] = useState<(Container & { shipmentCount: number }) | null>(null);

  useEffect(() => {
    fetchContainers({ search: search || undefined, status: statusFilter || undefined });
  }, [fetchContainers, search, statusFilter]);

  const refreshList = () => fetchContainers({ search: search || undefined, status: statusFilter || undefined });

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title="Containers"
          subtitle={`Manage containers and their shipments${containers.length > 0 ? ` (${containers.length})` : ''}`}
          actions={
            <div className="flex gap-2">
              <button
                onClick={refreshList}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 p-1.5 sm:px-3 sm:py-2 text-sm hover:bg-gray-50 transition"
                title="Refresh"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/logistics/containers/new">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-purple-700 transition">
                  <PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> New Container</span>
                </button>
              </Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search containers..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="loading">Loading</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading containers...
            </div>
          ) : containers.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <CubeIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-lg font-medium">No containers found</p>
              <p className="text-sm mt-1">Create your first container to start grouping shipments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {containers.map((c) => {
                const nextStatus = getNextContainerStatus(c.status);
                return (
                  <div key={c.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition">
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs font-medium text-purple-600 dark:text-purple-400">{c.containerCode}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status]}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Name & Route */}
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{c.origin} → {c.destination}</p>

                      {/* Vehicle & Driver Info */}
                      <div className="mt-3 space-y-1">
                        {(c.vehicleType || c.vehicleNumber) && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <TruckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{[c.vehicleType, c.vehicleNumber].filter(Boolean).join(' - ')}</span>
                          </div>
                        )}
                        {c.driverName && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                            <UserIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{c.driverName}</span>
                          </div>
                        )}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <CubeIcon className="w-3.5 h-3.5" />
                          <span>{c.shipmentCount} shipment{c.shipmentCount !== 1 ? 's' : ''}</span>
                        </div>
                        {(c.totalWeight ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <ScaleIcon className="w-3.5 h-3.5" />
                            <span>{c.totalWeight} kg</span>
                          </div>
                        )}
                        {(c.totalAmount ?? 0) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <BanknotesIcon className="w-3.5 h-3.5" />
                            <span>K {c.totalAmount?.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex border-t border-gray-100 dark:border-gray-700 divide-x divide-gray-100 dark:divide-gray-700">
                      <Link href={`/logistics/containers/${c.containerCode}`} className="flex-1">
                        <button className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition" title="View Details">
                          <EyeIcon className="w-3.5 h-3.5" /> View
                        </button>
                      </Link>
                      {c.status === 'loading' && (
                        <button
                          onClick={() => setAddShipmentsModal(c)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                          title="Add Shipments"
                        >
                          <CogIcon className="w-3.5 h-3.5" /> Manage
                        </button>
                      )}
                      {nextStatus && (
                        <button
                          onClick={() => setStatusModal(c)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
                          title="Update Status"
                        >
                          <PaperAirplaneIcon className="w-3.5 h-3.5" /> Status
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Delete this container?')) deleteContainer(c.containerCode).then(refreshList); }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        title="Delete"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status Update Modal */}
        {statusModal && (
          <ContainerStatusModal
            container={statusModal}
            onClose={() => setStatusModal(null)}
            onUpdated={() => { setStatusModal(null); refreshList(); }}
          />
        )}

        {/* Add Shipments Modal */}
        {addShipmentsModal && (
          <AddShipmentsModal
            container={addShipmentsModal}
            onClose={() => setAddShipmentsModal(null)}
            onAdded={() => { setAddShipmentsModal(null); refreshList(); }}
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
  container: Container;
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

        {/* Current status */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Status</p>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${STATUS_COLORS[container.status]}`}>
            {container.status.replace('_', ' ')}
          </span>
          <p className="text-xs text-gray-500 mt-2">{container.name} &middot; {container.origin} → {container.destination}</p>
        </div>

        <div className="space-y-4">
          {/* New status */}
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

          {/* Note */}
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

          {/* Update shipments toggle */}
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
  container: Container;
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Shipments</h3>
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
              <p className="text-xs mt-1">There are no registered shipments matching this route</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select all */}
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
