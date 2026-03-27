'use client';

export const runtime = 'edge';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { EnvelopeIcon, ArrowDownTrayIcon, PencilIcon, TrashIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { Header } from '@/components/layout';
import { Button, Card, CardContent } from '@/components/ui';
import { useLettersStore, useCompanyStore, usePDFSettingsStore } from '@/store';
import { formatDate } from '@/lib/utils';
import { generateLetterPDF, downloadPDF } from '@/lib/pdf-generator';
import { PDFColorSettings } from '@/components/documents';

export default function LetterViewPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const { getLetter, deleteLetter } = useLettersStore();
    const { company } = useCompanyStore();
    const { settings } = usePDFSettingsStore();
    const [isGenerating, setIsGenerating] = useState(false);

    const letter = getLetter(params.id);

    const handleDownload = async () => {
        if (!letter || !company) return;

        setIsGenerating(true);
        try {
            const blob = await generateLetterPDF(letter, company, settings);
            downloadPDF(blob, `${letter.title.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this letter?')) {
            await deleteLetter(params.id);
            router.push('/letters');
        }
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
                                The letter you're looking for doesn't exist or has been deleted.
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
                title={letter.title}
                subtitle={`Created on ${formatDate(letter.createdAt)}`}
            />

            <div className="p-4 lg:p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Actions */}
                    <div className="flex items-center gap-3 justify-between">
                        <Button
                            variant="outline"
                            onClick={() => router.push('/letters')}
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Back
                        </Button>

                        <div className="flex items-center gap-2">
                            <PDFColorSettings />
                            <Button
                                onClick={handleDownload}
                                disabled={isGenerating}
                                className="bg-gradient-to-r from-primary-600 to-primary-700"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                                {isGenerating ? 'Generating...' : 'Download PDF'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => router.push(`/letters/${params.id}/edit`)}
                            >
                                <PencilIcon className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleDelete}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <TrashIcon className="w-4 h-4 mr-2" />
                                Delete
                            </Button>
                        </div>
                    </div>

                    {/* Letter Preview */}
                    <Card>
                        <CardContent className="p-8 md:p-12">
                            {/* Header Info */}
                            <div className="mb-8 pb-6 border-b border-gray-200 dark:border-dark-700">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                            {letter.title}
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Date: {formatDate(letter.dateIssued)}
                                        </p>
                                    </div>
                                    <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                                        <EnvelopeIcon className="w-6 h-6 text-primary-600" />
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Subject:
                                    </p>
                                    <p className="text-gray-900 dark:text-white">
                                        {letter.subject}
                                    </p>
                                </div>
                            </div>

                            {/* Recipient */}
                            <div className="mb-8">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    TO:
                                </h3>
                                <div className="text-gray-900 dark:text-white">
                                    <p className="font-semibold">{letter.recipientName}</p>
                                    {letter.recipientAddress.street && (
                                        <>
                                            <p>{letter.recipientAddress.street}</p>
                                            <p>
                                                {[
                                                    letter.recipientAddress.city,
                                                    letter.recipientAddress.state,
                                                    letter.recipientAddress.postalCode
                                                ].filter(Boolean).join(', ')}
                                            </p>
                                            {letter.recipientAddress.country && (
                                                <p>{letter.recipientAddress.country}</p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Letter Content */}
                            <div className="space-y-4">
                                <p className="text-gray-900 dark:text-white">
                                    {letter.salutation},
                                </p>

                                <div className="whitespace-pre-wrap text-gray-900 dark:text-white leading-relaxed">
                                    {letter.content}
                                </div>

                                <div className="mt-8">
                                    <p className="text-gray-900 dark:text-white mb-8">
                                        {letter.closing},
                                    </p>
                                    {company && (
                                        <div className="text-gray-900 dark:text-white">
                                            <p className="font-semibold">{company.name}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
