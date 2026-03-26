'use client';

import React, { useState } from 'react';
import { PaintBrushIcon, PlusIcon, XMarkIcon, CheckIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { Button, Input, Modal } from '@/components/ui';
import { usePDFSettingsStore } from '@/store';
import { PDF_COLOR_PRESETS } from '@/lib/constants';
import type { DocumentTemplate, DocumentType } from '@/types';

type TemplateKey = DocumentType | 'letter';

export function PDFColorSettings() {
  const { settings: pdfSettings, setSelectedColor, addCustomColor, removeCustomColor, updateSettings, setDocumentTemplate } = usePDFSettingsStore();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorPrimary, setNewColorPrimary] = useState('#0ea5e9');
  const [newColorSecondary, setNewColorSecondary] = useState('#0f172a');
  const [newColorAccent, setNewColorAccent] = useState('#38bdf8');

  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [0, 0, 0];
  };

  const handleAddCustomColor = () => {
    if (newColorName.trim()) {
      addCustomColor({
        name: newColorName.trim(),
        primary: hexToRgb(newColorPrimary),
        secondary: hexToRgb(newColorSecondary),
        accent: hexToRgb(newColorAccent),
      });
      setShowColorPicker(false);
      setNewColorName('');
    }
  };

  const allColors = [...PDF_COLOR_PRESETS, ...pdfSettings.customColors];
  const selectedColor = allColors.find(c => c.id === pdfSettings.selectedColorId) || PDF_COLOR_PRESETS[0];

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSettings(true)}
        leftIcon={<PaintBrushIcon className="w-4 h-4" />}
      >
        <span className="hidden sm:inline">PDF Theme</span>
        <div 
          className="w-4 h-4 rounded-full ml-1 border border-gray-300" 
          style={{ backgroundColor: `rgb(${selectedColor.primary.join(',')})` }}
        />
      </Button>

      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="PDF Settings"
        size="lg"
      >
        <div className="space-y-6">
          {/* Color Theme Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Color Theme
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowColorPicker(true)}
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add Custom
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`relative p-3 rounded-xl border-2 transition-all ${
                    pdfSettings.selectedColorId === color.id
                      ? 'border-primary-500 bg-gray-50 dark:bg-dark-700'
                      : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                  }`}
                >
                  {color.id.startsWith('custom-') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomColor(color.id);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 z-10"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                  <div className="flex gap-1 mb-2">
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: `rgb(${color.primary.join(',')})` }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: `rgb(${color.secondary.join(',')})` }}
                    />
                    <div
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: `rgb(${color.accent.join(',')})` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate block">
                    {color.name}
                  </span>
                  {pdfSettings.selectedColorId === color.id && (
                    <CheckIcon className="absolute top-2 right-2 w-4 h-4 text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Settings */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Logo Settings
            </label>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfSettings.showLogo}
                  onChange={(e) => updateSettings({ showLogo: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Logo</span>
              </label>
              <select
                value={pdfSettings.logoSize}
                onChange={(e) => updateSettings({ logoSize: e.target.value as 'small' | 'medium' | 'large' })}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          {/* Additional Options */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Display Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfSettings.showBankInfo}
                  onChange={(e) => updateSettings({ showBankInfo: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Bank Info on Invoices</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pdfSettings.showTerms}
                  onChange={(e) => updateSettings({ showTerms: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Show Notes & Terms</span>
              </label>
            </div>
          </div>

          {/* Footer Text */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
            <Input
              label="PDF Footer Text"
              value={pdfSettings.footerText}
              onChange={(e) => updateSettings({ footerText: e.target.value })}
              placeholder="This document was generated electronically..."
            />
          </div>

          {/* Document Templates */}
          <div className="border-t border-gray-200 dark:border-dark-700 pt-4">
            <div className="flex items-center gap-2 mb-1">
              <DocumentTextIcon className="w-4 h-4 text-primary-600" />
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Document Templates
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Choose a layout for each document type. Templates use your selected colour theme.
            </p>
            <div className="space-y-5">
              {([
                { key: 'quotation' as TemplateKey, label: 'Quotation' },
                { key: 'invoice' as TemplateKey, label: 'Invoice' },
                { key: 'purchase_order' as TemplateKey, label: 'Purchase Order' },
                { key: 'delivery_note' as TemplateKey, label: 'Delivery Note' },
                { key: 'letter' as TemplateKey, label: 'Letter' },
              ]).map(({ key, label }) => {
                const currentTemplate = pdfSettings.documentTemplates?.[key] ?? 'standard';
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['standard', 'corporate', 'classic', 'modern'] as DocumentTemplate[]).map((tmpl) => {
                        const active = currentTemplate === tmpl;
                        const pr = selectedColor.primary;
                        const sc = selectedColor.secondary;
                        return (
                          <button
                            key={tmpl}
                            onClick={() => setDocumentTemplate(key as TemplateKey, tmpl)}
                            className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                              active
                                ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                                : 'border-gray-200 dark:border-dark-600 hover:border-primary-300'
                            }`}
                          >
                            {/* Thumbnail preview */}
                            <div className="w-full h-20 bg-white dark:bg-dark-900 relative overflow-hidden">
                              {tmpl === 'standard' ? (
                                // Standard: clean header text + simple table
                                <div className="p-2 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <div className="space-y-0.5">
                                      <div className="h-2 w-14 rounded" style={{ backgroundColor: `rgb(${sc.join(',')})` }} />
                                      <div className="h-1 w-10 bg-gray-200 rounded" />
                                    </div>
                                    <div className="text-right space-y-0.5">
                                      <div className="h-1.5 w-12 rounded ml-auto" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                      <div className="h-1 w-8 bg-gray-200 rounded ml-auto" />
                                    </div>
                                  </div>
                                  <div className="flex gap-1 mt-1">
                                    <div className="flex-1 space-y-0.5">
                                      <div className="h-1 w-9 bg-gray-300 rounded" />
                                      <div className="h-1 w-7 bg-gray-200 rounded" />
                                    </div>
                                    <div className="flex-1 space-y-0.5 text-right">
                                      <div className="h-1 w-9 bg-gray-300 rounded ml-auto" />
                                      <div className="h-1 w-7 bg-gray-200 rounded ml-auto" />
                                    </div>
                                  </div>
                                  <div className="h-3.5 w-full rounded mt-1" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                  <div className="h-1 w-full bg-gray-100 rounded" />
                                  <div className="h-1 w-4/5 bg-gray-100 rounded" />
                                  <div className="h-3 w-2/5 rounded ml-auto" style={{ backgroundColor: `rgb(${pr.join(',')})`, opacity: 0.85 }} />
                                </div>
                              ) : tmpl === 'corporate' ? (
                                // Corporate: dark header bar, info boxes, striped table
                                <div>
                                  <div className="h-6 w-full flex items-center justify-between px-2" style={{ backgroundColor: `rgb(${sc.join(',')})` }}>
                                    <div className="h-1.5 w-12 bg-white/70 rounded" />
                                    <div className="h-1.5 w-10 bg-white/60 rounded" />
                                  </div>
                                  <div className="p-1.5 space-y-1">
                                    <div className="flex gap-1.5">
                                      <div className="flex-1 h-6 rounded border border-gray-200 bg-gray-50 overflow-hidden">
                                        <div className="h-2 w-full" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                        <div className="p-0.5 space-y-0.5">
                                          <div className="h-1 w-8 bg-gray-300 rounded" />
                                          <div className="h-1 w-6 bg-gray-200 rounded" />
                                        </div>
                                      </div>
                                      <div className="flex-1 h-6 rounded border border-gray-200 bg-gray-50 overflow-hidden">
                                        <div className="h-2 w-full opacity-80" style={{ backgroundColor: `rgb(${sc.join(',')})` }} />
                                        <div className="p-0.5 space-y-0.5">
                                          <div className="h-1 w-8 bg-gray-300 rounded" />
                                          <div className="h-1 w-6 bg-gray-200 rounded" />
                                        </div>
                                      </div>
                                    </div>
                                    <div className="h-3 w-full rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                    <div className="h-1 w-full bg-gray-100 rounded" />
                                    <div className="h-1 w-full" style={{ backgroundColor: `rgb(${pr.join(',')})`, opacity: 0.12 }} />
                                    <div className="h-2.5 w-1/3 rounded ml-auto" style={{ backgroundColor: `rgb(${pr.join(',')})`, opacity: 0.9 }} />
                                  </div>
                                </div>
                              ) : tmpl === 'classic' ? (
                                // Classic: white bg, FROM/TO left, large title right in primary color
                                <div className="p-2">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                      <div className="h-1 w-6 rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                      <div className="h-1.5 w-14 bg-gray-800 rounded" />
                                      <div className="h-1 w-10 bg-gray-200 rounded" />
                                      <div className="h-1 w-8 bg-gray-200 rounded" />
                                    </div>
                                    <div className="text-right">
                                      <div className="h-4 w-10 rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                    </div>
                                  </div>
                                  <div className="mt-1 border-t pt-1" style={{ borderColor: `rgb(${pr.join(',')})` }}>
                                    <div className="flex justify-between">
                                      <div className="space-y-0.5">
                                        <div className="h-1 w-5 rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                        <div className="h-1.5 w-12 bg-gray-700 rounded" />
                                        <div className="h-1 w-9 bg-gray-200 rounded" />
                                      </div>
                                      <div className="text-right space-y-0.5">
                                        <div className="h-1 w-8 bg-gray-300 rounded ml-auto" />
                                        <div className="h-1 w-10 bg-gray-200 rounded ml-auto" />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-1 h-3 w-full rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                  <div className="mt-0.5 flex justify-end">
                                    <div className="h-2 w-1/3 bg-gray-100 rounded" />
                                  </div>
                                </div>
                              ) : (
                                // Modern: dark header full-width, accent stripe, prominent amount
                                <div>
                                  <div className="h-7 w-full flex items-center justify-between px-2" style={{ backgroundColor: `rgb(${sc.join(',')})` }}>
                                    <div className="space-y-0.5">
                                      <div className="h-1.5 w-12 bg-white/75 rounded" />
                                      <div className="h-1 w-8 bg-white/40 rounded" />
                                    </div>
                                    <div className="h-3 w-9 bg-white/80 rounded" />
                                  </div>
                                  <div className="flex">
                                    <div className="h-1 flex-1" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                    <div className="h-1 w-1/3" style={{ backgroundColor: `rgb(${sc.join(',')})` }} />
                                  </div>
                                  <div className="px-1.5 pt-1 flex justify-between items-start">
                                    <div className="space-y-0.5">
                                      <div className="h-1 w-7 rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                      <div className="h-2 w-14 bg-gray-800 rounded" />
                                      <div className="h-1 w-10 bg-gray-200 rounded" />
                                    </div>
                                    <div className="text-right space-y-0.5">
                                      <div className="h-1 w-8 bg-gray-300 rounded ml-auto" />
                                      <div className="h-2.5 w-11 rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                    </div>
                                  </div>
                                  <div className="mt-1 mx-1.5 h-3 w-full rounded" style={{ backgroundColor: `rgb(${pr.join(',')})` }} />
                                  <div className="mt-0.5 mx-1.5 flex justify-end">
                                    <div className="h-2 w-1/3 rounded" style={{ backgroundColor: `rgb(${sc.join(',')})`, opacity: 0.9 }} />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Label + check */}
                            <div className={`flex items-center justify-between px-3 py-2 ${
                              active ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-dark-800'
                            }`}>
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize">
                                {tmpl === 'standard' ? 'Standard' : tmpl === 'corporate' ? 'Corporate' : tmpl === 'classic' ? 'Classic' : 'Modern'}
                              </span>
                              <span className="text-xs text-gray-400">
                                {tmpl === 'standard' ? 'Clean' : tmpl === 'corporate' ? 'Bold' : tmpl === 'classic' ? 'Traditional' : 'Impact'}
                              </span>
                              {active && <CheckIcon className="w-4 h-4 text-primary-500 ml-1" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-dark-700">
            <Button onClick={() => setShowSettings(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Color Picker Modal */}
      {showColorPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create Custom Color Theme
            </h3>
            <div className="space-y-4">
              <Input
                label="Theme Name"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder="My Custom Theme"
              />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary
                  </label>
                  <input
                    type="color"
                    value={newColorPrimary}
                    onChange={(e) => setNewColorPrimary(e.target.value)}
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Secondary
                  </label>
                  <input
                    type="color"
                    value={newColorSecondary}
                    onChange={(e) => setNewColorSecondary(e.target.value)}
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Accent
                  </label>
                  <input
                    type="color"
                    value={newColorAccent}
                    onChange={(e) => setNewColorAccent(e.target.value)}
                    className="w-full h-12 rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-dark-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
                <div className="flex gap-2">
                  <div
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: newColorPrimary }}
                  />
                  <div
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: newColorSecondary }}
                  />
                  <div
                    className="flex-1 h-8 rounded"
                    style={{ backgroundColor: newColorAccent }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowColorPicker(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleAddCustomColor}
                disabled={!newColorName.trim()}
              >
                Add Theme
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
