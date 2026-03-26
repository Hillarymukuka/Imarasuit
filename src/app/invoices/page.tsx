'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { Button, Modal } from '@/components/ui';
import { DocumentList, PDFColorSettings } from '@/components/documents';
import { DocumentForm } from '@/components/forms';
import { useCompanyStore, useClientsStore } from '@/store';
import { useAIContext } from '@/lib/useAIContext';
import { Document } from '@/types';

export default function InvoicesPage() {
  useAIContext('Invoices');
  const router = useRouter();
  const { company } = useCompanyStore();
  const { clients } = useClientsStore();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateNew = () => {
    if (!company) {
      alert('Please set up your company profile first');
      router.push('/company');
      return;
    }
    if (clients.length === 0) {
      alert('Please add at least one client first');
      router.push('/clients');
      return;
    }
    setShowCreateForm(true);
  };

  const handleSuccess = (doc: Document) => {
    setShowCreateForm(false);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Invoices" 
        subtitle="Create and manage your invoices"
        actions={
          <div className="flex gap-2">
            <PDFColorSettings />
            <Button 
              onClick={handleCreateNew}
              leftIcon={<PlusIcon className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">New Invoice</span>
            </Button>
          </div>
        }
      />
      
      <div className="p-4 lg:p-6">
        <DocumentList 
          type="invoice" 
          onCreateNew={handleCreateNew}
        />
      </div>

      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Create New Invoice"
        size="full"
      >
        <DocumentForm
          documentType="invoice"
          onSuccess={handleSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>
    </div>
  );
}
