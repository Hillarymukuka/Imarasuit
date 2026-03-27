'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useRidersStore } from '@/modules/logistics/store';
import type { RiderDetail } from '@/modules/logistics/types';

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700', assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-yellow-100 text-yellow-700', in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function RiderDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { getRider, updateRider } = useRidersStore();
  const [rider, setRider] = useState<RiderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    getRider(code).then(setRider).finally(() => setLoading(false));
  }, [code, getRider]);

  const toggleActive = async () => {
    if (!rider) return;
    await updateRider(rider.riderCode, { isActive: !rider.isActive });
    setRider({ ...rider, isActive: !rider.isActive });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!rider) return <div className="p-8 text-center text-gray-500">Rider not found</div>;

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title={rider.name} subtitle={`${rider.riderCode} — ${rider.phone}`} actions={
          <div className="flex gap-2">
            <button onClick={toggleActive} className={`rounded-lg px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium transition ${rider.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>{rider.isActive ? 'Deactivate' : 'Activate'}</button>
            <Link href="/logistics/riders"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>
          </div>
        } />

        <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
          {/* Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">Status</span><p className="font-medium">{rider.isActive ? '🟢 Active' : '🔴 Inactive'}</p></div>
              <div><span className="text-gray-500 dark:text-gray-400">Availability</span><p className="font-medium">{rider.isAvailable ? '✅ Available' : '🔴 Busy'}</p></div>
              {rider.vehiclePlate && <div><span className="text-gray-500 dark:text-gray-400">Vehicle</span><p className="font-medium">{rider.vehicleModel || 'N/A'} — {rider.vehiclePlate}</p></div>}
              {rider.email && <div><span className="text-gray-500 dark:text-gray-400">Email</span><p className="font-medium">{rider.email}</p></div>}
            </div>
            {rider.currentLat && rider.currentLng && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500">
                <MapPinIcon className="w-4 h-4" /> Last location: {rider.currentLat.toFixed(5)}, {rider.currentLng.toFixed(5)}
                {rider.lastLocationUpdate && <span className="text-xs text-gray-400">({new Date(rider.lastLocationUpdate).toLocaleString()})</span>}
              </div>
            )}
          </div>

          {/* Recent Deliveries */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Deliveries</h3>
            {!rider.recentDeliveries || rider.recentDeliveries.length === 0 ? (
              <p className="text-sm text-gray-500">No deliveries yet</p>
            ) : (
              <div className="space-y-3">
                {rider.recentDeliveries.map(d => (
                  <Link key={d.id} href={`/logistics/deliveries/${d.deliveryCode}`}>
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs text-orange-600 dark:text-orange-400">{d.deliveryCode}</span>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DELIVERY_STATUS_COLORS[d.status]}`}>{d.status.replace('_', ' ')}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{d.pickupAddress} → {d.deliveryAddress}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
