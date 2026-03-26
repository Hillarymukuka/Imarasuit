'use client';

import React from 'react';
import { Header } from '@/components/layout';
import { CompanyForm } from '@/components/forms';
import { useCompanyStore } from '@/store';
import { BuildingOffice2Icon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAIContext } from '@/lib/useAIContext';

export default function CompanyPage() {
  useAIContext('Company Profile');
  const { company } = useCompanyStore();

  return (
    <div className="min-h-screen">
      <Header 
        title="Company Profile" 
        subtitle="Manage your company information that appears on all documents"
      />
      
      <div className="p-4 lg:p-6 max-w-4xl">
        {company && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <p className="text-green-800 dark:text-green-200">
              Your company profile is set up. You can update it anytime.
            </p>
          </div>
        )}
        
        <CompanyForm />
      </div>
    </div>
  );
}
