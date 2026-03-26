'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showClose = true 
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <div
        className={cn(
          'w-full bg-white dark:bg-dark-800 shadow-xl',
          'animate-scale-in',
          'rounded-t-2xl sm:rounded-xl',
          sizes[size]
        )}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-dark-700">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {showClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto -mr-2"
              >
                <XMarkIcon className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
        <div className="px-5 py-4 max-h-[82vh] sm:max-h-[75vh] overflow-y-auto pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
