'use client';

import { useEffect, useState } from 'react';
import { useReportsStore } from '@/modules/logistics/store';
import {
  ChartBarIcon,
  CubeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { SHIPMENT_STATUS_ORDER } from '@/modules/logistics/constants';

// Status colors
const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-gray-400',
  pending: 'bg-yellow-400',
  processing: 'bg-blue-400',
  dispatched: 'bg-indigo-500',
  in_transit: 'bg-purple-500',
  arrived: 'bg-teal-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-400',
  loading: 'bg-yellow-400',
  sealed: 'bg-blue-400',
  assigned: 'bg-blue-400',
  picked_up: 'bg-indigo-500',
  paid: 'bg-green-500',
  failed: 'bg-red-400',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-ZM').format(value);
}

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-24 capitalize">{label.replace('_', ' ')}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { summary, loading, error, exporting, fetchSummary, exportShipmentsCsv, exportDeliveriesCsv } = useReportsStore();
  const [csvStatus, setCsvStatus] = useState('');

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleExportShipments = async (statusFilter?: string) => {
    try {
      setCsvStatus('');
      await exportShipmentsCsv(statusFilter);
      setCsvStatus('Shipments CSV downloaded');
    } catch {
      setCsvStatus('Export failed');
    }
  };

  const handleExportDeliveries = async (statusFilter?: string) => {
    try {
      setCsvStatus('');
      await exportDeliveriesCsv(statusFilter);
      setCsvStatus('Deliveries CSV downloaded');
    } catch {
      setCsvStatus('Export failed');
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-2">
        <ExclamationCircleIcon className="h-5 w-5" />
        <span>Failed to load reports: {error}</span>
        <button onClick={() => fetchSummary()} className="ml-auto text-sm underline">Retry</button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-sm text-gray-500">
              Last updated: {new Date(summary.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchSummary()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<CubeIcon className="h-6 w-6 text-blue-600" />}
          label="Total Shipments"
          value={formatNumber(summary.total_shipments)}
          sub={`${summary.today_shipments} today`}
          color="blue"
        />
        <MetricCard
          icon={<ArchiveBoxIcon className="h-6 w-6 text-purple-600" />}
          label="Total Containers"
          value={formatNumber(summary.total_containers)}
          sub={`${summary.shipments_in_containers} loaded`}
          color="purple"
        />
        <MetricCard
          icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
          label="Delivery Rate"
          value={`${summary.delivery_rate}%`}
          sub={`${summary.by_status?.delivered || 0} delivered`}
          color="green"
        />
        <MetricCard
          icon={<ClockIcon className="h-6 w-6 text-orange-600" />}
          label="Pending"
          value={formatNumber(summary.pending_shipments)}
          sub={`${summary.recent_shipments_7d} this week`}
          color="orange"
        />
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
          Financial Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average per Shipment</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.average_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <ScaleIcon className="h-4 w-4" /> Total Weight
            </p>
            <p className="text-xl font-bold text-gray-900">{formatNumber(summary.total_weight)} kg</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Weight</p>
            <p className="text-xl font-bold text-gray-900">{summary.average_weight.toFixed(1)} kg</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-blue-600" />
            Shipment Status Breakdown
          </h2>
          <div className="space-y-3">
            {SHIPMENT_STATUS_ORDER.map((status) => (
              <StatusBar
                key={status}
                label={status}
                count={summary.by_status?.[status] || 0}
                total={summary.total_shipments}
                color={STATUS_COLORS[status] || 'bg-gray-400'}
              />
            ))}
          </div>
        </div>

        {/* Container Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArchiveBoxIcon className="h-5 w-5 text-purple-600" />
            Container Status
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.containers_by_status || {}).map(([status, count]) => (
              <StatusBar
                key={status}
                label={status}
                count={count}
                total={summary.total_containers}
                color={STATUS_COLORS[status] || 'bg-gray-400'}
              />
            ))}
            {Object.keys(summary.containers_by_status || {}).length === 0 && (
              <p className="text-sm text-gray-400 italic">No containers yet</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">In Containers</span>
              <p className="font-semibold">{summary.shipments_in_containers}</p>
            </div>
            <div>
              <span className="text-gray-500">Standalone</span>
              <p className="font-semibold">{summary.standalone_shipments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Riders & Deliveries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserGroupIcon className="h-5 w-5 text-indigo-600" />
            Riders
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-700">{summary.riders.total}</p>
              <p className="text-sm text-gray-600">Total Riders</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{summary.riders.active}</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-teal-600" />
            Deliveries
          </h2>
          <div className="space-y-3">
            {Object.entries(summary.deliveries.by_status || {}).map(([status, count]) => (
              <StatusBar
                key={status}
                label={status}
                count={count}
                total={summary.deliveries.total}
                color={STATUS_COLORS[status] || 'bg-gray-400'}
              />
            ))}
            {Object.keys(summary.deliveries.by_status || {}).length === 0 && (
              <p className="text-sm text-gray-400 italic">No deliveries yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Routes */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5 text-orange-600" />
          Top Routes
        </h2>
        {summary.top_routes.length > 0 ? (
          <div className="space-y-3">
            {summary.top_routes.map((route, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {route.origin} → {route.destination}
                  </p>
                </div>
                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-semibold text-gray-700">
                  {route.count} shipment{route.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No routes data yet</p>
        )}
      </div>

      {/* CSV Export */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowDownTrayIcon className="h-5 w-5 text-gray-600" />
          Export Data
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ExportButton
            label="All Shipments"
            subtitle="Full shipments CSV"
            onClick={() => handleExportShipments()}
            disabled={exporting}
          />
          <ExportButton
            label="Delivered Shipments"
            subtitle="Only delivered"
            onClick={() => handleExportShipments('delivered')}
            disabled={exporting}
          />
          <ExportButton
            label="In-Transit Shipments"
            subtitle="Currently moving"
            onClick={() => handleExportShipments('in_transit')}
            disabled={exporting}
          />
          <ExportButton
            label="All Deliveries"
            subtitle="Full deliveries CSV"
            onClick={() => handleExportDeliveries()}
            disabled={exporting}
          />
          <ExportButton
            label="Delivered (Motorcycle)"
            subtitle="Completed deliveries"
            onClick={() => handleExportDeliveries('delivered')}
            disabled={exporting}
          />
          <ExportButton
            label="Pending Deliveries"
            subtitle="Awaiting pickup"
            onClick={() => handleExportDeliveries('pending')}
            disabled={exporting}
          />
        </div>
        {csvStatus && (
          <p className="mt-3 text-sm text-green-600 flex items-center gap-1">
            <CheckCircleIcon className="h-4 w-4" /> {csvStatus}
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
  };
  return (
    <div className={`${bgMap[color] || 'bg-gray-50'} rounded-xl p-4 border border-gray-100`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-sm text-gray-600">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function ExportButton({
  label,
  subtitle,
  onClick,
  disabled,
}: {
  label: string;
  subtitle: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 text-left"
    >
      <ArrowDownTrayIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </button>
  );
}
