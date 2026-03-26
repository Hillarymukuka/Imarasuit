'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useDeliveriesStore, useRidersStore } from '@/modules/logistics/store';
import type { CreateDeliveryData, PackageSize, PaymentMethod } from '@/modules/logistics/types';

export default function NewDeliveryPage() {
  const router = useRouter();
  const { createDelivery } = useDeliveriesStore();
  const { riders, fetchRiders } = useRidersStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateDeliveryData>({
    pickupName: '', pickupPhone: '', pickupAddress: '',
    deliveryName: '', deliveryPhone: '', deliveryAddress: '',
    description: '', packageSize: 'medium', amount: 0, paymentMethod: 'cash', notes: '',
  });

  useEffect(() => { fetchRiders({ active: true, available: true }); }, [fetchRiders]);

  const set = (f: keyof CreateDeliveryData, v: any) => setForm(p => ({ ...p, [f]: v }));
  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await createDelivery(form); router.push('/logistics/deliveries'); }
    catch (err: any) { alert(err.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title="New Delivery" subtitle="Create a motorcycle delivery" actions={<Link href="/logistics/deliveries"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>} />
        <div className="p-4 lg:p-6 max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Pickup */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Pickup</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Name *</label><input className={inputCls} required value={form.pickupName} onChange={e => set('pickupName', e.target.value)} /></div>
                <div><label className={labelCls}>Phone *</label><input className={inputCls} required value={form.pickupPhone} onChange={e => set('pickupPhone', e.target.value)} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Address *</label><input className={inputCls} required value={form.pickupAddress} onChange={e => set('pickupAddress', e.target.value)} /></div>
              </div>
            </div>

            {/* Delivery */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Delivery To</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className={labelCls}>Name *</label><input className={inputCls} required value={form.deliveryName} onChange={e => set('deliveryName', e.target.value)} /></div>
                <div><label className={labelCls}>Phone *</label><input className={inputCls} required value={form.deliveryPhone} onChange={e => set('deliveryPhone', e.target.value)} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Address *</label><input className={inputCls} required value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} /></div>
              </div>
            </div>

            {/* Details */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wide">Package Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Package Size</label>
                  <select className={inputCls} value={form.packageSize} onChange={e => set('packageSize', e.target.value as PackageSize)}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                    <option value="extra_large">Extra Large</option>
                  </select>
                </div>
                <div><label className={labelCls}>Amount</label><input className={inputCls} type="number" step="0.01" value={form.amount || ''} onChange={e => set('amount', e.target.value ? Number(e.target.value) : 0)} /></div>
                <div>
                  <label className={labelCls}>Payment Method</label>
                  <select className={inputCls} value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value as PaymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Assign Rider</label>
                  <select className={inputCls} value={form.riderId || ''} onChange={e => set('riderId', e.target.value || undefined)}>
                    <option value="">— none (assign later) —</option>
                    {riders.filter(r => r.isAvailable).map(r => <option key={r.id} value={r.id}>{r.name} ({r.riderCode})</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea className={inputCls} rows={2} value={form.description || ''} onChange={e => set('description', e.target.value)} /></div>
                <div className="sm:col-span-2"><label className={labelCls}>Notes</label><textarea className={inputCls} rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/logistics/deliveries"><button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button></Link>
              <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition">{saving ? 'Creating...' : 'Create Delivery'}</button>
            </div>
          </form>
        </div>
      </div>
    </ModuleGuard>
  );
}
