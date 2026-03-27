'use client';

import React, { useEffect, useState } from 'react';
import { Header, ModuleGuard } from '@/components/layout';
import { useFinancialsStore } from '@/modules/financials/store';
import { FinancialDataTable } from '@/modules/financials/components';
import { PlusIcon } from '@heroicons/react/24/solid';

export default function FinancialsExpensesPage() {
  const { expenses, loading, fetchExpenses, addExpense, deleteExpense } = useFinancialsStore();
  const [showForm, setShowForm] = useState(false);
  const [month, setMonth] = useState('');
  const [form, setForm] = useState({ date: '', company: '', description: '', amount: '', month: '' });

  useEffect(() => {
    fetchExpenses(month ? { month } : undefined);
  }, [fetchExpenses, month]);

  const months = Array.from(new Set(expenses.map((e) => e.month))).sort();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.amount) return;
    const monthVal = form.month || new Date(form.date).toLocaleString('en', { month: 'long' });
    await addExpense({
      date: form.date,
      company: form.company,
      description: form.description,
      amount: parseFloat(form.amount),
      month: monthVal,
    });
    setForm({ date: '', company: '', description: '', amount: '', month: '' });
    setShowForm(false);
  };

  return (
    <ModuleGuard moduleId="financials">
      <div className="min-h-screen">
        <Header
          title="Expenses"
          subtitle="Track and manage all business expenses"
          actions={
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
            >
              <PlusIcon className="w-4 h-4" /> Add Expense
            </button>
          }
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Month filter */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 dark:text-gray-400">Filter by month:</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All months</option>
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Add form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Expense</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                <input placeholder="Month (e.g. January)" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">Cancel</button>
              </div>
            </form>
          )}

          <FinancialDataTable
            title="Expenses"
            data={expenses}
            columns={['date', 'company', 'description', 'amount', 'month']}
            loading={loading}
            onDelete={deleteExpense}
          />
        </div>
      </div>
    </ModuleGuard>
  );
}
