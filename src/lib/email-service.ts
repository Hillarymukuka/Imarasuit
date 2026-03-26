// Email Service for Business Suite
import { Document, CompanyProfile, Client, Quotation, Invoice, PurchaseOrder, DeliveryNote } from '@/types';
import { formatCurrency, formatDate } from './utils';
import { DOCUMENT_TYPE_LABELS } from './constants';

export interface EmailTemplate {
  to: string;
  subject: string;
  body: string;
}

// Generate email subject based on document type
export function generateEmailSubject(document: Document, company: CompanyProfile): string {
  const docType = DOCUMENT_TYPE_LABELS[document.type];
  return `${docType} ${document.documentNumber} from ${company.name}`;
}

// Generate email body based on document type
export function generateEmailBody(
  document: Document, 
  company: CompanyProfile, 
  client: Client
): string {
  const docType = DOCUMENT_TYPE_LABELS[document.type];
  const greeting = `Dear ${client.contactPerson || client.name},`;
  
  let specificInfo = '';
  
  switch (document.type) {
    case 'quotation':
      const quotation = document as Quotation;
      specificInfo = `
This quotation is valid until ${formatDate(quotation.validUntil)}.

Please review the attached quotation and let us know if you have any questions or would like to proceed.`;
      break;
      
    case 'invoice':
      const invoice = document as Invoice;
      specificInfo = `
Payment is due by ${formatDate(invoice.dueDate)}.

Please find the attached invoice for your records. Kindly ensure payment is made by the due date.

Payment Details:
Bank: ${company.bankInfo.bankName}
Account Name: ${company.bankInfo.accountName}
Account Number: ${company.bankInfo.accountNumber}${company.bankInfo.swiftCode ? `
SWIFT Code: ${company.bankInfo.swiftCode}` : ''}${company.bankInfo.iban ? `
IBAN: ${company.bankInfo.iban}` : ''}`;
      break;
      
    case 'purchase_order':
      const po = document as PurchaseOrder;
      specificInfo = `${po.expectedDeliveryDate ? `
Expected delivery date: ${formatDate(po.expectedDeliveryDate)}.` : ''}

Please confirm receipt of this purchase order and the expected delivery timeline.`;
      break;
      
    case 'delivery_note':
      const dn = document as DeliveryNote;
      specificInfo = `${dn.deliveryDate ? `
Delivery date: ${formatDate(dn.deliveryDate)}.` : ''}

Please find the attached delivery note for your records.`;
      break;
  }

  const body = `${greeting}

Please find attached ${docType} ${document.documentNumber} for your reference.

Document Summary:
- Document Number: ${document.documentNumber}
- Date Issued: ${formatDate(document.dateIssued)}
- Total Amount: ${formatCurrency(document.grandTotal)}
${specificInfo}

If you have any questions, please don't hesitate to contact us.

Best regards,
${company.name}
${company.phone}
${company.email}${company.website ? `
${company.website}` : ''}
`;

  return body;
}

// Generate mailto link (opens default email client)
export function generateMailtoLink(template: EmailTemplate): string {
  const subject = encodeURIComponent(template.subject);
  const body = encodeURIComponent(template.body);
  const mailtoLink = `mailto:${template.to}?subject=${subject}&body=${body}`;
  
  // Check if the mailto link is too long (some email clients have limits)
  if (mailtoLink.length > 2000) {
    console.warn('Mailto link is very long and may not work in all email clients. Consider copying to clipboard instead.');
  }
  
  return mailtoLink;
}

// Open mailto link
export function openMailClient(template: EmailTemplate): void {
  const mailtoLink = generateMailtoLink(template);
  
  try {
    // Use window.location.href for better compatibility
    window.location.href = mailtoLink;
  } catch (error) {
    console.error('Failed to open mail client:', error);
    // Fallback: try opening in new window
    window.open(mailtoLink);
  }
}

// Generate full email template
export function generateEmailTemplate(
  document: Document,
  company: CompanyProfile,
  client: Client
): EmailTemplate {
  return {
    to: client.email ?? '',
    subject: generateEmailSubject(document, company),
    body: generateEmailBody(document, company, client),
  };
}

// Copy email to clipboard
export async function copyEmailToClipboard(template: EmailTemplate): Promise<boolean> {
  const emailContent = `To: ${template.to}
Subject: ${template.subject}

${template.body}`;

  try {
    await navigator.clipboard.writeText(emailContent);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
