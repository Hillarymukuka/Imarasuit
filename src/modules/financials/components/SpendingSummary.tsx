'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface SpendingSummaryProps {
  expensesTotal?: number;
  categories?: { label: string; value: number }[];
}

export default function SpendingSummary({ expensesTotal, categories = [] }: SpendingSummaryProps) {
  const cats = categories.length > 0 ? categories : [
    { label: 'No data', value: 1 },
  ];

  const colors = ['#0284c7', '#0ea5e9', '#38bdf8', '#bae6fd'];

  const data = useMemo(() => ({
    labels: cats.map((c) => c.label),
    datasets: [
      {
        data: cats.map((c) => c.value),
        backgroundColor: colors.slice(0, cats.length),
        borderWidth: 0,
        cutout: '82%',
        circumference: 180,
        rotation: 270,
      },
    ],
  }), [cats]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (ctx: any) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()}`,
        },
      },
    },
  }), []);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full">
      {/* Gauge chart */}
      <div className="relative w-full flex justify-center items-end" style={{ height: '180px' }}>
        <div className="w-full h-full">
          <Doughnut data={data} options={options} />
        </div>
        {/* Centered label inside semicircle */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-3">
          <p className="text-[11px] text-gray-400 font-medium tracking-widest uppercase mb-0.5">spend</p>
          <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-none">
            ZMW {(expensesTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 space-y-3 flex-1">
        {cats.map((c, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i] || '#ccc' }} />
              <span className="text-gray-600 dark:text-gray-400 truncate max-w-[110px]">{c.label}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
              {c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
