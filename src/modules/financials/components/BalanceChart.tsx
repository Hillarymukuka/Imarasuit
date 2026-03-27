'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface BalanceChartProps {
  data?: number[];
  labels?: string[];
  total?: number;
}

export default function BalanceChart({ data, labels, total }: BalanceChartProps) {
  const chartLabels = labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const chartData = useMemo(() => ({
    labels: chartLabels,
    datasets: [
      {
        fill: true,
        label: 'Balance',
        data: data || new Array(12).fill(0),
        borderColor: '#0ea5e9',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
          gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
          return gradient;
        },
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0ea5e9',
        borderWidth: 2,
      },
    ],
  }), [data, chartLabels]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
        callbacks: {
          label: (context: any) => ` ZMW ${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        grid: { color: '#f3f4f6', borderDash: [5, 5] },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          callback: (value: any) => 'K' + (value / 1000).toLocaleString(),
        },
        border: { display: false },
      },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  }), []);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full">
      <div className="mb-4 md:mb-5">
        <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-widest font-medium mb-1">Net Balance</p>
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {total != null ? `ZMW ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'ZMW 0.00'}
        </h2>
      </div>
      <div className="flex-1 min-h-[220px] md:min-h-[260px] relative">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
