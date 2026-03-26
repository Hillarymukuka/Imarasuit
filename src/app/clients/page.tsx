'use client';

import React, { useState } from 'react';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EnvelopeIcon, PhoneIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { Button, Input, Card, CardContent, Modal, ClientCardSkeleton } from '@/components/ui';
import { ClientForm } from '@/components/forms';
import { useClientsStore } from '@/store';
import { useAIContext } from '@/lib/useAIContext';
import { Client } from '@/types';
import { formatDate, getInitials } from '@/lib/utils';

export default function ClientsPage() {
  useAIContext('Clients');
  const { clients, deleteClient, isLoading } = useClientsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.email ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.contactPerson ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      await deleteClient(id);
    }
  };

  const handleSuccess = () => {
    setShowCreateForm(false);
    setEditingClient(null);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Clients" 
        subtitle="Manage your client and supplier database"
        actions={
          <Button 
            onClick={() => setShowCreateForm(true)}
            leftIcon={<PlusIcon className="w-4 h-4" />}
          >
            Add Client
          </Button>
        }
      />
      
      <div className="p-4 lg:p-6 space-y-4">
        {/* Search */}
        <div className="max-w-md">
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
          />
        </div>

        {/* Clients Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredClients.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-4">
              <PlusIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Add your first client to start creating documents'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowCreateForm(true)}>
                Add Client
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((client, i) => (
              <Card
                key={client.id}
                className="hover:shadow-md transition-all duration-200 animate-slide-up-fade"
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold">
                      {getInitials(client.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {client.contactPerson}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <PhoneIcon className="w-4 h-4 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">
                        {client.address.city}, {client.address.country}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-dark-700 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Added {formatDate(client.createdAt)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingClient(client)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Add New Client"
        size="full"
      >
        <ClientForm
          onSuccess={handleSuccess}
          onCancel={() => setShowCreateForm(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingClient}
        onClose={() => setEditingClient(null)}
        title="Edit Client"
        size="full"
      >
        {editingClient && (
          <ClientForm
            client={editingClient}
            onSuccess={handleSuccess}
            onCancel={() => setEditingClient(null)}
          />
        )}
      </Modal>
    </div>
  );
}
