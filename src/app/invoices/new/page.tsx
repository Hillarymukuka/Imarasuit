'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout';
import { DocumentForm } from '@/components/forms';
import { useCompanyStore, useClientsStore } from '@/store';
import { Document } from '@/types';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';
import { Button, Card, CardContent } from '@/components/ui';
import Link from 'next/link';

export default function NewInvoicePage() {
  const router = useRouter();
  const { company } = useCompanyStore();
  const { clients } = useClientsStore();

  const handleSuccess = (doc: Document) => {
    router.push('/invoices');
  };

  if (!company) {
    return (
      <div className="min-h-screen">
        <Header title="New Invoice" />
        <div className="p-4 lg:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Company Profile Required</h3>
              <p className="text-gray-500 mb-4">
                Please set up your company profile before creating documents.
              </p>
              <Link href="/company">
                <Button>Setup Company Profile</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="min-h-screen">
        <Header title="New Invoice" />
        <div className="p-4 lg:p-6">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <ExclamationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Clients Added</h3>
              <p className="text-gray-500 mb-4">
                Please add at least one client before creating documents.
              </p>
              <Link href="/clients">
                <Button>Add Client</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header 
        title="New Invoice" 
        subtitle="Create a new invoice for your client"
      />
      <div className="p-4 lg:p-6 max-w-4xl">
        <DocumentForm
          documentType="invoice"
          onSuccess={handleSuccess}
          onCancel={() => router.push('/invoices')}
        />
      </div>
    </div>
  );
}
