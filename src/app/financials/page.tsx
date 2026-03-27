'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header, ModuleGuard } from '@/components/layout';
import { useFinancialsStore } from '@/modules/financials/store';
import {
  BalanceChart,
  FinancialSummaryStats,
  SpendingSummary,
  RecentTransfers,
  ExchangeWidget,
} from '@/modules/financials/components';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function findMonthIndex(str: string): number {
  const s = str.toLowerCase();
  const idx = FULL_MONTHS.findIndex((m) => s.includes(m));
  if (idx >= 0) return idx;
  const shortIdx = MONTHS.findIndex((m) => s.toLowerCase().includes(m.toLowerCase()));
  return shortIdx;
}

export default function FinancialsDashboardPage() {
  const router = useRouter();
  const { totals, expensesTotals, invoicesTotals, invoices, fetchOverview, fetchInvoices, loading } = useFinancialsStore();

  useEffect(() => {
    fetchOverview();
    fetchInvoices();
  }, [fetchOverview, fetchInvoices]);

  const totalInvoices = totals.invoices.total;
  const expensesAmount = totals.expenses.amount;
  const totalBalance = totalInvoices - expensesAmount;

  // Monthly chart data
  const chartData = useMemo(() => {
    const balances = new Array(12).fill(0);

    Object.entries(invoicesTotals).forEach(([sheetName, t]) => {
      const idx = findMonthIndex(sheetName);
      if (idx >= 0) balances[idx] += (t as any).total ?? (t as any).amount ?? 0;
    });

    Object.entries(expensesTotals).forEach(([sheetName, t]) => {
      const idx = findMonthIndex(sheetName);
      if (idx >= 0) balances[idx] -= (t as any).amount ?? (t as any).total ?? 0;
    });

    return { labels: MONTHS, data: balances };
  }, [invoicesTotals, expensesTotals]);

  // Top spending months
  const topMonthsSpending = useMemo(() => {
    return Object.entries(expensesTotals)
      .filter(([month]) => findMonthIndex(month) >= 0)
      .map(([month, t]) => ({
        label: MONTHS[findMonthIndex(month)] || month,
        value: (t as any).amount ?? (t as any).total ?? 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [expensesTotals]);

  // Top clients from invoices
  const topClients = useMemo(() => {
    const clientMap: Record<string, { name: string; email: string; amount: number }> = {};
    for (const inv of invoices) {
      const name = inv.client || 'Unknown';
      const key = name.toUpperCase().trim();
      if (!clientMap[key]) {
        clientMap[key] = {
          name,
          email: `${key.toLowerCase().replace(/[^a-z0-9]/g, '.')}@client.com`,
          amount: 0,
        };
      }
      clientMap[key].amount += inv.total;
    }
    return Object.values(clientMap)
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [invoices]);

  return (
    <ModuleGuard moduleId="financials">
      <div className="min-h-screen">
        <Header
          title="Dashboard Menu"
          subtitle="Let's try to manage your finance for the future"
        />

        <div className="p-4 lg:p-6 space-y-4">
          {/* Top row: Balance Chart (2/3) + Spending Summary (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 min-h-[340px]">
              <BalanceChart
                total={totalBalance}
                data={chartData.data}
                labels={chartData.labels}
              />
            </div>
            <div className="lg:col-span-1 min-h-[340px]">
              <SpendingSummary
                expensesTotal={expensesAmount}
                categories={topMonthsSpending}
              />
            </div>
          </div>

          {/* Bottom row: Financial Summary + Top Clients + Exchange Rate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Financial Summary Stats */}
            <div>
              <FinancialSummaryStats
                invoicesTotal={totalInvoices}
                expensesTotal={expensesAmount}
                balance={totalBalance}
              />
            </div>

            {/* Top Clients */}
            <div>
              <RecentTransfers
                title="Top Clients"
                items={topClients.slice(0, 7)}
                onViewAll={() => router.push('/clients')}
              />
            </div>

            {/* Exchange Widget */}
            <div>
              <ExchangeWidget balance={totalBalance} />
            </div>
          </div>
        </div>
      </div>
    </ModuleGuard>
  );
}
