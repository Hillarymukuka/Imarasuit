'use client';

export const runtime = 'edge';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon, CheckIcon, XMarkIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { Button, Card, CardContent, Input, Textarea } from '@/components/ui';
import { useLettersStore, useCompanyStore } from '@/store';
import { Address } from '@/types';

interface EditLetterPageProps {
    params: {
        id: string;
    };
}

export default function EditLetterPage({ params }: EditLetterPageProps) {
    const router = useRouter();
    const { getLetter, updateLetter } = useLettersStore();
    const { company } = useCompanyStore();

    const letter = getLetter(params.id);

    const [formData, setFormData] = useState({
        title: '',
        recipientName: '',
        recipientAddress: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
        } as Address,
        subject: '',
        content: '',
        salutation: 'Dear Sir/Madam',
        closing: 'Sincerely',
        dateIssued: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (letter) {
            setFormData({
                title: letter.title,
                recipientName: letter.recipientName,
                recipientAddress: letter.recipientAddress,
                subject: letter.subject,
                content: letter.content,
                salutation: letter.salutation,
                closing: letter.closing,
                dateIssued: new Date(letter.dateIssued).toISOString().split('T')[0]
            });
        }
    }, [letter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!company) {
            alert('Please set up your company profile first');
            router.push('/company');
            return;
        }

        await updateLetter(params.id, {
            ...formData,
            dateIssued: new Date(formData.dateIssued).toISOString()
        });

        router.push(`/letters/${params.id}`);
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field: keyof Address, value: string) => {
        setFormData(prev => ({
            ...prev,
            recipientAddress: {
                ...prev.recipientAddress,
                [field]: value
            }
        }));
    };

    if (!letter) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
                <Header title="Letter Not Found" subtitle="The requested letter could not be found" />
                <div className="p-4 lg:p-6">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <EnvelopeIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Letter Not Found
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                The letter you're trying to edit doesn't exist or has been deleted.
                            </p>
                            <Button onClick={() => router.push('/letters')}>
                                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                Back to Letters
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
            <Header
                title="Edit Letter"
                subtitle={`Editing: ${letter.title}`}
            />

            <div className="p-4 lg:p-6">
                <form onSubmit={handleSubmit}>
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Basic Information */}
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <EnvelopeIcon className="w-5 h-5 text-primary-600" />
                                    Letter Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Letter Title *
                                        </label>
                                        <Input
                                            value={formData.title}
                                            onChange={(e) => handleChange('title', e.target.value)}
                                            placeholder="e.g., Business Proposal Letter"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Date
                                        </label>
                                        <Input
                                            type="date"
                                            value={formData.dateIssued}
                                            onChange={(e) => handleChange('dateIssued', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Subject *
                                    </label>
                                    <Input
                                        value={formData.subject}
                                        onChange={(e) => handleChange('subject', e.target.value)}
                                        placeholder="Letter subject"
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recipient Information */}
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Recipient Information
                                </h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Recipient Name *
                                    </label>
                                    <Input
                                        value={formData.recipientName}
                                        onChange={(e) => handleChange('recipientName', e.target.value)}
                                        placeholder="Full name or company name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Street Address
                                        </label>
                                        <Input
                                            value={formData.recipientAddress.street}
                                            onChange={(e) => handleAddressChange('street', e.target.value)}
                                            placeholder="Street address"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            City
                                        </label>
                                        <Input
                                            value={formData.recipientAddress.city}
                                            onChange={(e) => handleAddressChange('city', e.target.value)}
                                            placeholder="City"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            State/Province
                                        </label>
                                        <Input
                                            value={formData.recipientAddress.state}
                                            onChange={(e) => handleAddressChange('state', e.target.value)}
                                            placeholder="State or province"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Postal Code
                                        </label>
                                        <Input
                                            value={formData.recipientAddress.postalCode}
                                            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                            placeholder="Postal code"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Country
                                        </label>
                                        <Input
                                            value={formData.recipientAddress.country}
                                            onChange={(e) => handleAddressChange('country', e.target.value)}
                                            placeholder="Country"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Letter Content */}
                        <Card>
                            <CardContent className="p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Letter Content
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Salutation
                                        </label>
                                        <Input
                                            value={formData.salutation}
                                            onChange={(e) => handleChange('salutation', e.target.value)}
                                            placeholder="e.g., Dear Sir/Madam"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Closing
                                        </label>
                                        <Input
                                            value={formData.closing}
                                            onChange={(e) => handleChange('closing', e.target.value)}
                                            placeholder="e.g., Sincerely"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Letter Body *
                                    </label>
                                    <Textarea
                                        value={formData.content}
                                        onChange={(e) => handleChange('content', e.target.value)}
                                        placeholder="Write your letter content here..."
                                        rows={12}
                                        required
                                        className="font-mono text-sm"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Tip: Press Enter twice for paragraph breaks
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center gap-3 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/letters/${params.id}`)}
                            >
                                <XMarkIcon className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-gradient-to-r from-primary-600 to-primary-700"
                            >
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
