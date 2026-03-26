'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BuildingOffice2Icon, ArrowUpTrayIcon, XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { Button, Input, Textarea, Card, CardContent, CardHeader } from '@/components/ui';
import { useCompanyStore } from '@/store';
import { generateId, readFileAsDataURL } from '@/lib/utils';
import { CompanyProfile } from '@/types';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address'),
  website: z.string().optional(),
  tin: z.string().min(1, 'Tax ID is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  routingNumber: z.string().min(1, 'Routing number is required'),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

export function CompanyForm() {
  const { company, setCompany, updateCompany } = useCompanyStore();
  const [logo, setLogo] = useState<string | undefined>(company?.logo);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: company ? {
      name: company.name,
      street: company.address.street,
      city: company.address.city,
      state: company.address.state,
      postalCode: company.address.postalCode,
      country: company.address.country,
      phone: company.phone,
      email: company.email,
      website: company.website,
      tin: company.tin,
      bankName: company.bankInfo.bankName,
      accountName: company.bankInfo.accountName,
      accountNumber: company.bankInfo.accountNumber,
      routingNumber: company.bankInfo.routingNumber,
      swiftCode: company.bankInfo.swiftCode,
      iban: company.bankInfo.iban,
    } : undefined,
  });

  // Reset form when company data changes (e.g., after save)
  useEffect(() => {
    if (company) {
      reset({
        name: company.name,
        street: company.address.street,
        city: company.address.city,
        state: company.address.state,
        postalCode: company.address.postalCode,
        country: company.address.country,
        phone: company.phone,
        email: company.email,
        website: company.website,
        tin: company.tin,
        bankName: company.bankInfo.bankName,
        accountName: company.bankInfo.accountName,
        accountNumber: company.bankInfo.accountNumber,
        routingNumber: company.bankInfo.routingNumber,
        swiftCode: company.bankInfo.swiftCode,
        iban: company.bankInfo.iban,
      });
      setLogo(company.logo);
    }
  }, [company, reset]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await readFileAsDataURL(file);
      setLogo(dataUrl);
    }
  };

  const removeLogo = () => {
    setLogo(undefined);
  };

  const onSubmit = async (data: CompanyFormData) => {
    const now = new Date().toISOString();
    const companyData: CompanyProfile = {
      id: company?.id || generateId(),
      name: data.name,
      logo,
      address: {
        street: data.street,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
      },
      phone: data.phone,
      email: data.email,
      website: data.website,
      tin: data.tin,
      bankInfo: {
        bankName: data.bankName,
        accountName: data.accountName,
        accountNumber: data.accountNumber,
        routingNumber: data.routingNumber,
        swiftCode: data.swiftCode,
        iban: data.iban,
      },
      createdAt: company?.createdAt || now,
      updatedAt: now,
    };

    if (company) {
      await updateCompany(companyData);
    } else {
      setCompany(companyData);
    }
    
    // Show success message
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Success Toast */}
      {saveSuccess && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-green-500 text-white rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <CheckCircleIcon className="w-5 h-5" />
          <span className="font-medium">Company profile saved successfully!</span>
        </div>
      )}
      
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BuildingOffice2Icon className="w-5 h-5" />
            Company Logo
          </h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {logo ? (
              <div className="relative">
                <img
                  src={logo}
                  alt="Company logo"
                  className="w-24 h-24 object-contain rounded-lg border border-gray-200 dark:border-dark-600"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                <ArrowUpTrayIcon className="w-6 h-6 text-gray-400" />
                <span className="text-xs text-gray-500 mt-1">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Upload your company logo</p>
              <p>Recommended: 200x200px, PNG or JPG</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Company Details
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Company Name"
            {...register('name')}
            error={errors.name?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              {...register('phone')}
              error={errors.phone?.message}
            />
            <Input
              label="Email"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Website"
              {...register('website')}
              error={errors.website?.message}
              placeholder="https://"
            />
            <Input
              label="Tax ID (TIN)"
              {...register('tin')}
              error={errors.tin?.message}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Address
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Street Address"
            {...register('street')}
            error={errors.street?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              {...register('city')}
              error={errors.city?.message}
            />
            <Input
              label="State / Province"
              {...register('state')}
              error={errors.state?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Postal Code"
              {...register('postalCode')}
              error={errors.postalCode?.message}
            />
            <Input
              label="Country"
              {...register('country')}
              error={errors.country?.message}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Bank Information
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bank Name"
              {...register('bankName')}
              error={errors.bankName?.message}
            />
            <Input
              label="Account Name"
              {...register('accountName')}
              error={errors.accountName?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Account Number"
              {...register('accountNumber')}
              error={errors.accountNumber?.message}
            />
            <Input
              label="Routing Number"
              {...register('routingNumber')}
              error={errors.routingNumber?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="SWIFT Code (optional)"
              {...register('swiftCode')}
              error={errors.swiftCode?.message}
            />
            <Input
              label="IBAN (optional)"
              {...register('iban')}
              error={errors.iban?.message}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting}>
          {company ? 'Update Company' : 'Save Company'}
        </Button>
      </div>
    </form>
  );
}
