// Backend Types for Cloudflare Workers

export type Bindings = {
  DB: D1Database;
  AI: Ai;
  MEDIA_BUCKET: R2Bucket;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN: string;
  // OAuth credentials for social media connections
  TWITTER_CLIENT_ID: string;
  TWITTER_CLIENT_SECRET: string;
  LINKEDIN_CLIENT_ID: string;
  LINKEDIN_CLIENT_SECRET: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  OAUTH_REDIRECT_BASE: string;
};

export type Variables = {
  userId: string;
  companyId: string;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

// Database row types (snake_case from D1)
export interface CompanyRow {
  id: string;
  name: string;
  logo: string | null;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  tin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  swift_code: string;
  iban: string;
  created_at: string;
  updated_at: string;
}

export interface UserRow {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  company_id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tin: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  company_id: string;
  client_id: string;
  document_number: string;
  type: string;
  date_issued: string;
  reference_number: string | null;
  subtotal: number;
  tax_type: string;
  tax_percent: number;
  tax_total: number;
  discount: number;
  discount_type: string;
  grand_total: number;
  notes: string | null;
  terms: string | null;
  status: string;
  valid_until: string | null;
  due_date: string | null;
  payment_terms: string | null;
  paid_amount: number;
  paid_date: string | null;
  expected_delivery_date: string | null;
  shipping_method: string | null;
  delivery_date: string | null;
  received_by: string | null;
  delivery_street: string | null;
  delivery_city: string | null;
  delivery_state: string | null;
  delivery_postal_code: string | null;
  delivery_country: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentItemRow {
  id: string;
  document_id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  sort_order: number;
}

export interface LetterRow {
  id: string;
  company_id: string;
  title: string;
  recipient_name: string;
  recipient_street: string;
  recipient_city: string;
  recipient_state: string;
  recipient_postal_code: string;
  recipient_country: string;
  subject: string;
  content: string;
  salutation: string;
  closing: string;
  date_issued: string | null;
  created_at: string;
  updated_at: string;
}

export interface PDFSettingsRow {
  id: string;
  company_id: string;
  selected_color_id: string;
  custom_colors: string;
  template: string;
  show_logo: number;
  logo_size: string;
  show_bank_info: number;
  show_terms: number;
  footer_text: string;
  created_at: string;
  updated_at: string;
}

// API Response Shapes (camelCase for frontend consumption)
export interface CompanyResponse {
  id: string;
  name: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  phone: string;
  email: string;
  website?: string;
  tin: string;
  bankInfo: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    swiftCode?: string;
    iban?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Converters
export function companyRowToResponse(row: CompanyRow): CompanyResponse {
  return {
    id: row.id,
    name: row.name,
    logo: row.logo || undefined,
    address: {
      street: row.street,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
    },
    phone: row.phone,
    email: row.email,
    website: row.website || undefined,
    tin: row.tin,
    bankInfo: {
      bankName: row.bank_name,
      accountName: row.account_name,
      accountNumber: row.account_number,
      routingNumber: row.routing_number,
      swiftCode: row.swift_code || undefined,
      iban: row.iban || undefined,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function clientRowToResponse(row: ClientRow) {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    address: {
      street: row.street,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
    },
    tin: row.tin || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function documentRowToResponse(row: DocumentRow, items: DocumentItemRow[]) {
  const base: any = {
    id: row.id,
    documentNumber: row.document_number,
    type: row.type,
    dateIssued: row.date_issued,
    referenceNumber: row.reference_number || undefined,
    companyId: row.company_id,
    clientId: row.client_id,
    items: items
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total,
      })),
    subtotal: row.subtotal,
    taxType: row.tax_type,
    taxPercent: row.tax_percent,
    taxTotal: row.tax_total,
    discount: row.discount,
    discountType: row.discount_type,
    grandTotal: row.grand_total,
    notes: row.notes || undefined,
    terms: row.terms || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
  };

  // Add type-specific fields
  switch (row.type) {
    case 'quotation':
      base.validUntil = row.valid_until;
      break;
    case 'invoice':
      base.dueDate = row.due_date;
      base.paymentTerms = row.payment_terms || undefined;
      base.paidAmount = row.paid_amount;
      base.paidDate = row.paid_date || undefined;
      break;
    case 'purchase_order':
      base.expectedDeliveryDate = row.expected_delivery_date || undefined;
      base.shippingMethod = row.shipping_method || undefined;
      break;
    case 'delivery_note':
      base.deliveryDate = row.delivery_date;
      base.receivedBy = row.received_by || undefined;
      if (row.delivery_street || row.delivery_city) {
        base.deliveryAddress = {
          street: row.delivery_street || '',
          city: row.delivery_city || '',
          state: row.delivery_state || '',
          postalCode: row.delivery_postal_code || '',
          country: row.delivery_country || '',
        };
      }
      break;
  }

  return base;
}

export function letterRowToResponse(row: LetterRow) {
  return {
    id: row.id,
    title: row.title,
    recipientName: row.recipient_name,
    recipientAddress: {
      street: row.recipient_street,
      city: row.recipient_city,
      state: row.recipient_state,
      postalCode: row.recipient_postal_code,
      country: row.recipient_country,
    },
    subject: row.subject,
    content: row.content,
    salutation: row.salutation,
    closing: row.closing,
    companyId: row.company_id,
    dateIssued: row.date_issued || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function pdfSettingsRowToResponse(row: PDFSettingsRow) {
  return {
    selectedColorId: row.selected_color_id,
    customColors: JSON.parse(row.custom_colors || '[]'),
    template: row.template,
    showLogo: row.show_logo === 1,
    logoSize: row.logo_size,
    showBankInfo: row.show_bank_info === 1,
    showTerms: row.show_terms === 1,
    footerText: row.footer_text,
  };
}
