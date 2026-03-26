'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon, FunnelIcon, TrashIcon, EyeIcon, MapPinIcon, ArrowRightCircleIcon, UserIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useDeliveriesStore } from '@/modules/logistics/store';
import type { Delivery, DeliveryStatus } from '@/modules/logistics/types';

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  picked_up: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  in_transit: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  pending: 'assigned', assigned: 'picked_up', picked_up: 'in_transit', in_transit: 'delivered',
};

const NEXT_LABEL: Partial<Record<DeliveryStatus, string>> = {
  pending: 'Assign', assigned: 'Picked Up', picked_up: 'In Transit', in_transit: 'Delivered',
};

export default function DeliveriesPage() {
  const { deliveries, loading, fetchDeliveries, deleteDelivery, updateStatus } = useDeliveriesStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingCode, setUpdatingCode] = useState<string | null>(null);

  const handleQuickAdvance = async (d: Delivery) => {
    const next = NEXT_STATUS[d.status];
    if (!next || (next === 'assigned' && !d.riderId)) return;
    setUpdatingCode(d.deliveryCode);
    try {
      await updateStatus(d.deliveryCode, next);
    } finally {
      setUpdatingCode(null);
      fetchDeliveries({ search: search || undefined, status: statusFilter || undefined });
    }
  };

  useEffect(() => {
    fetchDeliveries({ search: search || undefined, status: statusFilter || undefined });
  }, [fetchDeliveries, search, statusFilter]);

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title="Deliveries" subtitle="Manage motorcycle deliveries" actions={<Link href="/logistics/deliveries/new"><button className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-orange-700 transition"><PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> New Delivery</span></button></Link>} />

        <div className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search deliveries..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              <select className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : deliveries.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <MapPinIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-lg font-medium">No deliveries found</p>
                <p className="text-sm mt-1">Create your first delivery to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Code</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Pickup</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Delivery</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Rider</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Size</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition">
                        <td className="px-4 py-3 font-mono text-xs font-medium text-orange-600 dark:text-orange-400">{d.deliveryCode}</td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{d.pickupName}<br/><span className="text-gray-400">{d.pickupAddress}</span></td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{d.deliveryName}<br/><span className="text-gray-400">{d.deliveryAddress}</span></td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{d.riderName || '—'}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status]}`}>{d.status.replace('_', ' ')}</span></td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{d.packageSize.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {NEXT_STATUS[d.status] && (
                              NEXT_STATUS[d.status] === 'assigned' && !d.riderId ? (
                                <Link href={`/logistics/deliveries/${d.deliveryCode}`} title="Assign rider first">
                                  <button className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"><UserIcon className="w-4 h-4 text-blue-500" /></button>
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handleQuickAdvance(d)}
                                  disabled={updatingCode === d.deliveryCode}
                                  title={`→ ${NEXT_LABEL[d.status]}`}
                                  className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-50"
                                >
                                  <ArrowRightCircleIcon className="w-4 h-4 text-orange-500" />
                                </button>
                              )
                            )}
                            <Link href={`/logistics/deliveries/${d.deliveryCode}`}><button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"><EyeIcon className="w-4 h-4 text-gray-500" /></button></Link>
                            <button onClick={() => { if (confirm('Delete this delivery?')) deleteDelivery(d.deliveryCode); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><TrashIcon className="w-4 h-4 text-red-500" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
