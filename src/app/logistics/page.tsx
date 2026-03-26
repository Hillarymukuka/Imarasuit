'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  TruckIcon,
  CubeIcon,
  MapPinIcon,
  UserGroupIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { ModuleGuard } from '@/components/layout';
import { useDeliveriesStore } from '@/modules/logistics/store';

const statCards = [
  { key: 'shipments', label: 'Shipments', icon: CubeIcon, color: 'bg-blue-500', href: '/logistics/shipments' },
  { key: 'containers', label: 'Containers', icon: TruckIcon, color: 'bg-purple-500', href: '/logistics/containers' },
  { key: 'riders', label: 'Riders', icon: UserGroupIcon, color: 'bg-green-500', href: '/logistics/riders' },
  { key: 'deliveries', label: 'Deliveries', icon: MapPinIcon, color: 'bg-orange-500', href: '/logistics/deliveries' },
];

export default function LogisticsDashboardPage() {
  const { stats, fetchStats } = useDeliveriesStore();

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title="Logistics"
          subtitle="Overview of shipments, containers, riders, and deliveries"
          actions={
            <div className="flex gap-2">
              <Link href="/logistics/shipments/new">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
                  <PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> New Shipment</span>
                </button>
              </Link>
              <Link href="/logistics/containers/new">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-purple-700 transition">
                  <PlusIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> New Container</span>
                </button>
              </Link>
            </div>
          }
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              let value = 0;
              let sub = '';
              if (stats) {
                if (card.key === 'shipments') { value = stats.shipments.total; sub = `${stats.shipments.inTransit} in transit`; }
                else if (card.key === 'containers') { value = stats.containers.total; sub = 'total'; }
                else if (card.key === 'riders') { value = stats.riders.total; sub = `${stats.riders.available} available`; }
                else if (card.key === 'deliveries') { value = stats.deliveries.total; sub = `${stats.deliveries.active} active`; }
              }
              return (
                <Link key={card.key} href={card.href}>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
                      </div>
                      <div className={`${card.color} rounded-lg p-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link href="/logistics/shipments/new" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <CubeIcon className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create Shipment</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/logistics/containers/new" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <TruckIcon className="w-5 h-5 text-purple-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create Container</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/logistics/riders/new" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add Rider</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </Link>
                <Link href="/logistics/deliveries/new" className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Create Delivery</span>
                  </div>
                  <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Delivery Stats Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delivery Overview</h3>
              {stats ? (
                <div className="space-y-4">
                  <StatBar label="Pending" value={stats.deliveries.pending} total={stats.deliveries.total} color="bg-yellow-500" />
                  <StatBar label="Active" value={stats.deliveries.active} total={stats.deliveries.total} color="bg-blue-500" />
                  <StatBar label="Completed" value={stats.deliveries.completed} total={stats.deliveries.total} color="bg-green-500" />
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Active Riders</span>
                      <span className="font-medium text-gray-900 dark:text-white">{stats.riders.active} / {stats.riders.total}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Loading...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}

function StatBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
