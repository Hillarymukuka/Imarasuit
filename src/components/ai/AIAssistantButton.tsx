'use client';

import React from 'react';
import { useAIAssistantStore } from '@/store/ai-store';
import { cn } from '@/lib/utils';

export function AIAssistantButton() {
  const { isOpen, togglePanel } = useAIAssistantStore();

  return (
    <button
      onClick={togglePanel}
      title="Imara AI"
      className={cn(
        'fixed bottom-5 right-5 z-30 safe-bottom safe-right',
        'w-12 h-12 rounded-2xl shadow-lg',
        'flex items-center justify-center',
        'transition-all duration-300 ease-in-out',
        'hover:scale-105 active:scale-95',
        'group',
        isOpen
          ? 'bg-gray-200 dark:bg-dark-700 text-gray-500 dark:text-gray-400 shadow-md'
          : 'bg-white dark:bg-dark-800 shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/25',
      )}
    >
      <img
        src="/Logos/Logo%20Design_icon%20Dark.svg"
        alt="Imara AI"
        className={cn(
          'w-7 h-7 object-contain transition-transform duration-300',
          !isOpen && 'group-hover:rotate-12',
        )}
      />
      {/* Pulse ring when closed */}
      {!isOpen && (
        <span className="absolute inset-0 rounded-2xl animate-ping bg-primary-500 opacity-20 pointer-events-none" />
      )}
    </button>
  );
}
