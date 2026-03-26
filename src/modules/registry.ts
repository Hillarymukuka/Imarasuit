// Module Registry – central catalogue of all available modules.
// Phase 2 will add tenant-aware enable/disable logic.

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  /** Group label shown in the sidebar (e.g. "Logistics", "Documents") */
  groupName: string;
  /** Icon name for the group header */
  groupIcon?: string;
  sidebarItems: SidebarItem[];
  /** Zustand store initialisers to call on app boot (if module is enabled) */
  initStores?: () => Promise<void>;
}

export interface SidebarItem {
  label: string;
  href: string;
  /** Heroicons component name (resolved by Sidebar at render time) */
  icon: string;
}

/** A group of sidebar items belonging to one module */
export interface SidebarGroup {
  moduleId: string;
  groupName: string;
  groupIcon?: string;
  items: SidebarItem[];
}

// Import module manifests
import * as businessDocuments from '@/modules/business-documents';
import * as logistics from '@/modules/logistics';
import * as marketing from '@/modules/marketing';
import * as financials from '@/modules/financials';

// Static registry – new modules are added here
const modules: ModuleDefinition[] = [
  {
    id: businessDocuments.MODULE_ID,
    name: businessDocuments.MODULE_NAME,
    description: businessDocuments.MODULE_DESCRIPTION,
    groupName: 'Documents',
    groupIcon: 'DocumentTextIcon',
    sidebarItems: businessDocuments.SIDEBAR_ITEMS,
  },
  {
    id: logistics.MODULE_ID,
    name: logistics.MODULE_NAME,
    description: 'Shipments, containers, motorcycle deliveries & GPS tracking',
    groupName: 'Logistics',
    groupIcon: 'TruckIcon',
    sidebarItems: logistics.SIDEBAR_ITEMS,
  },
  {
    id: marketing.MODULE_ID,
    name: marketing.MODULE_NAME,
    description: marketing.MODULE_DESCRIPTION,
    groupName: 'Marketing',
    groupIcon: 'MegaphoneIcon',
    sidebarItems: marketing.SIDEBAR_ITEMS,
  },
  {
    id: financials.MODULE_ID,
    name: financials.MODULE_NAME,
    description: financials.MODULE_DESCRIPTION,
    groupName: 'Financials',
    groupIcon: 'BanknotesIcon',
    sidebarItems: financials.SIDEBAR_ITEMS,
  },
];

/**
 * Get all registered modules.
 * In Phase 2 this will be filtered by tenant's enabled modules.
 */
export function getModules(): ModuleDefinition[] {
  return modules;
}

/**
 * Get a module by id.
 */
export function getModule(id: string): ModuleDefinition | undefined {
  return modules.find((m) => m.id === id);
}

/**
 * Get all sidebar items from all enabled modules.
 */
export function getAllSidebarItems(): SidebarItem[] {
  return modules.flatMap((m) => m.sidebarItems);
}

/**
 * Get sidebar items grouped by module.
 */
export function getAllSidebarGroups(): SidebarGroup[] {
  return modules.map((m) => ({
    moduleId: m.id,
    groupName: m.groupName,
    groupIcon: m.groupIcon,
    items: m.sidebarItems,
  }));
}
