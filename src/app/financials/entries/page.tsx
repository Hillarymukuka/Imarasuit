'use client';

import React, { useState, useRef, useCallback, ClipboardEvent } from 'react';
import { Header, ModuleGuard } from '@/components/layout';
import { useFinancialsStore } from '@/modules/financials/store';

interface EntryRow {
  date: string;
  company: string;
  description: string;
  amount: string;
}

const EMPTY_ROW: EntryRow = { date: '', company: '', description: '', amount: '' };

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function deriveMonth(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return MONTHS[d.getMonth()] || '';
  } catch {
    return '';
  }
}

export default function FinancialsEntriesPage() {
  const { addExpense, addInvoice, bulkAddExpenses, bulkAddInvoices } = useFinancialsStore();
  const [type, setType] = useState<'expenses' | 'invoices'>('expenses');
  const [targetMonth, setTargetMonth] = useState('');
  const [splitByMonth, setSplitByMonth] = useState(false);
  const [rows, setRows] = useState<EntryRow[]>([{ ...EMPTY_ROW }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const pasteRef = useRef<HTMLDivElement>(null);

  const addRow = () => setRows((r) => [...r, { ...EMPTY_ROW }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateCell = (idx: number, key: keyof EntryRow, val: string) =>
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, [key]: val } : row)));

  const handlePaste = useCallback((ev: ClipboardEvent<HTMLTableSectionElement>) => {
    const text = ev.clipboardData.getData('text/plain');
    if (!text) return;
    ev.preventDefault();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '');
    if (lines.length === 0) return;

    const parsed = lines.map((line) => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      return cols.map((c) => c.trim());
    });

    // Detect header row
    const first = parsed[0].map((c) => c.toLowerCase());
    const hasHeaders = first.some((c) => /date|company|description|amount/i.test(c));
    const mapped: EntryRow[] = [];

    if (hasHeaders) {
      const map: Record<string, number> = {};
      first.forEach((h, i) => {
        if (/date/i.test(h)) map.date = i;
        if (/company|vendor|client|payee/i.test(h)) map.company = i;
        if (/description|detail|desc/i.test(h)) map.description = i;
        if (/amount|amt|total|value/i.test(h)) map.amount = i;
      });
      for (let i = 1; i < parsed.length; i++) {
        const r = parsed[i];
        mapped.push({
          date: map.date != null ? r[map.date] || '' : '',
          company: map.company != null ? r[map.company] || '' : '',
          description: map.description != null ? r[map.description] || '' : '',
          amount: map.amount != null ? r[map.amount] || '' : '',
        });
      }
    } else {
      for (const r of parsed) {
        mapped.push({
          date: r[0] || '',
          company: r[1] || '',
          description: r[2] || '',
          amount: r[3] || r[2] || '',
        });
      }
    }

    if (mapped.length > 0) setRows((r) => [...r, ...mapped]);
  }, []);

  const saveAll = async () => {
    const valid = rows.filter((r) => r.date && r.amount.trim() !== '');
    if (valid.length === 0) {
      setMessage('No valid rows to save (each row needs Date and Amount).');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      if (type === 'expenses') {
        const entries = valid.map((r) => ({
          date: r.date,
          company: r.company,
          description: r.description,
          amount: parseFloat(r.amount) || 0,
          month: splitByMonth ? deriveMonth(r.date) : targetMonth || deriveMonth(r.date),
        }));
        await bulkAddExpenses(entries);
      } else {
        const entries = valid.map((r) => ({
          date: r.date,
          client: r.company,
          description: r.description,
          total: parseFloat(r.amount) || 0,
          month: splitByMonth ? deriveMonth(r.date) : targetMonth || deriveMonth(r.date),
        }));
        await bulkAddInvoices(entries);
      }
      setMessage(`Saved ${valid.length} ${type} successfully.`);
      setRows([{ ...EMPTY_ROW }]);
    } catch {
      setMessage('Failed to save entries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveSingleRow = async (idx: number) => {
    const r = rows[idx];
    if (!r.date || !r.amount.trim()) return;
    setSaving(true);
    try {
      const month = splitByMonth ? deriveMonth(r.date) : targetMonth || deriveMonth(r.date);
      if (type === 'expenses') {
        await addExpense({ date: r.date, company: r.company, description: r.description, amount: parseFloat(r.amount) || 0, month });
      } else {
        await addInvoice({ date: r.date, client: r.company, description: r.description, total: parseFloat(r.amount) || 0, month });
      }
      removeRow(idx);
      setMessage('Row saved.');
    } catch {
      setMessage('Failed to save row.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModuleGuard moduleId="financials">
      <div className="min-h-screen">
        <Header title="Manual Entries" subtitle="Spreadsheet-like data entry with paste support" />

        <div className="p-4 lg:p-6 space-y-4">
          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="expenses">Expense</option>
                  <option value="invoices">Invoice</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Target Month</label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  disabled={splitByMonth}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm disabled:opacity-50"
                >
                  <option value="">Auto (from date)</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="splitByMonth"
                  checked={splitByMonth}
                  onChange={(e) => setSplitByMonth(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="splitByMonth" className="text-sm text-gray-600 dark:text-gray-300">
                  Split by month (derive from date)
                </label>
              </div>
            </div>
          </div>

          {/* Spreadsheet table */}
          <div ref={pasteRef} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="w-36 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{type === 'expenses' ? 'Company' : 'Client'}</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                    <th className="w-28 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="w-32 px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody onPaste={handlePaste} className="divide-y divide-gray-100 dark:divide-gray-700">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          value={r.date}
                          onChange={(e) => updateCell(i, 'date', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={r.company}
                          onChange={(e) => updateCell(i, 'company', e.target.value)}
                          placeholder={type === 'expenses' ? 'Company name' : 'Client name'}
                          className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={r.description}
                          onChange={(e) => updateCell(i, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={r.amount}
                          onChange={(e) => updateCell(i, 'amount', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-right border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm tabular-nums"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => saveSingleRow(i)}
                            disabled={saving}
                            className="px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 transition disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="px-2 py-1 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded text-xs hover:bg-red-200 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
              <button type="button" onClick={addRow} className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                + Add Row
              </button>
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : `Save All (${rows.filter((r) => r.date && r.amount.trim()).length} rows)`}
              </button>

              {message && (
                <span className={`text-sm ${message.includes('Failed') ? 'text-red-500' : 'text-primary-600'}`}>
                  {message}
                </span>
              )}

              <span className="text-xs text-gray-400 ml-auto">
                Tip: Paste from Excel or Google Sheets directly into the table rows.
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
