'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CubeIcon,
  ScaleIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';
import { Header, ModuleGuard } from '@/components/layout';
import { useCompanyStore } from '@/store';
import { useShipmentsStore, useContainersStore } from '@/modules/logistics/store';
import { ZAMBIAN_CITIES } from '@/modules/logistics/constants';
import type { Container, Shipment } from '@/modules/logistics/types';

interface NewShipmentForm {
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  receiverName: string;
  receiverPhone: string;
  receiverEmail: string;
  origin: string;
  destination: string;
  description: string;
  weightKg: string;
  amount: string;
  containerId: string;
}

const EMPTY_FORM: NewShipmentForm = {
  senderName: '', senderPhone: '', senderEmail: '',
  receiverName: '', receiverPhone: '', receiverEmail: '',
  origin: '', destination: '', description: '',
  weightKg: '', amount: '', containerId: '',
};

export default function NewShipmentPage() {
  const { createShipment } = useShipmentsStore();
  const { containers, fetchContainers } = useContainersStore();
  const [form, setForm] = useState<NewShipmentForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [trackingCode, setTrackingCode] = useState('');
  const [createdShipment, setCreatedShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    fetchContainers({ status: 'loading' });
  }, [fetchContainers]);

  // Only show containers matching origin/destination
  const filteredContainers = containers.filter(
    (c: Container) =>
      (!form.origin || c.origin === form.origin) &&
      (!form.destination || c.destination === form.destination)
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const shipment = await createShipment({
        senderName: form.senderName,
        senderPhone: form.senderPhone,
        senderEmail: form.senderEmail || undefined,
        receiverName: form.receiverName,
        receiverPhone: form.receiverPhone,
        receiverEmail: form.receiverEmail || undefined,
        origin: form.origin,
        destination: form.destination,
        description: form.description || undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        amount: form.amount ? parseFloat(form.amount) : undefined,
        containerId: form.containerId || undefined,
      });
      setTrackingCode(shipment.trackingCode);
      setCreatedShipment(shipment);
      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err?.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  return (
    <ModuleGuard moduleId="logistics">
      <div className="min-h-screen">
        <Header
          title="New Shipment"
          subtitle="Register a new courier shipment"
          actions={
            <Link href="/logistics/shipments">
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 sm:px-4 sm:py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <ArrowLeftIcon className="w-4 h-4 flex-shrink-0" /><span className="hidden sm:inline"> Back to Shipments</span>
              </button>
            </Link>
          }
        />

        <div className="p-4 lg:p-6 max-w-3xl mx-auto">
          {/* Success Screen */}
          {success && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center space-y-5">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Shipment Created Successfully!</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Tracking Code: <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-lg">{trackingCode}</span>
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href={`/logistics/shipments/${trackingCode}`}>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition">
                    <DocumentTextIcon className="w-4 h-4" /> View Shipment Details
                  </button>
                </Link>
                {createdShipment && (
                  <button
                    onClick={async () => {
                      const { printWaybill } = await import('@/modules/logistics/utils/waybill');
                      printWaybill(createdShipment, useCompanyStore.getState().company?.name);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-purple-700 transition"
                  >
                    <DocumentTextIcon className="w-4 h-4" /> Print Waybill
                  </button>
                )}
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create Another Shipment
              </button>
            </div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sender Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Sender Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="senderName" value={form.senderName} onChange={handleChange} required placeholder="Sender name" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="senderPhone" value={form.senderPhone} onChange={handleChange} placeholder="+260 97X XXX XXX" className={inputCls} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
                    <div className="relative">
                      <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" name="senderEmail" value={form.senderEmail} onChange={handleChange} placeholder="sender@email.com" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Receiver Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <UserIcon className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Receiver Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="receiverName" value={form.receiverName} onChange={handleChange} required placeholder="Receiver name" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone</label>
                    <div className="relative">
                      <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input name="receiverPhone" value={form.receiverPhone} onChange={handleChange} placeholder="+260 97X XXX XXX" className={inputCls} />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email (for notifications)</label>
                    <div className="relative">
                      <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="email" name="receiverEmail" value={form.receiverEmail} onChange={handleChange} placeholder="receiver@email.com" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipment Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CubeIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Shipment Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Origin *</label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select name="origin" value={form.origin} onChange={handleChange} required className={inputCls + ' appearance-none'}>
                        <option value="">Select origin city</option>
                        {ZAMBIAN_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Destination *</label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <select name="destination" value={form.destination} onChange={handleChange} required className={inputCls + ' appearance-none'}>
                        <option value="">Select destination city</option>
                        {ZAMBIAN_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                    <textarea name="description" value={form.description} onChange={handleChange} rows={3}
                      placeholder="Describe the package contents..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Weight (kg)</label>
                    <div className="relative">
                      <ScaleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" name="weightKg" value={form.weightKg} onChange={handleChange} step="0.1" placeholder="0.0" className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (K)</label>
                    <div className="relative">
                      <CurrencyDollarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" name="amount" value={form.amount} onChange={handleChange} step="0.01" placeholder="0.00" className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Container Assignment */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <ArchiveBoxIcon className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add to Container (Optional)</h3>
                  </div>
                  <div className="relative">
                    <ArchiveBoxIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select name="containerId" value={form.containerId} onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">No container (create standalone)</option>
                      {filteredContainers.map((c: Container) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.origin} → {c.destination})</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Only containers with matching routes are shown</p>
                </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating Shipment...
                  </>
                ) : (
                  <><CubeIcon className="w-4 h-4" /> Create Shipment</>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </ModuleGuard>
  );
}
