'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Header, ModuleGuard } from '@/components/layout';
import { useFinancialsStore } from '@/modules/financials/store';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MONTH_ORDER = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function normalizeMonth(name: string) {
  return name.replace(/\s*20\d{2}\s*$/i, '').trim();
}

function monthSortKey(name: string) {
  const idx = MONTH_ORDER.findIndex((m) => name.toLowerCase().startsWith(m));
  return idx >= 0 ? idx : 99;
}

type ReportType = 'pl' | 'cashflow' | 'expenses' | 'revenue' | 'summary' | null;

export default function FinancialsReportsPage() {
  const { expensesTotals, invoicesTotals, fetchOverview } = useFinancialsStore();
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const reportData = useMemo(() => {
    const monthGroups: Record<string, { expense: number; income: number }> = {};

    Object.entries(expensesTotals).forEach(([name, t]) => {
      const normalized = normalizeMonth(name);
      if (!monthGroups[normalized]) monthGroups[normalized] = { expense: 0, income: 0 };
      monthGroups[normalized].expense += (t as any).amount ?? (t as any).total ?? 0;
    });

    Object.entries(invoicesTotals).forEach(([name, t]) => {
      const normalized = normalizeMonth(name);
      if (!monthGroups[normalized]) monthGroups[normalized] = { expense: 0, income: 0 };
      monthGroups[normalized].income += (t as any).total ?? (t as any).amount ?? 0;
    });

    const sortedMonths = Object.keys(monthGroups).sort((a, b) => monthSortKey(a) - monthSortKey(b));

    const monthlyData = sortedMonths.map((month) => {
      const { income, expense } = monthGroups[month];
      const net = income - expense;
      const margin = income > 0 ? (net / income) * 100 : 0;
      return { month, income, expense, net, margin };
    });

    const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
    const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
    const totalNet = totalIncome - totalExpense;
    const totalMargin = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;

    return { monthlyData, totalIncome, totalExpense, totalNet, totalMargin };
  }, [expensesTotals, invoicesTotals]);

  const fmtZMW = (v: number) => v.toLocaleString(undefined, { style: 'currency', currency: 'ZMW' });

  const reportCards: { key: ReportType; title: string; subtitle: string }[] = [
    { key: 'pl', title: 'Profit & Loss', subtitle: 'Monthly income vs expenses' },
    { key: 'cashflow', title: 'Cash Flow', subtitle: 'Track money in and out' },
    { key: 'expenses', title: 'Expense Analysis', subtitle: 'Spending breakdown by month' },
    { key: 'revenue', title: 'Revenue Analysis', subtitle: 'Income trends and patterns' },
    { key: 'summary', title: 'Financial Summary', subtitle: 'Key metrics, averages, and ratios' },
  ];

  // P&L chart data
  const chartData = useMemo(() => ({
    labels: reportData.monthlyData.map((d) => d.month),
    datasets: [
      { label: 'Income', data: reportData.monthlyData.map((d) => d.income), backgroundColor: '#0ea5e9' },
      { label: 'Expenses', data: reportData.monthlyData.map((d) => d.expense), backgroundColor: '#ef4444' },
    ],
  }), [reportData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtZMW(ctx.raw)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v: any) => 'K' + (v / 1000).toLocaleString() },
      },
    },
  };

  if (!selectedReport) {
    return (
      <ModuleGuard moduleId="financials">
        <div className="min-h-screen">
          <Header title="Financial Reports" subtitle="Detailed financial analysis and insights" />
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => setSelectedReport(card.key)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-500 p-4 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-all text-left group"
                >
                  <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white">{card.title}</h3>
                  <p className="text-xs text-gray-500 mb-2">{card.subtitle}</p>
                  <span className="text-xs text-primary-600 font-medium">View Report →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard moduleId="financials">
      <div className="min-h-screen">
        <Header
          title={reportCards.find((c) => c.key === selectedReport)?.title || 'Report'}
          subtitle="Financial analysis"
          actions={
            <button
              onClick={() => setSelectedReport(null)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              ← Back to Reports
            </button>
          }
        />

        <div className="p-4 lg:p-6 space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Income" value={fmtZMW(reportData.totalIncome)} color="text-primary-600" />
            <StatCard label="Total Expenses" value={fmtZMW(reportData.totalExpense)} color="text-red-600" />
            <StatCard label="Net Profit" value={fmtZMW(reportData.totalNet)} color={reportData.totalNet >= 0 ? 'text-primary-600' : 'text-red-500'} />
            <StatCard label="Profit Margin" value={`${reportData.totalMargin.toFixed(1)}%`} color="text-accent-500" />
          </div>

          {/* Chart */}
          {(selectedReport === 'pl' || selectedReport === 'cashflow' || selectedReport === 'revenue' || selectedReport === 'expenses') && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 md:p-6">
              <div className="h-[300px] md:h-[400px]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Monthly table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Monthly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Income</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Expenses</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Net</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {reportData.monthlyData.map((row) => (
                    <tr key={row.month} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-right text-primary-600 tabular-nums">{fmtZMW(row.income)}</td>
                      <td className="px-4 py-3 text-sm text-right text-red-600 tabular-nums">{fmtZMW(row.expense)}</td>
                      <td className={`px-4 py-3 text-sm text-right font-medium tabular-nums ${row.net >= 0 ? 'text-primary-600' : 'text-red-500'}`}>{fmtZMW(row.net)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 tabular-nums">{row.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-gray-50 dark:bg-gray-900/50 font-bold">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">Total</td>
                    <td className="px-4 py-3 text-sm text-right text-primary-600 tabular-nums">{fmtZMW(reportData.totalIncome)}</td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 tabular-nums">{fmtZMW(reportData.totalExpense)}</td>
                    <td className={`px-4 py-3 text-sm text-right tabular-nums ${reportData.totalNet >= 0 ? 'text-primary-600' : 'text-red-500'}`}>{fmtZMW(reportData.totalNet)}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500 tabular-nums">{reportData.totalMargin.toFixed(1)}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
      <h3 className="text-gray-500 text-sm font-medium mb-1">{label}</h3>
      <div className={`text-lg md:text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
