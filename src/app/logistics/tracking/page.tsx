'use client';

import React, { useState } from 'react';
import {
  MagnifyingGlassIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CubeIcon,
  UserIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { SHIPMENT_STATUS_ORDER } from '@/modules/logistics/constants';

interface TrackingResult {
  trackingCode: string;
  senderName: string;
  receiverName: string;
  origin: string;
  destination: string;
  status: string;
  description?: string;
  weightKg?: number;
  deliveredAt?: string;
  recipientName?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{ status: string; note?: string; timestamp: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  registered: 'Registered',
  pending: 'Pending',
  processing: 'Processing',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  registered: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  processing: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  dispatched: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  in_transit: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  arrived: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  delivered: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787/api';

export default function TrackingPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/track/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Not found' }));
        throw new Error(err.error || `Not found`);
      }
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Failed to track shipment');
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = result ? SHIPMENT_STATUS_ORDER.indexOf(result.status as any) : -1;
  const sc = result ? STATUS_COLORS[result.status] || STATUS_COLORS.pending : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TruckIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Track Your Shipment</h1>
          </div>
          <p className="text-sm text-gray-500">Enter your tracking code to see real-time status</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Search */}
        <form onSubmit={handleTrack} className="flex gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter tracking code (e.g. SHP-2025-XXXX)"
              className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-mono transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
          >
            {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
            Track
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">Shipment Not Found</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {result && sc && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            {/* Status Banner */}
            <div className={`${sc.bg} rounded-xl p-6 border`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-mono">{result.trackingCode}</p>
                  <p className={`text-2xl font-bold ${sc.text} mt-1`}>
                    {STATUS_LABELS[result.status] || result.status}
                  </p>
                </div>
                {result.status === 'delivered' ? (
                  <CheckCircleIcon className="w-12 h-12 text-green-500" />
                ) : (
                  <TruckIcon className="w-12 h-12 text-blue-500" />
                )}
              </div>
            </div>

            {/* Progress Pipeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Shipment Progress</h3>
              <div className="flex items-center justify-between">
                {SHIPMENT_STATUS_ORDER.map((status, i) => {
                  const reached = i <= currentIdx;
                  const isCurrent = status === result.status;
                  const dotColor = STATUS_COLORS[status]?.dot || 'bg-gray-400';
                  return (
                    <React.Fragment key={status}>
                      <div className="flex flex-col items-center gap-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isCurrent ? `${dotColor} ring-4 ring-offset-2 ring-blue-200 scale-110` :
                          reached ? dotColor : 'bg-gray-200'
                        }`}>
                          {reached ? (
                            <CheckCircleIcon className="w-5 h-5 text-white" />
                          ) : (
                            <span className="w-3 h-3 rounded-full bg-white/50" />
                          )}
                        </div>
                        <span className={`text-[10px] text-center capitalize leading-tight ${isCurrent ? 'font-bold text-gray-900' : 'text-gray-400'}`}>
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

            {/* Shipment Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <MapPinIcon className="w-3 h-3" /> Route
                </h4>
                <p className="text-sm font-medium text-gray-900">{result.origin} → {result.destination}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Receiver
                </h4>
                <p className="text-sm font-medium text-gray-900">{result.receiverName}</p>
              </div>
              {result.description && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                    <CubeIcon className="w-3 h-3" /> Contents
                  </h4>
                  <p className="text-sm text-gray-700">{result.description}</p>
                </div>
              )}
              {result.weightKg && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Weight</h4>
                  <p className="text-sm text-gray-700">{result.weightKg} kg</p>
                </div>
              )}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" /> Shipped On
                </h4>
                <p className="text-sm text-gray-700">{new Date(result.createdAt).toLocaleDateString()}</p>
              </div>
              {result.deliveredAt && (
                <div>
                  <h4 className="text-xs font-semibold text-green-600 uppercase mb-2 flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" /> Delivered
                  </h4>
                  <p className="text-sm text-gray-700">{new Date(result.deliveredAt).toLocaleString()}</p>
                  {result.recipientName && (
                    <p className="text-xs text-gray-500 mt-1">Received by: {result.recipientName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Timeline */}
            {result.history.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Tracking Timeline</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {[...result.history].reverse().map((h, i) => {
                      const hc = STATUS_COLORS[h.status] || STATUS_COLORS.pending;
                      return (
                        <div key={i} className="relative flex items-start gap-4 pl-10">
                          <div className={`absolute left-2 top-1 w-5 h-5 rounded-full border-2 border-white ${hc.dot}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hc.bg} ${hc.text}`}>
                                {STATUS_LABELS[h.status] || h.status}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(h.timestamp).toLocaleString()}
                              </span>
                            </div>
                            {h.note && (
                              <p className="text-sm text-gray-600 mt-1">{h.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !error && !loading && (
          <div className="text-center py-12">
            <CubeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Enter your tracking code above to track your shipment</p>
          </div>
        )}
      </div>
    </div>
  );
}
