// Tenant Store – tracks which modules are enabled for the current tenant
import { create } from 'zustand';
import { apiFetch } from '@/lib/api-base';
import { getModules, type ModuleDefinition, type SidebarItem, type SidebarGroup } from '@/modules/registry';

interface TenantStore {
  /** Map of moduleId → enabled (from backend) */
  moduleStatus: Record<string, boolean>;
  isLoaded: boolean;
  isLoading: boolean;

  /** Fetch module status from backend. Modules with no backend row are considered enabled. */
  fetchModuleStatus: () => Promise<void>;

  /** Check if a specific module is enabled */
  isModuleEnabled: (moduleId: string) => boolean;

  /** Toggle module on/off */
  setModuleEnabled: (moduleId: string, enabled: boolean) => Promise<void>;

  /** Get list of enabled modules */
  getEnabledModules: () => ModuleDefinition[];

  /** Get sidebar items from enabled modules only */
  getEnabledSidebarItems: () => SidebarItem[];

  /** Get sidebar items grouped by enabled module */
  getEnabledSidebarGroups: () => SidebarGroup[];
}

export const useTenantStore = create<TenantStore>()((set, get) => ({
  moduleStatus: {},
  isLoaded: false,
  isLoading: false,

  fetchModuleStatus: async () => {
    if (get().isLoaded) return;
    set({ isLoading: true });
    try {
      const data = await apiFetch<{ modules: Record<string, boolean> }>('/modules');
      set({ moduleStatus: data.modules, isLoading: false, isLoaded: true });
    } catch {
      // If the endpoint doesn't exist yet (migration pending), assume all enabled
      set({ moduleStatus: {}, isLoading: false, isLoaded: true });
    }
  },

  isModuleEnabled: (moduleId) => {
    const status = get().moduleStatus[moduleId];
    // No row = enabled by default (backwards compat)
    return status !== false;
  },

  setModuleEnabled: async (moduleId, enabled) => {
    try {
      await apiFetch(`/modules/${moduleId}`, {
        method: 'PUT',
        body: JSON.stringify({ enabled }),
      });
      set((state) => ({
        moduleStatus: { ...state.moduleStatus, [moduleId]: enabled },
      }));
    } catch (err) {
      console.error('Failed to toggle module:', err);
      throw err;
    }
  },

  getEnabledModules: () => {
    const { isModuleEnabled } = get();
    return getModules().filter((m) => isModuleEnabled(m.id));
  },

  getEnabledSidebarItems: () => {
    const { isModuleEnabled } = get();
    return getModules()
      .filter((m) => isModuleEnabled(m.id))
      .flatMap((m) => m.sidebarItems);
  },

  getEnabledSidebarGroups: () => {
    const { isModuleEnabled } = get();
    return getModules()
      .filter((m) => isModuleEnabled(m.id))
      .map((m) => ({
        moduleId: m.id,
        groupName: m.groupName,
        groupIcon: m.groupIcon,
        items: m.sidebarItems,
      }));
  },
}));
