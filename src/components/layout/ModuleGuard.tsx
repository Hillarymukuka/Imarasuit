'use client';

import React from 'react';
import { useTenantStore } from '@/store';

interface ModuleGuardProps {
  moduleId: string;
  children: React.ReactNode;
}

/**
 * Wraps a page that belongs to a specific module.
 * If the module is disabled for this tenant, shows a friendly message instead of the page.
 */
export function ModuleGuard({ moduleId, children }: ModuleGuardProps) {
  const { isModuleEnabled, isLoaded } = useTenantStore();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isModuleEnabled(moduleId)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-gray-400 text-lg font-medium mb-2">
          Module not available
        </div>
        <p className="text-gray-500 text-sm max-w-md">
          This feature is not enabled for your organisation. Contact your administrator to enable it.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
