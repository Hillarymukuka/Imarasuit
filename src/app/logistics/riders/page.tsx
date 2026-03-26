'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusIcon, MagnifyingGlassIcon, TrashIcon, EyeIcon, UserGroupIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useRidersStore } from '@/modules/logistics/store';

export default function RidersPage() {
  const { riders, loading, fetchRiders, deleteRider } = useRidersStore();
  const [search, setSearch] = useState('');

  useEffect(() => { fetchRiders({ search: search || undefined }); }, [fetchRiders, search]);

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title="Riders" subtitle="Manage motorcycle delivery riders" actions={<Link href="/logistics/riders/new"><button className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-green-700 transition"><PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Add Rider</span></button></Link>} />

        <div className="p-4 lg:p-6 space-y-4">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search riders..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : riders.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-lg font-medium">No riders found</p>
              <p className="text-sm mt-1">Add your first rider to start deliveries</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {riders.map((r) => (
                <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-green-600 dark:text-green-400">{r.riderCode}</span>
                    <div className="flex gap-1.5">
                      {r.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Inactive</span>
                      )}
                      {r.isAvailable && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Available</span>
                      )}
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{r.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{r.phone}</p>
                  {r.vehiclePlate && <p className="text-xs text-gray-400 mt-1">{r.vehicleModel || 'Vehicle'}: {r.vehiclePlate}</p>}
                  {r.activeDeliveries !== undefined && r.activeDeliveries > 0 && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{r.activeDeliveries} active deliver{r.activeDeliveries > 1 ? 'ies' : 'y'}</p>
                  )}
                  <div className="flex items-center justify-end mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 gap-1">
                    <Link href={`/logistics/riders/${r.riderCode}`}><button className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"><EyeIcon className="w-4 h-4 text-gray-500" /></button></Link>
                    <button onClick={() => { if (confirm('Delete this rider?')) deleteRider(r.riderCode); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><TrashIcon className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleGuard>
  );
}
