'use client';

import React from 'react';
import { Bars3Icon, MoonIcon, SunIcon, BellIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui';
import { useUIStore, useThemeStore } from '@/store';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggleSidebar } = useUIStore();
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-4 lg:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          className="lg:hidden flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          onClick={toggleSidebar}
        >
          <Bars3Icon className="w-5 h-5" />
        </button>
        
        {title && (
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {actions}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-9 h-9 p-0"
        >
          {theme === 'dark' ? (
            <SunIcon className="w-5 h-5" />
          ) : (
            <MoonIcon className="w-5 h-5" />
          )}
        </Button>
        
        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 relative">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
}
