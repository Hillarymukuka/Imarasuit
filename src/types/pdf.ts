// PDF Theme / Settings types

export interface PDFColor {
  id: string;
  name: string;
  primary: [number, number, number];
  secondary: [number, number, number];
  accent: [number, number, number];
}

export type PDFTemplate = 'modern' | 'classic' | 'minimal' | 'elegant' | 'bold';

export type DocumentTemplate = 'standard' | 'corporate' | 'classic' | 'modern';

export interface PDFSettings {
  selectedColorId: string;
  customColors: PDFColor[];
  template: PDFTemplate;
  documentTemplates: {
    quotation: DocumentTemplate;
    invoice: DocumentTemplate;
    purchase_order: DocumentTemplate;
    delivery_note: DocumentTemplate;
    letter: DocumentTemplate;
  };
  showLogo: boolean;
  logoSize: 'small' | 'medium' | 'large';
  showBankInfo: boolean;
  showTerms: boolean;
  footerText: string;
  /** ISO 4217 currency code – defaults to 'ZMW' */
  currencyCode: string;
}
