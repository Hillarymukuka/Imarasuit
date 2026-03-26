'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useContainersStore } from '@/modules/logistics/store';
import type { CreateContainerData } from '@/modules/logistics/types';
import { ZAMBIAN_CITIES } from '@/modules/logistics/constants';

export default function NewContainerPage() {
  const router = useRouter();
  const { createContainer } = useContainersStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateContainerData>({
    name: '', origin: '', destination: '',
    vehicleType: '', vehicleNumber: '', driverName: '', driverPhone: '', departureTime: '',
  });

  const set = (field: keyof CreateContainerData, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createContainer(form);
      router.push('/logistics/containers');
    } catch (err: any) {
      alert(err.message || 'Failed to create container');
    } finally { setSaving(false); }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title="New Container" subtitle="Set up a new container" actions={<Link href="/logistics/containers"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>} />
        <div className="p-4 lg:p-6 max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className={labelCls}>Container Name *</label><input className={inputCls} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div><label className={labelCls}>Origin *</label><select className={inputCls} required value={form.origin} onChange={e => set('origin', e.target.value)}><option value="">Select origin city</option>{ZAMBIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}</select></div>
              <div><label className={labelCls}>Destination *</label><select className={inputCls} required value={form.destination} onChange={e => set('destination', e.target.value)}><option value="">Select destination city</option>{ZAMBIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}</select></div>
              <div><label className={labelCls}>Vehicle Type</label><input className={inputCls} placeholder="e.g. Truck, Van" value={form.vehicleType || ''} onChange={e => set('vehicleType', e.target.value)} /></div>
              <div><label className={labelCls}>Vehicle Number</label><input className={inputCls} placeholder="e.g. ABC-1234" value={form.vehicleNumber || ''} onChange={e => set('vehicleNumber', e.target.value)} /></div>
              <div><label className={labelCls}>Driver Name</label><input className={inputCls} value={form.driverName || ''} onChange={e => set('driverName', e.target.value)} /></div>
              <div><label className={labelCls}>Driver Phone</label><input className={inputCls} value={form.driverPhone || ''} onChange={e => set('driverPhone', e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={labelCls}>Departure Time</label><input className={inputCls} type="datetime-local" value={form.departureTime || ''} onChange={e => set('departureTime', e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/logistics/containers"><button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button></Link>
              <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition">{saving ? 'Creating...' : 'Create Container'}</button>
            </div>
          </form>
        </div>
      </div>
    </ModuleGuard>
  );
}
