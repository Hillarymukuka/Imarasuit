'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { MainLayout } from './MainLayout';
import { useAuthStore } from '@/store/auth-store';
import { useDataInit } from '@/lib/useDataInit';

const AUTH_PAGES = ['/login', '/signup'];

// All app routes to prefetch after login so navigation is instant
const APP_ROUTES = [
  '/invoices',
  '/quotations',
  '/purchase-orders',
  '/delivery-notes',
  '/letters',
  '/clients',
  '/settings',
  '/company',
  '/logistics',
];

function LayoutSwitch({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuthStore();
  const isAuthPage = AUTH_PAGES.includes(pathname);

  // Initialize all data stores once the user is authenticated
  useDataInit();

  // Eagerly prefetch all app routes so first navigation is instant
  React.useEffect(() => {
    if (!user) return;
    // Brief delay to let the initial page render, then prefetch everything
    const timer = setTimeout(() => {
      APP_ROUTES.forEach((route) => router.prefetch(route));
    }, 100);
    return () => clearTimeout(timer);
  }, [user, router]);

  // Auth pages (login/signup) render without the sidebar layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  // All other pages render with the full app layout (sidebar + header)
  if (user) {
    return <MainLayout>{children}</MainLayout>;
  }

  // Not authenticated and not on auth page - AuthProvider will redirect
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutSwitch>{children}</LayoutSwitch>
    </AuthProvider>
  );
}
