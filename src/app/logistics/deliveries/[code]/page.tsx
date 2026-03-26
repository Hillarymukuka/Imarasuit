'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ClockIcon, MapPinIcon, UserIcon, CheckCircleIcon, XCircleIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useDeliveriesStore, useRidersStore } from '@/modules/logistics/store';
import type { DeliveryDetail, DeliveryStatus } from '@/modules/logistics/types';

const NEXT_STATUS: Record<string, DeliveryStatus> = {
  pending: 'assigned', assigned: 'picked_up', picked_up: 'in_transit', in_transit: 'delivered',
};

const NEXT_LABEL: Record<string, string> = {
  pending: 'Assign & Start', assigned: 'Mark Picked Up', picked_up: 'Mark In Transit', in_transit: 'Mark Delivered',
};

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-gray-400', assigned: 'bg-blue-500', picked_up: 'bg-yellow-500',
  in_transit: 'bg-indigo-500', delivered: 'bg-green-500', cancelled: 'bg-red-500',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700', assigned: 'bg-blue-100 text-blue-700',
  picked_up: 'bg-yellow-100 text-yellow-700', in_transit: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function DeliveryDetailPage() {
  const { code } = useParams<{ code: string }>();
  const { getDelivery, updateStatus, updatePayment, assignRider } = useDeliveriesStore();
  const { riders, fetchRiders } = useRidersStore();
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [actionModal, setActionModal] = useState<
    { type: 'advance'; nextStatus: DeliveryStatus } | { type: 'cancel' | 'pay' } | null
  >(null);
  const [actionNote, setActionNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!code) return;
    try { setDelivery(await getDelivery(code)); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); fetchRiders({ active: true }); }, [code]);

  const handleAdvance = () => {
    if (!delivery) return;
    const next = NEXT_STATUS[delivery.status];
    if (!next) return;
    if (next === 'assigned' && !delivery.riderId) { setShowAssign(true); return; }
    setActionNote('');
    setActionModal({ type: 'advance', nextStatus: next });
  };

  const handleAssign = async (riderId: string) => {
    if (!delivery) return;
    await assignRider(delivery.deliveryCode, riderId);
    setShowAssign(false);
    await load();
  };

  const handleConfirmAction = async () => {
    if (!delivery || !actionModal) return;
    setSaving(true);
    try {
      if (actionModal.type === 'advance') {
        await updateStatus(delivery.deliveryCode, (actionModal as any).nextStatus, actionNote || undefined);
      } else if (actionModal.type === 'cancel') {
        await updateStatus(delivery.deliveryCode, 'cancelled', actionNote || 'Delivery cancelled');
      } else if (actionModal.type === 'pay') {
        await updatePayment(delivery.deliveryCode, 'paid');
      }
      setActionModal(null);
      setActionNote('');
      await load();
    } catch (err: any) {
      alert(err.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!delivery) return <div className="p-8 text-center text-gray-500">Delivery not found</div>;

  const next = NEXT_STATUS[delivery.status];
  const canCancel = delivery.status !== 'delivered' && delivery.status !== 'cancelled';
  const canPay = (delivery.amount || 0) > 0 && delivery.paymentStatus === 'pending';

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title={delivery.deliveryCode} subtitle={`${delivery.pickupAddress} → ${delivery.deliveryAddress}`} actions={
          <div className="flex gap-2">
            {next && <button onClick={handleAdvance} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-orange-700 transition"><CheckCircleIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Mark as {next.replace('_', ' ')}</span></button>}
            {!delivery.riderId && <button onClick={() => setShowAssign(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition"><UserIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Assign Rider</span></button>}
            <Link href="/logistics/deliveries"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>
          </div>
        } />

        {/* Assign Rider Modal */}
        {showAssign && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Rider</h3>
              {riders.filter(r => r.isAvailable).length === 0 ? (
                <p className="text-sm text-gray-500 mb-4">No available riders at the moment.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {riders.filter(r => r.isAvailable).map(r => (
                    <button key={r.id} onClick={() => handleAssign(r.id)} className="w-full text-left p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.riderCode} — {r.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setShowAssign(false)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Close</button>
            </div>
          </div>
        )}

        {/* Action Confirmation Modal */}
        {actionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-sm w-full">
              {actionModal.type === 'pay' ? (
                <>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Mark Payment as Paid</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Confirm that K {(delivery.amount || 0).toFixed(2)} via {delivery.paymentMethod.replace(/_/g, ' ')} has been received.</p>
                </>
              ) : actionModal.type === 'cancel' ? (
                <>
                  <h3 className="text-base font-semibold text-red-600 mb-2">Cancel Delivery</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">This will mark the delivery as cancelled and free up the assigned rider.</p>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={2} placeholder="Reason for cancellation (optional)"
                    value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">
                    Move to: <span className="capitalize text-orange-600">{(actionModal as any).nextStatus?.replace(/_/g, ' ')}</span>
                  </h3>
                  <textarea
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={2} placeholder="Add a note (optional)"
                    value={actionNote} onChange={(e) => setActionNote(e.target.value)}
                  />
                </>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setActionModal(null); setActionNote(''); }} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Back</button>
                <button
                  onClick={handleConfirmAction} disabled={saving}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition ${
                    actionModal.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                    actionModal.type === 'pay' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
          {/* Status & Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[delivery.status]}`}>{delivery.status.replace(/_/g, ' ')}</span>
              <span className="text-sm text-gray-500">{delivery.packageSize.replace('_', ' ')} package</span>
              {(delivery.amount || 0) > 0 && (
                <>
                  <span className="text-sm text-gray-500">K {(delivery.amount || 0).toFixed(2)}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    delivery.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    delivery.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>{delivery.paymentMethod.replace(/_/g, ' ')} — {delivery.paymentStatus}</span>
                </>
              )}
            </div>

            {/* Progress steps */}
            {delivery.status !== 'cancelled' && (() => {
              const steps: DeliveryStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];
              const currentIdx = steps.indexOf(delivery.status as DeliveryStatus);
              return (
                <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
                  {steps.map((s, i) => {
                    const done = steps.indexOf(s) <= currentIdx;
                    return (
                      <React.Fragment key={s}>
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-3 h-3 rounded-full border-2 ${done ? `border-orange-500 bg-orange-500` : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`} />
                          <span className={`text-xs mt-1 whitespace-nowrap ${done ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>{s.replace(/_/g, ' ')}</span>
                        </div>
                        {i < steps.length - 1 && <div className={`flex-1 h-0.5 mb-4 min-w-4 ${steps.indexOf(s) < currentIdx ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pickup</h4>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{delivery.pickupName}</p>
                <p className="text-sm text-gray-500">{delivery.pickupPhone}</p>
                <p className="text-sm text-gray-500">{delivery.pickupAddress}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Delivery</h4>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{delivery.deliveryName}</p>
                <p className="text-sm text-gray-500">{delivery.deliveryPhone}</p>
                <p className="text-sm text-gray-500">{delivery.deliveryAddress}</p>
              </div>
            </div>

            {delivery.riderName && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm">
                <UserIcon className="w-4 h-4 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Rider: <strong>{delivery.riderName}</strong></span>
                {delivery.riderCode && <Link href={`/logistics/riders/${delivery.riderCode}`} className="text-blue-600 text-xs hover:underline">{delivery.riderCode}</Link>}
              </div>
            )}

            {delivery.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">{delivery.description}</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><ClockIcon className="w-5 h-5 text-gray-400" /> Status History</h3>
              {delivery.statusHistory.length === 0 ? <p className="text-sm text-gray-500">No history</p> : (
                <div className="space-y-3">
                  {delivery.statusHistory.map(h => (
                    <div key={h.id} className="flex items-start gap-3">
                      <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[h.status] || 'bg-gray-400'}`} />
                      <div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[h.status] || 'bg-gray-100 text-gray-700'}`}>{h.status.replace('_', ' ')}</span>
                        {h.note && <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{h.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(h.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Trail */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><MapPinIcon className="w-5 h-5 text-orange-500" /> Location Trail</h3>
              {delivery.locations.length === 0 ? <p className="text-sm text-gray-500">No GPS data recorded yet</p> : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {delivery.locations.map(l => (
                    <div key={l.id} className="flex items-center gap-3 text-xs text-gray-500">
                      <MapPinIcon className="w-3 h-3 text-orange-400 flex-shrink-0" />
                      <span>{l.lat.toFixed(5)}, {l.lng.toFixed(5)}</span>
                      {l.speed !== null && <span>{l.speed.toFixed(1)} km/h</span>}
                      <span className="ml-auto">{new Date(l.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
