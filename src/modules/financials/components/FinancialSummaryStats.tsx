'use client';

import React from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  MoreHorizontal,
} from 'lucide-react';

interface FinancialSummaryStatsProps {
  invoicesTotal?: number;
  expensesTotal?: number;
  balance?: number;
}

export default function FinancialSummaryStats({
  invoicesTotal = 0,
  expensesTotal = 0,
  balance = 0,
}: FinancialSummaryStatsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white">Financial Summary</h3>
        <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Net Balance */}
        <div className="p-4 md:p-6 rounded-xl border bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-black dark:bg-white text-white dark:text-gray-900">
              <Wallet size={20} />
            </div>
            <p className="text-sm font-medium text-gray-500">Net Balance</p>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
            {balance.toLocaleString(undefined, { style: 'currency', currency: 'ZMW' })}
          </h2>
        </div>

        {/* Invoices & Expenses Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 md:p-4 rounded-xl border border-primary-100 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-500/5">
            <div className="flex items-center gap-2 mb-1 text-primary-500">
              <ArrowUpRight size={18} />
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Invoices</p>
            </div>
            <p className="text-sm md:text-base font-bold truncate text-gray-900 dark:text-white">
              {invoicesTotal.toLocaleString(undefined, { style: 'currency', currency: 'ZMW' })}
            </p>
          </div>

          <div className="p-3 md:p-4 rounded-xl border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
            <div className="flex items-center gap-2 mb-1 text-red-500">
              <ArrowDownRight size={18} />
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Expenses</p>
            </div>
            <p className="text-sm md:text-base font-bold truncate text-gray-900 dark:text-white">
              {expensesTotal.toLocaleString(undefined, { style: 'currency', currency: 'ZMW' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
