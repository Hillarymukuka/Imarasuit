'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

function formatVal(v: any): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const s = String(v).trim();
  const cleaned = s.replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  if (!isNaN(num)) return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return s;
}

interface FinancialDataTableProps {
  title: string;
  data: Record<string, any>[];
  columns: string[];
  loading?: boolean;
  onDelete?: (id: string) => void;
}

export default function FinancialDataTable({ title, data = [], columns, loading, onDelete }: FinancialDataTableProps) {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const pageSize = 15;

  const isAmountCol = (c: string) => /amount|total|value|cost/i.test(c);

  const filtered = useMemo(() => {
    let rows = data;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) =>
        columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey] ?? '';
        const bv = b[sortKey] ?? '';
        const an = typeof av === 'number' ? av : parseFloat(String(av).replace(/[^0-9.-]/g, ''));
        const bn = typeof bv === 'number' ? bv : parseFloat(String(bv).replace(/[^0-9.-]/g, ''));
        if (!isNaN(an) && !isNaN(bn)) return sortDir === 'asc' ? an - bn : bn - an;
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [data, searchQuery, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-full sm:w-64"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-1">
                      {col}
                      <ArrowUpDown size={12} className="opacity-40" />
                    </span>
                  </th>
                ))}
                {onDelete && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (onDelete ? 1 : 0)} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No records found
                  </td>
                </tr>
              )}
              {paged.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className={`px-4 py-3 text-sm ${isAmountCol(col) ? 'text-right font-medium tabular-nums' : ''} text-gray-900 dark:text-gray-200`}>
                      {isAmountCol(col) ? formatVal(row[col]) : String(row[col] ?? '')}
                    </td>
                  ))}
                  {onDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDelete(row.id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500">{filtered.length} records</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
