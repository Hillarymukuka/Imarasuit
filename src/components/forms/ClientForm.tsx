'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Textarea, Card, CardContent, CardHeader } from '@/components/ui';
import { useClientsStore } from '@/store';
import { Client } from '@/types';

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  contactPerson: z.string().optional(),
  email: z.union([z.string().email('Invalid email address'), z.literal('')]).optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  tin: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  client?: Client;
  onSuccess?: (client: Client) => void;
  onCancel?: () => void;
}

export function ClientForm({ client, onSuccess, onCancel }: ClientFormProps) {
  const { addClient, updateClient } = useClientsStore();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      name: client.name,
      contactPerson: client.contactPerson ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      street: client.address.street ?? '',
      city: client.address.city ?? '',
      state: client.address.state ?? '',
      postalCode: client.address.postalCode ?? '',
      country: client.address.country ?? '',
      tin: client.tin,
      notes: client.notes,
    } : undefined,
  });

  const onSubmit = async (data: ClientFormData) => {
    const clientData = {
      name: data.name,
      contactPerson: data.contactPerson ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      address: {
        street: data.street ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        postalCode: data.postalCode ?? '',
        country: data.country ?? '',
      },
      tin: data.tin,
      notes: data.notes,
    };

    if (client) {
      await updateClient(client.id, clientData);
      onSuccess?.({ ...client, ...clientData, updatedAt: new Date().toISOString() });
    } else {
      const newClient = await addClient(clientData);
      reset();
      onSuccess?.(newClient);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Client Details
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Client / Company Name"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            label="Contact Person (optional)"
            {...register('contactPerson')}
            error={errors.contactPerson?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email (optional)"
              type="email"
              {...register('email')}
              error={errors.email?.message}
            />
            <Input
              label="Phone (optional)"
              {...register('phone')}
              error={errors.phone?.message}
            />
          </div>
          <Input
            label="Tax ID (optional)"
            {...register('tin')}
            error={errors.tin?.message}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Address
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Street Address (optional)"
            {...register('street')}
            error={errors.street?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City (optional)"
              {...register('city')}
              error={errors.city?.message}
            />
            <Input
              label="State / Province (optional)"
              {...register('state')}
              error={errors.state?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Postal Code (optional)"
              {...register('postalCode')}
              error={errors.postalCode?.message}
            />
            <Input
              label="Country (optional)"
              {...register('country')}
              error={errors.country?.message}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Additional Info
          </h3>
        </CardHeader>
        <CardContent>
          <Textarea
            label="Notes (optional)"
            {...register('notes')}
            error={errors.notes?.message}
            placeholder="Any additional notes about this client..."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {client ? 'Update Client' : 'Add Client'}
        </Button>
      </div>
    </form>
  );
}
