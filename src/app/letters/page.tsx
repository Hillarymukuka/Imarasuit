'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnvelopeIcon, PlusIcon, EyeIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { Button, Card, CardContent, CardHeader, Input, Select } from '@/components/ui';
import { useLettersStore, useCompanyStore, usePDFSettingsStore } from '@/store';
import { PDFColorSettings } from '@/components/documents';
import { useAIContext } from '@/lib/useAIContext';
import { formatDate } from '@/lib/utils';
import { Letter } from '@/types';

export default function LettersPage() {
    useAIContext('Letters');
    const router = useRouter();
    const { letters, deleteLetter } = useLettersStore();
    const { company } = useCompanyStore();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredLetters = letters.filter(letter =>
        letter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        letter.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        letter.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this letter?')) {
            await deleteLetter(id);
        }
    };

    if (!company) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-950">
                <Header
                    title="Letters"
                    subtitle="Create professional letterheads"
                />
                <div className="p-4 lg:p-6">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <EnvelopeIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Company Profile Required
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                Please set up your company profile first to create letters.
                            </p>
                            <Button onClick={() => router.push('/company')}>
                                Setup Company Profile
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
                title="Letters"
                subtitle="Create and manage professional letterheads"
            />

            <div className="p-4 lg:p-6 space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="flex-1 max-w-md">
                        <Input
                            placeholder="Search letters..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={<EnvelopeIcon className="w-4 h-4" />}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <PDFColorSettings />
                        <Button
                            onClick={() => router.push('/letters/new')}
                            className="bg-gradient-to-r from-primary-600 to-primary-700"
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            New Letter
                        </Button>
                    </div>
                </div>

                {/* Letters List */}
                {filteredLetters.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <div className="w-14 h-14 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                <EnvelopeIcon className="w-6 h-6 text-primary-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                {searchTerm ? 'No letters found' : 'No letters yet'}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                {searchTerm
                                    ? 'Try adjusting your search terms'
                                    : 'Create your first professional letterhead'}
                            </p>
                            {!searchTerm && (
                                <Button
                                    onClick={() => router.push('/letters/new')}
                                    className="bg-gradient-to-r from-primary-600 to-primary-700"
                                >
                                    <PlusIcon className="w-4 h-4 mr-2" />
                                    Create Letter
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLetters.map((letter) => (
                            <Card key={letter.id} className="card-hover">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                                                {letter.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                To: {letter.recipientName}
                                            </p>
                                        </div>
                                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                            <EnvelopeIcon className="w-4 h-4 text-primary-600" />
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 mb-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Subject:</span> {letter.subject}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatDate(letter.dateIssued)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/letters/${letter.id}`)}
                                            title="View"
                                        >
                                            <EyeIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/letters/${letter.id}/edit`)}
                                            title="Edit"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(letter.id)}
                                            title="Delete"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
