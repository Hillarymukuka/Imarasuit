'use client';

import React from 'react';
import { Header } from '@/components/layout';
import { Card, CardContent, CardHeader, Button } from '@/components/ui';
import { useThemeStore, useCompanyStore, useClientsStore, useDocumentsStore } from '@/store';
import { usePDFSettingsStore } from '@/store/pdf-settings-store';
import { CURRENCIES } from '@/lib/constants';
import { MoonIcon, SunIcon, TrashIcon, ArrowDownTrayIcon, CircleStackIcon, PaintBrushIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import { useAIContext } from '@/lib/useAIContext';

export default function SettingsPage() {
  useAIContext('Settings');
  const { theme, setTheme } = useThemeStore();
  const { company } = useCompanyStore();
  const { clients } = useClientsStore();
  const { documents } = useDocumentsStore();
  const { settings: pdfSettings, setCurrency, fetchSettings } = usePDFSettingsStore();

  // Ensure PDF settings are loaded
  React.useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleExportData = () => {
    const data = {
      company,
      clients,
      documents,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `business-suite-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Settings" 
        subtitle="Configure your application preferences"
      />
      
      <div className="p-4 lg:p-6 max-w-4xl space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PaintBrushIcon className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Appearance
              </h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose between light and dark mode
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === 'light' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  leftIcon={<SunIcon className="w-4 h-4" />}
                >
                  Light
                </Button>
                <Button
                  variant={theme === 'dark' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  leftIcon={<MoonIcon className="w-4 h-4" />}
                >
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CurrencyDollarIcon className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Currency
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Document Currency</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Choose the currency shown on all documents, PDFs, and totals. Changing this updates every template.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {CURRENCIES.map((cur) => {
                  const isActive = (pdfSettings.currencyCode || 'ZMW') === cur.code;
                  return (
                    <button
                      key={cur.code}
                      onClick={() => setCurrency(cur.code)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all ${
                        isActive
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 ring-2 ring-primary-500/30'
                          : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-800'
                      }`}
                    >
                      <span className={`text-lg font-bold min-w-[28px] text-center ${
                        isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {cur.symbol}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${
                          isActive ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {cur.code}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          {cur.name}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                Currently using: <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {CURRENCIES.find(c => c.code === (pdfSettings.currencyCode || 'ZMW'))?.name || 'Zambian Kwacha'} ({pdfSettings.currencyCode || 'ZMW'})
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CircleStackIcon className="w-4 h-4 text-primary-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Data Management
              </h3>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-900 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Storage Used</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {clients.length} clients, {documents.length} documents
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(JSON.stringify({ company, clients, documents }).length / 1024).toFixed(1)} KB
                </p>
                <p className="text-xs text-gray-500">stored on server</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Export Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Download all your data as a JSON file
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleExportData}
                leftIcon={<ArrowDownTrayIcon className="w-4 h-4" />}
              >
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-700">
              <div>
                <p className="font-medium text-red-600">Clear All Data</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Permanently delete all your data
                </p>
              </div>
              <Button
                variant="danger"
                onClick={handleClearData}
                leftIcon={<TrashIcon className="w-4 h-4" />}
              >
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              About Imara Suite
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Build</span>
                <span className="font-medium">2024.12.01</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-dark-700">
                Imara Suite is a modern web application for creating and managing quotations, 
                invoices, purchase orders, and delivery notes. All data is stored securely in the cloud.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
