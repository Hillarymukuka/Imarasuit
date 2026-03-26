'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useRidersStore } from '@/modules/logistics/store';
import type { CreateRiderData } from '@/modules/logistics/types';

export default function NewRiderPage() {
  const router = useRouter();
  const { createRider } = useRidersStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateRiderData>({ name: '', phone: '', email: '', vehiclePlate: '', vehicleModel: '' });

  const set = (f: keyof CreateRiderData, v: string) => setForm(p => ({ ...p, [f]: v }));
  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent";
  const labelCls = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await createRider(form); router.push('/logistics/riders'); }
    catch (err: any) { alert(err.message || 'Failed to add rider'); }
    finally { setSaving(false); }
  };

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header title="Add Rider" subtitle="Register a new delivery rider" actions={<Link href="/logistics/riders"><button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"><ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back</span></button></Link>} />
        <div className="p-4 lg:p-6 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2"><label className={labelCls}>Name *</label><input className={inputCls} required value={form.name} onChange={e => set('name', e.target.value)} /></div>
              <div><label className={labelCls}>Phone *</label><input className={inputCls} required value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
              <div><label className={labelCls}>Email</label><input className={inputCls} type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} /></div>
              <div><label className={labelCls}>Vehicle Plate</label><input className={inputCls} value={form.vehiclePlate || ''} onChange={e => set('vehiclePlate', e.target.value)} /></div>
              <div><label className={labelCls}>Vehicle Model</label><input className={inputCls} value={form.vehicleModel || ''} onChange={e => set('vehicleModel', e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/logistics/riders"><button type="button" className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button></Link>
              <button type="submit" disabled={saving} className="px-6 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition">{saving ? 'Adding...' : 'Add Rider'}</button>
            </div>
          </form>
        </div>
      </div>
    </ModuleGuard>
  );
}
