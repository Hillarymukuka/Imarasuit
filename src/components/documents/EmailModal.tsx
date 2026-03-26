'use client';

import React, { useState, useEffect } from 'react';
import {
  EnvelopeIcon,
  PaperAirplaneIcon,
  DocumentDuplicateIcon,
  XMarkIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import { Button, Input, Textarea, Modal } from '@/components/ui';
import { Document, CompanyProfile, Client } from '@/types';
import {
  generateEmailTemplate,
  openMailClient,
  copyEmailToClipboard,
  EmailTemplate,
} from '@/lib/email-service';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  company: CompanyProfile;
  client: Client;
}

export function EmailModal({ isOpen, onClose, document, company, client }: EmailModalProps) {
  const [emailTemplate, setEmailTemplate] = useState<EmailTemplate>({
    to: '',
    subject: '',
    body: '',
  });
  const [copied, setCopied] = useState(false);
  const [ccEmail, setCcEmail] = useState('');
  const [showCc, setShowCc] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const template = generateEmailTemplate(document, company, client);
      setEmailTemplate(template);
      setCopied(false);
    }
  }, [isOpen, document, company, client]);

  const handleSendEmail = () => {
    try {
      openMailClient(emailTemplate);
      // Give a brief moment before closing the modal to ensure the email client opens
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error opening email client:', error);
      alert('Could not open email client. Please copy the email content and paste it into your email application.');
    }
  };

  const handleCopyToClipboard = async () => {
    const success = await copyEmailToClipboard(emailTemplate);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFieldChange = (field: keyof EmailTemplate, value: string) => {
    setEmailTemplate((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Email" size="lg">
      <div className="space-y-4">
        {/* Header Info */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <EnvelopeIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              Send {DOCUMENT_TYPE_LABELS[document.type]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {document.documentNumber} to {client.name}
            </p>
          </div>
        </div>

        {/* To Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            To
          </label>
          <Input
            type="email"
            value={emailTemplate.to}
            onChange={(e) => handleFieldChange('to', e.target.value)}
            placeholder="recipient@email.com"
            leftIcon={<EnvelopeIcon className="w-4 h-4" />}
          />
        </div>

        {/* CC Field (optional) */}
        {showCc ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CC
            </label>
            <Input
              type="email"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              placeholder="cc@email.com"
            />
          </div>
        ) : (
          <button
            onClick={() => setShowCc(true)}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            + Add CC
          </button>
        )}

        {/* Subject Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subject
          </label>
          <Input
            value={emailTemplate.subject}
            onChange={(e) => handleFieldChange('subject', e.target.value)}
            placeholder="Email subject"
          />
        </div>

        {/* Body Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Message
          </label>
          <Textarea
            value={emailTemplate.body}
            onChange={(e) => handleFieldChange('body', e.target.value)}
            placeholder="Email message"
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        {/* Attachment Note */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Note:</strong> After clicking "Open Email Client", your default email application will open. 
            Please attach the PDF document manually before sending. You can download the PDF from the preview panel.
          </p>
        </div>

        {/* Troubleshooting Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> If the email client doesn't open, use the "Copy to Clipboard" button 
            to copy the email content and paste it into your email application manually.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCopyToClipboard}
            leftIcon={copied ? <CheckIcon className="w-4 h-4" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleSendEmail}
            leftIcon={<PaperAirplaneIcon className="w-4 h-4" />}
          >
            Open Email Client
          </Button>
        </div>

        {/* Cancel Button */}
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
