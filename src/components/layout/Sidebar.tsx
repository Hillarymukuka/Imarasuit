'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Squares2X2Icon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  ShoppingCartIcon,
  TruckIcon,
  UsersIcon,
  BuildingOffice2Icon,
  Cog6ToothIcon,
  XMarkIcon,
  EnvelopeIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CubeIcon,
  MapPinIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  ChevronDownIcon,
  MegaphoneIcon,
  PencilSquareIcon,
  RocketLaunchIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';
import { useUIStore, useTenantStore } from '@/store';
import { useAuthStore } from '@/store/auth-store';
import type { SidebarItem, SidebarGroup } from '@/modules/registry';

// Map icon names from module manifests to actual Heroicon components
const ICON_MAP: Record<string, React.ReactNode> = {
  DocumentTextIcon: <DocumentTextIcon className="w-[18px] h-[18px]" />,
  CurrencyDollarIcon: <ReceiptPercentIcon className="w-[18px] h-[18px]" />,
  ShoppingCartIcon: <ShoppingCartIcon className="w-[18px] h-[18px]" />,
  TruckIcon: <TruckIcon className="w-[18px] h-[18px]" />,
  EnvelopeIcon: <EnvelopeIcon className="w-[18px] h-[18px]" />,
  UsersIcon: <UsersIcon className="w-[18px] h-[18px]" />,
  CubeIcon: <CubeIcon className="w-[18px] h-[18px]" />,
  MapPinIcon: <MapPinIcon className="w-[18px] h-[18px]" />,
  BuildingOffice2Icon: <BuildingOffice2Icon className="w-[18px] h-[18px]" />,
  ArchiveBoxIcon: <ArchiveBoxIcon className="w-[18px] h-[18px]" />,
  UserGroupIcon: <UserGroupIcon className="w-[18px] h-[18px]" />,
  MegaphoneIcon: <MegaphoneIcon className="w-[18px] h-[18px]" />,
  PencilSquareIcon: <PencilSquareIcon className="w-[18px] h-[18px]" />,
  RocketLaunchIcon: <RocketLaunchIcon className="w-[18px] h-[18px]" />,
  CalendarDaysIcon: <CalendarDaysIcon className="w-[18px] h-[18px]" />,
  Cog6ToothIcon: <Cog6ToothIcon className="w-[18px] h-[18px]" />,
};

function resolveIcon(name: string): React.ReactNode {
  return ICON_MAP[name] || <CubeIcon className="w-[18px] h-[18px]" />;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// Static core items (always shown)
const coreNav: NavItem[] = [
  { href: '/', label: 'Overview', icon: <Squares2X2Icon className="w-[18px] h-[18px]" /> },
];

const generalNav: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: <Cog6ToothIcon className="w-[18px] h-[18px]" /> },
  { href: '/company', label: 'Company Profile', icon: <ShieldCheckIcon className="w-[18px] h-[18px]" /> },
];

function NavLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm group',
        isActive
          ? 'bg-white/20 text-white font-medium'
          : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'
      )}
    >
      <span className={cn(
        'transition-colors flex-shrink-0',
        isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
      )}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-primary-500 text-white rounded-full leading-none">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { user, company, logout } = useAuthStore();
  const pathname = usePathname();
  const { getEnabledSidebarGroups } = useTenantStore();

  // Close sidebar on mobile after clicking a nav link
  const closeMobileSidebar = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  // Build grouped module nav from the tenant-aware registry
  const sidebarGroups = getEnabledSidebarGroups();

  // Track which groups are collapsed (default: all expanded)
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (moduleId: string) =>
    setCollapsed((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));

  // Check if any item in a group is currently active
  const isGroupActive = (group: SidebarGroup) =>
    group.items.some((item) => pathname === item.href || pathname.startsWith(item.href + '/'));

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full min-h-screen-ios w-60 bg-dark-900',
          'lg:sticky lg:top-0 lg:z-auto lg:h-screen flex-shrink-0',
          'transition-transform duration-300 ease-in-out lg:transition-none lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">

          {/* Logo */}
          <div className="flex items-center justify-between h-36 px-5">
            <Link href="/" className="flex items-center">
              <img
                src="/Logos/Logo%20Design_word%20mark%20light.svg"
                alt="Imara Suite"
                className="h-24 w-auto max-w-[180px]"
              />
            </Link>
            <button
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-hide">

            {/* Core: Overview */}
            <nav className="space-y-0.5 mb-2">
              {coreNav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href}
                  onClick={closeMobileSidebar}
                />
              ))}
            </nav>

            {/* Module groups */}
            {sidebarGroups.map((group) => {
              const isOpen = !collapsed[group.moduleId];
              const active = isGroupActive(group);

              return (
                <div key={group.moduleId} className="mb-1">
                  {/* Group header — clickable to collapse/expand */}
                  <button
                    onClick={() => toggle(group.moduleId)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-widest transition-colors',
                      active
                        ? 'text-primary-400'
                        : 'text-gray-500 hover:text-gray-300'
                    )}
                  >
                    {group.groupIcon && (
                      <span className="flex-shrink-0 opacity-60">
                        {resolveIcon(group.groupIcon)}
                      </span>
                    )}
                    <span className="flex-1 text-left">{group.groupName}</span>
                    <ChevronDownIcon
                      className={cn(
                        'w-3.5 h-3.5 transition-transform duration-200',
                        isOpen ? '' : '-rotate-90'
                      )}
                    />
                  </button>

                  {/* Group items */}
                  {isOpen && (
                    <nav className="space-y-0.5 ml-1 border-l border-white/5 pl-2">
                      {group.items.map((item) => {
                        // Exact match always wins
                        let itemActive = pathname === item.href;
                        // Prefix match, but only if no other sibling matches more specifically
                        if (!itemActive && pathname.startsWith(item.href + '/')) {
                          const hasBetterMatch = group.items.some(
                            (other) =>
                              other.href !== item.href &&
                              other.href.length > item.href.length &&
                              (pathname === other.href || pathname.startsWith(other.href + '/'))
                          );
                          itemActive = !hasBetterMatch;
                        }
                        return (
                          <NavLink
                            key={item.href}
                            item={{
                              href: item.href,
                              label: item.label,
                              icon: resolveIcon(item.icon),
                            }}
                            isActive={itemActive}
                            onClick={closeMobileSidebar}
                          />
                        );
                      })}
                    </nav>
                  )}
                </div>
              );
            })}

            {/* Divider */}
            <div className="my-3 border-t border-white/5" />

            {/* GENERAL section */}
            <div>
              <p className="px-3 mb-2 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                General
              </p>
              <nav className="space-y-0.5">
                {generalNav.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={pathname === item.href}
                    onClick={closeMobileSidebar}
                  />
                ))}
              </nav>
            </div>

          </div>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-600/30 rounded-full flex items-center justify-center flex-shrink-0 border border-primary-500/30">
                <span className="text-sm font-bold text-primary-400">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-[11px] text-gray-500 truncate">
                  {user?.email || company?.email || ''}
                </p>
              </div>
              <button
                onClick={() => { logout(); window.location.href = '/login'; }}
                title="Sign Out"
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors flex-shrink-0"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}
