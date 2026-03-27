'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface TransferItem {
  name: string;
  email: string;
  amount?: number;
  status?: string;
  statusColor?: string;
}

interface RecentTransfersProps {
  items?: TransferItem[];
  title?: string;
  onViewAll?: () => void;
}

export default function RecentTransfers({ items = [], title = 'Recent Transfer', onViewAll }: RecentTransfersProps) {
  const people = items.length > 0 ? items : [];

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 md:mb-5 shrink-0">
        <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{title}</h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-xs md:text-sm font-medium text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            View all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 md:space-y-5 pr-1">
        {people.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No clients yet</p>
        )}
        {people.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs md:text-sm font-semibold leading-tight text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
              <p className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500 truncate">{p.email}</p>
            </div>
            {p.amount !== undefined ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                  {p.amount.toLocaleString(undefined, { style: 'currency', currency: 'ZMW' })}
                </span>
                <TrendingUp size={14} className="text-primary-500 shrink-0" />
              </div>
            ) : (
              <span className={`text-[10px] md:text-xs font-bold ${p.statusColor || 'text-green-500'} shrink-0`}>
                {p.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
