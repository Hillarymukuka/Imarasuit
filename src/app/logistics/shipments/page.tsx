'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  EyeIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  PrinterIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCompanyStore } from '@/store';
import { useShipmentsStore } from '@/modules/logistics/store';
import type { Shipment, ShipmentStatus, UpdateShipmentStatusData } from '@/modules/logistics/types';
import { SHIPMENT_STATUS_ORDER } from '@/modules/logistics/constants';
import { printWaybill } from '@/modules/logistics/utils/waybill';

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  dispatched: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  in_transit: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  arrived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function getNextStatus(current: string): string | null {
  const idx = SHIPMENT_STATUS_ORDER.indexOf(current as any);
  if (idx < 0 || idx >= SHIPMENT_STATUS_ORDER.length - 1) return null;
  return SHIPMENT_STATUS_ORDER[idx + 1];
}

export default function ShipmentsPage() {
  const { shipments, loading, fetchShipments, updateStatus, deleteShipment } = useShipmentsStore();
  const companyName = useCompanyStore(s => s.company?.name);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  useEffect(() => {
    fetchShipments({ search: search || undefined, status: statusFilter || undefined });
  }, [fetchShipments, search, statusFilter]);

  const handleQuickAdvance = async (shipment: Shipment) => {
    const next = getNextStatus(shipment.status);
    if (!next) return;
    setUpdatingCode(shipment.trackingCode);
    try {
      await updateStatus(shipment.trackingCode, { status: next as ShipmentStatus });
      await fetchShipments({ search: search || undefined, status: statusFilter || undefined });
    } catch {
      // silently fail, user can retry
    } finally {
      setUpdatingCode(null);
    }
  };

  const totalCount = shipments.length;

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title="Shipments"
          subtitle={`Track and manage all shipments${totalCount > 0 ? ` (${totalCount})` : ''}`}
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => fetchShipments({ search: search || undefined, status: statusFilter || undefined })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 p-1.5 sm:px-3 sm:py-2 text-sm hover:bg-gray-50 transition"
                title="Refresh"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/logistics/shipments/new">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                  <PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> New Shipment</span>
                </button>
              </Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tracking code, sender, receiver..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="registered">Registered</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="arrived">Arrived</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading && shipments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                Loading shipments...
              </div>
            ) : shipments.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <p className="text-lg font-medium">No shipments found</p>
                <p className="text-sm mt-1">Create your first shipment to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Tracking Code</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Sender → Receiver</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Route</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Amount</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {shipments.map((s) => {
                      const next = getNextStatus(s.status);
                      const isUpdating = updatingCode === s.trackingCode;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                          <td className="px-4 py-3">
                            <Link href={`/logistics/shipments/${s.trackingCode}`}
                              className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              {s.trackingCode}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-gray-700 dark:text-gray-300 text-xs">
                              <span className="font-medium">{s.senderName}</span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="font-medium">{s.receiverName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {s.origin} → {s.destination}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>
                                {s.status.replace('_', ' ')}
                              </span>
                              {next && (
                                <button
                                  onClick={() => handleQuickAdvance(s)}
                                  disabled={isUpdating}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                  title={`Advance to ${next.replace('_', ' ')}`}
                                >
                                  {isUpdating ? (
                                    <ArrowPathIcon className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <ChevronRightIcon className="w-3 h-3" />
                                      {next.replace('_', ' ')}
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                            {s.amount != null && s.amount > 0 ? `K ${s.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => printWaybill(s, companyName)}
                                className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition" title="Print Waybill"
                              >
                                <PrinterIcon className="w-4 h-4 text-purple-500" />
                              </button>
                              <Link href={`/logistics/shipments/${s.trackingCode}`}>
                                <button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition" title="View Details">
                                  <EyeIcon className="w-4 h-4 text-gray-500" />
                                </button>
                              </Link>
                              <button
                                onClick={() => { if (confirm('Delete this shipment?')) deleteShipment(s.trackingCode).then(() => fetchShipments({ search: search || undefined, status: statusFilter || undefined })); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete"
                              >
                                <TrashIcon className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
