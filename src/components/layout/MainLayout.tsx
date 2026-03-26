'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useThemeStore } from '@/store';
import { cn } from '@/lib/utils';
import { AIAssistantPanel, AIAssistantButton } from '@/components/ai';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={cn(
      'min-h-screen',
      'transition-colors duration-200'
    )}>
      <div className="flex h-screen min-h-screen-ios overflow-hidden bg-gray-50 dark:bg-dark-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* AI Assistant – available globally */}
      <AIAssistantButton />
      <AIAssistantPanel />
    </div>
  );
}
