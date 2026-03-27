'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';

interface ExchangeWidgetProps {
  balance?: number;
}

export default function ExchangeWidget({ balance }: ExchangeWidgetProps) {
  const [amount] = useState('1.00');
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then((res) => res.json())
      .then((data) => {
        setRate(data.rates?.ZMW ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="bg-black text-white p-4 md:p-6 rounded-2xl border border-gray-800 shadow-lg h-full flex flex-col">
      <h3 className="text-sm md:text-base font-bold text-white mb-4">Exchange Rate</h3>
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700">
          <span className="text-[10px] md:text-sm font-bold tracking-wider">USD</span>
        </div>
        <ArrowLeftRight size={14} className="text-gray-500" />
        <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-1.5 rounded-lg border border-gray-700">
          <span className="text-[10px] md:text-sm font-bold tracking-wider">ZMW</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="text-center mb-4 md:mb-6">
          <div className="text-xl md:text-3xl font-bold mb-1">
            {loading ? '...' : `ZMW ${(parseFloat(amount || '0') * (rate || 0)).toFixed(2)}`}
          </div>
          <div className="text-xs text-gray-400">
            1 USD ≈ {rate ? rate.toFixed(2) : '...'} ZMW
          </div>
          <div className="text-xs text-primary-400 mt-1">Live Rate</div>
        </div>
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Market Rate</span>
            <span>{rate ? rate.toFixed(4) : '-'}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.location.reload()}
        className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors border border-gray-700 mt-auto"
      >
        <RefreshCw size={16} /> Refresh Rates
      </button>
    </div>
  );
}
