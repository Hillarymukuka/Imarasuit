// Letter types
import { Address } from '@/types/core';

export interface Letter {
  id: string;
  title: string;
  recipientName: string;
  recipientAddress: Address;
  subject: string;
  content: string;
  salutation: string;
  closing: string;
  companyId: string;
  dateIssued: string;
  createdAt: string;
  updatedAt: string;
}
