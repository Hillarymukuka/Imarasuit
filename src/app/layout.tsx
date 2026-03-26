import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'Imara Suite - Quotations, Invoices, Purchase Orders & Delivery Notes',
  description: 'Modern business document management system for creating and managing quotations, invoices, purchase orders, and delivery notes.',
};

// Enable viewport-fit=cover so iOS safe-area-inset-* env vars are available
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@200,300,400,500,600,700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-general-sans">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
