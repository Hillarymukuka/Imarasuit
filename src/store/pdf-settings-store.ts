// PDF Settings Store - backed by API
import { create } from 'zustand';
import {
  PDFColor,
  PDFTemplate,
  PDFSettings,
  DocumentTemplate,
  DocumentType,
} from '@/types';
import { generateId } from '@/lib/utils';
import { DEFAULT_PDF_SETTINGS, PDF_COLOR_PRESETS } from '@/lib/constants';
import { settingsAPI } from '@/lib/api-client';

interface PDFSettingsStore {
  settings: PDFSettings;
  isLoading: boolean;
  isLoaded: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (updates: Partial<PDFSettings>) => Promise<void>;
  setSelectedColor: (colorId: string) => Promise<void>;
  setTemplate: (template: PDFTemplate) => Promise<void>;
  setDocumentTemplate: (type: DocumentType | 'letter', template: DocumentTemplate) => Promise<void>;
  setCurrency: (currencyCode: string) => Promise<void>;
  addCustomColor: (color: Omit<PDFColor, 'id'>) => Promise<void>;
  removeCustomColor: (colorId: string) => Promise<void>;
  updateCustomColor: (colorId: string, updates: Partial<PDFColor>) => Promise<void>;
  getActiveColor: () => PDFColor;
  resetSettings: () => Promise<void>;
}

export const usePDFSettingsStore = create<PDFSettingsStore>()((set, get) => ({
  settings: DEFAULT_PDF_SETTINGS,
  isLoading: false,
  isLoaded: false,

  fetchSettings: async () => {
    if (get().isLoaded) return;
    set({ isLoading: true });
    try {
      const settings = await settingsAPI.getPDF();
      set({ settings: { ...DEFAULT_PDF_SETTINGS, ...settings }, isLoading: false, isLoaded: true });
    } catch {
      set({ isLoading: false, isLoaded: true });
    }
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch (err) { console.error('Failed to save settings:', err); }
  },

  setSelectedColor: async (colorId) => {
    const newSettings = { ...get().settings, selectedColorId: colorId };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  setTemplate: async (template) => {
    const newSettings = { ...get().settings, template };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  setDocumentTemplate: async (type, template) => {
    const s = get().settings;
    const newSettings = {
      ...s,
      documentTemplates: {
        ...(s.documentTemplates ?? { quotation: 'standard', invoice: 'standard', purchase_order: 'standard', delivery_note: 'standard', letter: 'standard' }),
        [type]: template,
      },
    };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  setCurrency: async (currencyCode) => {
    const newSettings = { ...get().settings, currencyCode };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  addCustomColor: async (color) => {
    const newColor: PDFColor = { ...color, id: `custom-${generateId()}` };
    const newSettings = {
      ...get().settings,
      customColors: [...get().settings.customColors, newColor],
      selectedColorId: newColor.id,
    };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  removeCustomColor: async (colorId) => {
    const s = get().settings;
    const newSettings = {
      ...s,
      customColors: s.customColors.filter(c => c.id !== colorId),
      selectedColorId: s.selectedColorId === colorId ? 'blue' : s.selectedColorId,
    };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  updateCustomColor: async (colorId, updates) => {
    const s = get().settings;
    const newSettings = {
      ...s,
      customColors: s.customColors.map(c => c.id === colorId ? { ...c, ...updates } : c),
    };
    set({ settings: newSettings });
    try { await settingsAPI.updatePDF(newSettings); } catch {}
  },

  getActiveColor: () => {
    const { settings } = get();
    return PDF_COLOR_PRESETS.find(c => c.id === settings.selectedColorId)
      || settings.customColors.find(c => c.id === settings.selectedColorId)
      || PDF_COLOR_PRESETS[0];
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_PDF_SETTINGS });
    try { await settingsAPI.updatePDF(DEFAULT_PDF_SETTINGS); } catch {}
  },
}));
