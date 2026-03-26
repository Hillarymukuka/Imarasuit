// Logistics frontend module manifest
import type { SidebarItem } from '@/modules/registry';

export const MODULE_ID = 'logistics';
export const MODULE_NAME = 'Logistics';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { label: 'Dashboard', href: '/logistics', icon: 'TruckIcon' },
  { label: 'Shipments', href: '/logistics/shipments', icon: 'CubeIcon' },
  { label: 'Containers', href: '/logistics/containers', icon: 'ArchiveBoxIcon' },
  { label: 'Riders', href: '/logistics/riders', icon: 'UserGroupIcon' },
  { label: 'Deliveries', href: '/logistics/deliveries', icon: 'MapPinIcon' },
  { label: 'Reports', href: '/logistics/reports', icon: 'ChartBarIcon' },
  { label: 'Tracking', href: '/logistics/tracking', icon: 'MagnifyingGlassIcon' },
];

// Re-export all module pieces for convenience
export * from './types';
export * from './api';
export { useShipmentsStore, useContainersStore, useRidersStore, useDeliveriesStore, useReportsStore } from './store';
