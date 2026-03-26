// ── ERP Assistant Tools ──────────────────────────────────────────
// Client-side intent detection + action executor.
// The AI model only provides conversational replies;
// intent detection and structured operations are handled HERE
// using pattern matching on the user's original message.
// ─────────────────────────────────────────────────────────────────

import { useDocumentsStore, useClientsStore, CreateDocumentData } from '@/store';
import { useAuthStore } from '@/store/auth-store';
import { usePDFSettingsStore } from '@/store/pdf-settings-store';
import { createLineItem, formatCurrency, formatDate } from '@/lib/utils';
import { DOCUMENT_TYPE_LABELS } from '@/lib/constants';
import { Client, Document, LineItem, DocumentType, DocumentStatus } from '@/types';
import { generateDocumentPDF, downloadPDF } from '@/lib/pdf-generator';
import { generateEmailSubject, generateEmailBody, openMailClient } from '@/lib/email-service';

// ── Action type union ───────────────────────────────────────────
export type ERPActionType =
  | 'search_clients'
  | 'create_client'
  | 'create_quotation'
  | 'create_invoice'
  | 'create_purchase_order'
  | 'create_delivery_note'
  | 'convert_to_invoice'
  | 'convert_to_purchase_order'
  | 'convert_to_delivery_note'
  | 'get_document'
  | 'list_documents'
  | 'update_document_status'
  | 'generate_pdf'
  | 'get_follow_ups'
  | 'send_email'
  | 'navigate_financials';

export interface ERPAction {
  type: ERPActionType;
  params: Record<string, any>;
  requiresConfirmation: boolean;
  summary: string;
}

export interface ERPActionResult {
  success: boolean;
  message: string;
  data?: any;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION CONTEXT — tracks the last document created or
// referenced so that "convert it", "email this", etc. work.
// ═══════════════════════════════════════════════════════════════

interface DocumentContext {
  id: string;
  documentNumber: string;
  type: DocumentType;
}

let _lastDocumentContext: DocumentContext | null = null;

/** Call after any action that creates or retrieves a document */
export function setLastDocumentContext(doc: { id: string; documentNumber: string; type?: string } | null) {
  if (!doc) { _lastDocumentContext = null; return; }
  _lastDocumentContext = {
    id: doc.id,
    documentNumber: doc.documentNumber,
    type: (doc.type as DocumentType) || 'quotation',
  };
}

export function getLastDocumentContext(): DocumentContext | null {
  return _lastDocumentContext;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE INTENT DETECTION
// Parses the user's message using regex to identify ERP actions.
// This is the primary action source — the AI model is only used
// for conversational replies and does NOT produce structured data.
// ═══════════════════════════════════════════════════════════════

export function detectIntentFromMessage(userMessage: string): ERPAction | null {
  const msg = userMessage.trim();
  const lower = msg.toLowerCase();

  // ── Convert document ──────────────────────────────────────────
  // Helper: resolve doc number from explicit text OR fall back to
  // the last document created/referenced in the conversation.
  const resolveConvertDocNumber = (): { docNum: string; docId: string } => {
    const explicit = extractDocumentNumber(msg);
    if (explicit) return { docNum: explicit, docId: '' };
    // Pronoun / implicit reference: "convert it", "change this to…"
    const ctx = getLastDocumentContext();
    if (ctx) return { docNum: ctx.documentNumber, docId: ctx.id };
    return { docNum: '', docId: '' };
  };

  // NOTE: "make" is NOT a convert verb — "make a PO" means CREATE.
  // Convert requires "convert/turn/change … to/into <target>".
  const hasConvertVerb  = /\b(?:convert|turn|change)\b/i.test(lower);
  const hasToInto       = /\b(?:to|into)\b/i.test(lower);
  const isConvertIntent = hasConvertVerb && hasToInto;

  if (isConvertIntent) {
    // ── Convert → invoice ──
    if (/\b(?:to|into)\s+(?:an?\s+)?invoice\b/i.test(lower)) {
      const { docNum, docId } = resolveConvertDocNumber();
      return {
        type: 'convert_to_invoice',
        params: { documentNumber: docNum, documentId: docId || undefined },
        requiresConfirmation: true,
        summary: docNum ? `Convert ${docNum} to an invoice` : 'Convert quotation to an invoice',
      };
    }

    // ── Convert → purchase order ──
    if (/\b(?:to|into)\s+(?:an?\s+)?(?:purchase\s*order|po)\b/i.test(lower)) {
      const { docNum, docId } = resolveConvertDocNumber();
      return {
        type: 'convert_to_purchase_order',
        params: { documentNumber: docNum, documentId: docId || undefined },
        requiresConfirmation: true,
        summary: docNum ? `Convert ${docNum} to a purchase order` : 'Convert to a purchase order',
      };
    }

    // ── Convert → delivery note ──
    if (/\b(?:to|into)\s+(?:an?\s+)?(?:delivery\s*note|dn)\b/i.test(lower)) {
      const { docNum, docId } = resolveConvertDocNumber();
      return {
        type: 'convert_to_delivery_note',
        params: { documentNumber: docNum, documentId: docId || undefined },
        requiresConfirmation: true,
        summary: docNum ? `Convert ${docNum} to a delivery note` : 'Convert to a delivery note',
      };
    }
  }

  // ── Create quotation ──────────────────────────────────────────
  if (/(?:create|make|generate|prepare|draft|new)\b.*\b(?:quotation|quote)\b/i.test(lower)) {
    const { items, clientSearch } = extractItemsAndClient(msg);
    return {
      type: 'create_quotation',
      params: { clientSearch, items, taxType: extractTaxType(lower) },
      requiresConfirmation: true,
      summary: `Create a quotation${clientSearch ? ` for ${clientSearch}` : ''}${items.length ? ` — ${items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}` : ''}`,
    };
  }

  // ── Create invoice ────────────────────────────────────────────
  if (/(?:create|make|generate|prepare|draft|new)\b.*\binvoice\b/i.test(lower)) {
    const { items, clientSearch } = extractItemsAndClient(msg);
    return {
      type: 'create_invoice',
      params: { clientSearch, items, taxType: extractTaxType(lower) },
      requiresConfirmation: true,
      summary: `Create an invoice${clientSearch ? ` for ${clientSearch}` : ''}${items.length ? ` — ${items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}` : ''}`,
    };
  }

  // ── Create purchase order ─────────────────────────────────────
  if (/(?:create|make|generate|prepare|draft|new)\b.*\b(?:purchase\s*order|po)\b/i.test(lower)) {
    const { items, clientSearch } = extractItemsAndClient(msg);
    return {
      type: 'create_purchase_order',
      params: { clientSearch: clientSearch, supplierName: clientSearch, items, taxType: extractTaxType(lower) },
      requiresConfirmation: true,
      summary: `Create a purchase order${clientSearch ? ` from ${clientSearch}` : ''}${items.length ? ` — ${items.map((i: any) => `${i.quantity}× ${i.name}`).join(', ')}` : ''}`,
    };
  }

  // ── Create delivery note ──────────────────────────────────────
  if (/(?:create|make|generate|prepare|draft|new)\b.*\b(?:delivery\s*note|dn)\b/i.test(lower)) {
    const { items, clientSearch } = extractItemsAndClient(msg);
    return {
      type: 'create_delivery_note',
      params: { clientSearch, items, taxType: extractTaxType(lower) },
      requiresConfirmation: true,
      summary: `Create a delivery note${clientSearch ? ` for ${clientSearch}` : ''}`,
    };
  }

  // ── Create client ─────────────────────────────────────────────
  if (/(?:create|add|register|new)\b.*\b(?:client|customer|supplier)\b/i.test(lower)) {
    const nameMatch = msg.match(/(?:called|named|for)\s+["']?([A-Z][A-Za-z\s&.,'()-]+)/i)
      || msg.match(/(?:client|customer|supplier)\s+["']?([A-Z][A-Za-z\s&.,'()-]+)/i);
    const name = nameMatch ? nameMatch[1].replace(/['"]+$/g, '').trim() : '';
    if (name) {
      return {
        type: 'create_client',
        params: { name },
        requiresConfirmation: true,
        summary: `Create new client: ${name}`,
      };
    }
  }

  // ── Generate PDF ──────────────────────────────────────────────
  if (/(?:download|generate|create|get|export)\b.*\bpdf\b/i.test(lower) || /\bpdf\b.*(?:download|generate|for)/i.test(lower)) {
    const docNum = extractDocumentNumber(msg) || '';
    return {
      type: 'generate_pdf',
      params: { documentNumber: docNum },
      requiresConfirmation: false,
      summary: docNum ? `Generate PDF for ${docNum}` : 'Generate PDF',
    };
  }

  // ── Send email ────────────────────────────────────────────────
  if (/(?:send|email|mail)\b.*\b(?:invoice|quotation|quote|delivery|purchase|document)/i.test(lower)) {
    const docNum = extractDocumentNumber(msg) || '';
    return {
      type: 'send_email',
      params: { documentNumber: docNum },
      requiresConfirmation: false,
      summary: docNum ? `Send ${docNum} via email` : 'Send document via email',
    };
  }

  // ── Get / view specific document ──────────────────────────────
  const viewDocMatch = /(?:show|view|get|retrieve|open|find|display|pull\s*up)\b.*\b((?:QUO|INV|PO|DN)[\-\s]?\d{4}[\-\s]?\d{1,5})/i.test(lower);
  if (viewDocMatch) {
    const docNum = extractDocumentNumber(msg) || '';
    return {
      type: 'get_document',
      params: { documentNumber: docNum },
      requiresConfirmation: false,
      summary: `Retrieve document ${docNum}`,
    };
  }

  // ── List / show documents ─────────────────────────────────────
  // Verb-first: "list my recent quotations", "give me the invoices", "show all POs"
  const listVerbFirst = /(?:list|show|display|get|view|give|fetch|pull\s*up|bring\s*up)\b.*\b(?:all\s+|my\s+|recent\s+|latest\s+|draft\s+|unpaid\s+|overdue\s+|pending\s+|the\s+|me\s+(?:the\s+)?)?(?:quotation|quote|invoice|purchase\s*order|po|delivery\s*note|dn|document)s?\b/i.test(lower);
  // Noun-first: "recent quotations please", "my invoices", "quotations list"
  const listNounFirst = /\b(?:recent|latest|my|all|draft|unpaid|overdue|pending)\s+(?:quotation|quote|invoice|purchase\s*order|po|delivery\s*note|dn|document)s?\b/i.test(lower);
  if (listVerbFirst || listNounFirst) {
    const type = detectDocumentTypeFromText(lower);
    const status = detectStatusFromText(lower);
    return {
      type: 'list_documents',
      params: { type, status, limit: 10 },
      requiresConfirmation: false,
      summary: `List ${status ? status + ' ' : ''}${type ? DOCUMENT_TYPE_LABELS[type] + 's' : 'documents'}`,
    };
  }

  // ── Follow-ups / pending tasks / what needs attention ──────
  if (/\b(?:follow\s*up|pending|action\s*items?|to[\s-]*do|what.*(?:need|should|must|have\s+to).*(?:do|follow|attend|action|check|handle)|outstanding|overdue|need\s+(?:my\s+)?attention|this\s+week|today)\b/i.test(lower)) {
    return {
      type: 'get_follow_ups',
      params: {},
      requiresConfirmation: false,
      summary: 'Check follow-ups & pending tasks',
    };
  }

  // ── List ALL clients (no specific search query) ──────────────
  // Catches: "list clients", "show me my clients", "give me a list of clients",
  // "I need a list of clients", "client list", "all my clients", etc.
  const listClientsIntent =
    /\b(?:list|show|display|give|get|fetch|view|pull\s*up)\b[\w\s]*\b(?:client|customer|supplier)s?\b/i.test(lower) ||
    /\b(?:all|my|the)\s+(?:client|customer|supplier)s?\b/i.test(lower) ||
    /\b(?:client|customer|supplier)\s+list\b/i.test(lower) ||
    /\b(?:i\s+need|i\s+want|can\s+i\s+(?:get|see|have))\b.*\b(?:client|customer|supplier)s?\b/i.test(lower) ||
    /\bwhat\s+(?:client|customer|supplier)s?\b/i.test(lower);

  if (listClientsIntent) {
    return {
      type: 'search_clients',
      params: { query: '' },
      requiresConfirmation: false,
      summary: 'List all clients',
    };
  }

  // ── Search clients (with a specific query term) ───────────────
  if (/(?:search|find|look\s*up|lookup)\b.*\bclient|customer|supplier/i.test(lower) || /\bclient\b.*(?:search|find)/i.test(lower)) {
    const queryMatch = msg.match(/(?:for|named|called)\s+["']?([A-Za-z\s&.,'()-]+)/i)
      || msg.match(/(?:search|find)\s+(?:client|customer|supplier)\s+["']?([A-Za-z\s&.,'()-]+)/i)
      || msg.match(/"([^"]+)"/);
    const query = queryMatch ? queryMatch[1].replace(/['"]+$/g, '').trim() : '';
    if (query) {
      return {
        type: 'search_clients',
        params: { query },
        requiresConfirmation: false,
        summary: `Search clients for "${query}"`,
      };
    }
  }

  // ── Financials navigation ───────────────────────────────────
  if (/\b(?:financials?|expenses?|revenue|profit|loss|cash\s*flow|balance|net\s*income)\b/i.test(lower)) {
    let page = '/financials';
    let label = 'financial dashboard';
    if (/\bexpenses?\b/i.test(lower)) { page = '/financials/expenses'; label = 'expenses'; }
    else if (/\binvoices?\b.*\bfinanc/i.test(lower) || /\bfinanc.*\binvoices?\b/i.test(lower) || /\brevenue\b/i.test(lower)) { page = '/financials/invoices'; label = 'financial invoices'; }
    else if (/\breport/i.test(lower) || /\bprofit|loss|cash\s*flow|margin/i.test(lower)) { page = '/financials/reports'; label = 'financial reports'; }
    else if (/\bentr/i.test(lower) || /\bmanual/i.test(lower) || /\bspreadsheet/i.test(lower)) { page = '/financials/entries'; label = 'manual entries'; }
    return {
      type: 'navigate_financials',
      params: { page },
      requiresConfirmation: false,
      summary: `Open ${label}`,
    };
  }

  // ── No intent detected ────────────────────────────────────────
  return null;
}

// ═══════════════════════════════════════════════════════════════
// SMART SUGGESTIONS
// When no intent is detected, analyse the message for recognisable
// topics (document type, client name) and return 2–3 clickable
// rephrased alternatives that WILL trigger the correct intent.
// ═══════════════════════════════════════════════════════════════

export function suggestReformulations(userMessage: string): string[] {
  const lower = userMessage.toLowerCase();

  // ── Topic detection ───────────────────────────────────────────
  const isAboutQuotations = /\bquot(?:e|ation|ations|es|ing)?\b/i.test(lower);
  const isAboutInvoices  = /\binvoices?\b/i.test(lower);
  const isAboutPO        = /\bpurchase[\s_-]?orders?|\bpos?\b/i.test(lower);
  const isAboutDN        = /\bdelivery[\s_-]?notes?|\bdns?\b/i.test(lower);
  const isAboutDocuments = isAboutQuotations || isAboutInvoices || isAboutPO || isAboutDN;
  const isAboutClients   = /\bclient[s]?|customer[s]?|supplier[s]?\b/i.test(lower);

  // Nothing business-related in the message — no suggestions to make
  const isAboutFinancials = /\bfinanc|expense|revenue|profit|loss|cash\s*flow|balance|net\s*income/i.test(lower);
  if (!isAboutDocuments && !isAboutClients && !isAboutFinancials) return [];

  // ── Client name detection ─────────────────────────────────────
  // 1. Match against known clients in the store
  let detectedClient = '';
  const knownClients = useClientsStore.getState().clients;
  for (const c of [...knownClients].sort((a, b) => b.name.length - a.name.length)) {
    if (lower.includes(c.name.toLowerCase())) {
      detectedClient = c.name;
      break;
    }
  }
  // 2. Fallback: extract a proper noun after a preposition
  if (!detectedClient) {
    const m = userMessage.match(/\b(?:for|from|by|of|about)\s+([A-Z][A-Za-z0-9\s&.,'()-]{2,50?)(?:\s*[?,.]|$)/);
    if (m) detectedClient = m[1].trim();
  }
  // 3. Final fallback: any run of Title Case words in the message
  if (!detectedClient) {
    const titleM = userMessage.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})/);
    if (titleM) detectedClient = titleM[1].trim();
  }

  const suggestions: string[] = [];

  if (isAboutQuotations) {
    if (detectedClient) {
      suggestions.push(`List quotes for ${detectedClient}`);
      suggestions.push(`Show all quotations for ${detectedClient}`);
    } else {
      suggestions.push('List my recent quotations');
      suggestions.push('Show all draft quotations');
    }
  }

  if (isAboutInvoices) {
    if (detectedClient) {
      suggestions.push(`List invoices for ${detectedClient}`);
    } else {
      suggestions.push('Show all unpaid invoices');
      suggestions.push('List my recent invoices');
    }
  }

  if (isAboutPO) {
    if (detectedClient) {
      suggestions.push(`List purchase orders for ${detectedClient}`);
    } else {
      suggestions.push('List all purchase orders');
      suggestions.push('Show draft purchase orders');
    }
  }

  if (isAboutDN) {
    if (detectedClient) {
      suggestions.push(`List delivery notes for ${detectedClient}`);
    } else {
      suggestions.push('Show my delivery notes');
      suggestions.push('List recent delivery notes');
    }
  }

  // If we have a client and there are multiple doc types mentioned (or just general),
  // add a catch-all "show all documents" suggestion
  if (detectedClient && suggestions.length < 3) {
    suggestions.push(`Show all documents for ${detectedClient}`);
  }

  if (isAboutClients && !isAboutDocuments && suggestions.length === 0) {
    suggestions.push('List all my clients');
    suggestions.push('Search for a client by name');
  }

  if (isAboutFinancials && suggestions.length === 0) {
    suggestions.push('Show financial dashboard');
    suggestions.push('Show my expenses');
    suggestions.push('Open financial reports');
  }

  return suggestions.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════
// TEXT EXTRACTION HELPERS
// ═══════════════════════════════════════════════════════════════

function extractDocumentNumber(text: string): string | null {
  // Match patterns like QUO-2026-0001, INV-2026-0003, PO-2026-0001, DN-2026-0001
  const match = text.match(/\b((?:QUO|INV|PO|DN)[\-\s]?\d{4}[\-\s]?\d{1,5})\b/i);
  if (match) return match[1].toUpperCase().replace(/\s+/g, '-');

  // Match shortened like Q-1023, etc.
  const shortMatch = text.match(/\b([QID][\-]?\d{3,5})\b/i);
  if (shortMatch) return shortMatch[1].toUpperCase();

  return null;
}

function extractItemsAndClient(text: string): { items: { name: string; quantity: number; unitPrice: number }[]; clientSearch: string } {
  const items: { name: string; quantity: number; unitPrice: number }[] = [];
  let clientSearch = '';

  // Helper: clean extracted name
  const cleanName = (raw: string) =>
    raw.replace(/['""`]+/g, '')
      .replace(/\s+(?:with|including|please|thanks)$/i, '')
      .trim();

  // Helper: strip doc-type / command words that aren't part of a client name
  const stripNonClientWords = (name: string) =>
    name
      .replace(/\b(?:quotation|quote|invoice|purchase\s*order|delivery\s*note|po\b|dn\b)\b/gi, '')
      .replace(/\b(?:create|make|generate|prepare|draft|new|a|an|the|following|below)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  // ═══════════════════════════════════════════════════════════════
  // CLIENT EXTRACTION — ordered from most explicit to most fuzzy
  // ═══════════════════════════════════════════════════════════════

  // ── 1. Explicit keyword: CLIENT / CUSTOMER / SUPPLIER <name> ──
  //    e.g. "… CLIENT IS ANCESTRO AI", "client: ZedBuild Ltd"
  //    NOTE: "company" is NOT a keyword — it's too common in item names
  //          like "Company Profile Designs".
  //    Check mid-text FIRST (stops at known terminators → more precise).
  const explicitMid = text.match(
    /\b(?:client|customer|supplier)\s*(?:[:=\-]|\bis\b|\bare\b)?\s*([A-Za-z][A-Za-z0-9\s&.,'()\-]+?)(?:\s+(?:quantity|qty|unit\s*price|price|amount|total|with|including|items?|products?)\b)/i,
  );
  if (explicitMid) {
    clientSearch = cleanName(explicitMid[1]);
  }
  // Fall back to end-of-string: "… CLIENT RENOVA BUSINESS"
  if (!clientSearch) {
    const explicitEnd = text.match(
      /\b(?:client|customer|supplier)\s*(?:[:=\-]|\bis\b|\bare\b)?\s*([A-Za-z][A-Za-z0-9\s&.,'()\-]+?)$/im,
    );
    if (explicitEnd) {
      clientSearch = cleanName(explicitEnd[1]);
    }
  }

  // ── 2. Quoted name: for/to/from "ClientName" or 'ClientName' ──
  if (!clientSearch) {
    const quotedMatch = text.match(/\b(?:for|to|from)\s+['"]([^'"]+)['"]/i);
    if (quotedMatch) {
      clientSearch = cleanName(quotedMatch[1]);
    }
  }

  // ── 3. Preposition patterns: for/to/from <ClientName> ──
  //    Skip "for the following…", "for the below…" etc.
  if (!clientSearch) {
    for (const prep of ['for', 'to', 'from']) {
      // Skip "for the following/below"
      const skipRe = new RegExp(`\\b${prep}\\s+(?:the\\s+)?(?:following|below|these|this)\\b`, 'i');
      if (skipRe.test(text)) continue;

      // Pattern: prep + name that starts with a letter, ends at a terminator
      const re = new RegExp(
        `\\b${prep}\\s+([A-Za-z][A-Za-z0-9\\s&.,'()\\-]+?)(?:\\s*(?:with|including|at\\s+K|@|,\\s*\\d|\\d+\\s+[A-Za-z]|\\.\\s*$|$))`,
        'i',
      );
      const m = text.match(re);
      if (m) {
        const candidate = cleanName(m[1]);
        // Don't accept if it looks like an item description (contains price/quantity keywords)
        if (!/\b(?:unit\s*price|price|quantity|qty|zmw|k\s*\d)\b/i.test(candidate)) {
          clientSearch = candidate;
          break;
        }
      }
      // Fallback: prep + name at end of string
      const reEnd = new RegExp(`\\b${prep}\\s+([A-Za-z][A-Za-z0-9\\s&.,'()\\-]+?)$`, 'im');
      const mEnd = text.match(reEnd);
      if (mEnd) {
        const candidate = cleanName(mEnd[1]);
        if (!/\b(?:unit\s*price|price|quantity|qty|zmw|k\s*\d)\b/i.test(candidate)) {
          clientSearch = candidate;
          break;
        }
      }
    }
  }

  // ── 4. Store-aware fallback: check if ANY known client name appears in the text ──
  if (!clientSearch) {
    const knownClients = useClientsStore.getState().clients;
    const lower = text.toLowerCase();
    // Sort by name length DESC so "ZedBuild Construction Ltd" matches before "ZedBuild"
    const sorted = [...knownClients].sort((a, b) => b.name.length - a.name.length);
    for (const c of sorted) {
      if (lower.includes(c.name.toLowerCase())) {
        clientSearch = c.name;
        break;
      }
    }
  }

  // ── 5. Final cleanup ──
  if (clientSearch) {
    clientSearch = stripNonClientWords(clientSearch);
  }

  // ═══════════════════════════════════════════════════════════════
  // ITEM EXTRACTION
  // ═══════════════════════════════════════════════════════════════

  // ── Shared quantity: "QUANTITY 3 EACH" / "QTY 5" ──
  const sharedQtyMatch = text.match(/\b(?:quantity|qty)\s*[:=]?\s*(\d+)\s*(?:each)?\b/i);
  const sharedQty = sharedQtyMatch ? parseInt(sharedQtyMatch[1], 10) : 1;

  // ── Strategy A: Repeated inline items — each has own QTY + PRICE ──
  // "SAMSUNG PHONES QUANTITY 20 UNIT PRICE 1500 HP LAPTOP QUANTITY 20 UNIT PRICE 3500"
  // "Item A qty 5 price K200, Item B qty 10 price K500"
  // Also handles price-then-qty: "PHONES UNIT PRICE 1500 QUANTITY 20"
  {
    const qtyPriceBlocks: { index: number; end: number; qty: number; price: number }[] = [];

    // Try qty-then-price order
    const qpRegex = /\b(?:quantity|qty)\s*[:=]?\s*(\d+)[\s,]*(?:each)?[\s,]*(?:and\s+)?(?:at\s+)?(?:unit\s*price|price)\s*[:=]?\s*(?:zmw|k|usd|\$|£|€)?\s*(\d[\d,.]*)/gi;
    let qpM: RegExpExecArray | null;
    while ((qpM = qpRegex.exec(text)) !== null) {
      qtyPriceBlocks.push({ index: qpM.index, end: qpM.index + qpM[0].length, qty: parseInt(qpM[1], 10), price: parseFloat(qpM[2].replace(/,/g, '')) });
    }

    // Try price-then-qty order if no matches
    if (qtyPriceBlocks.length === 0) {
      const pqRegex = /\b(?:unit\s*price|price)\s*[:=]?\s*(?:zmw|k|usd|\$|£|€)?\s*(\d[\d,.]*)\s*(?:quantity|qty)\s*[:=]?\s*(\d+)/gi;
      let pqM: RegExpExecArray | null;
      while ((pqM = pqRegex.exec(text)) !== null) {
        qtyPriceBlocks.push({ index: pqM.index, end: pqM.index + pqM[0].length, qty: parseInt(pqM[2], 10), price: parseFloat(pqM[1].replace(/,/g, '')) });
      }
    }

    if (qtyPriceBlocks.length >= 2) {
      // Multiple items — extract item name from text before each block
      for (let i = 0; i < qtyPriceBlocks.length; i++) {
        const block = qtyPriceBlocks[i];
        const prevEnd = i === 0 ? 0 : qtyPriceBlocks[i - 1].end;
        let rawName = text.substring(prevEnd, block.index).trim();

        // Clean: remove command/doc-type words, client keyword section, prepositions
        rawName = rawName
          .replace(/\b(?:create|make|generate|prepare|draft|new|help|me|please)\b/gi, '')
          .replace(/\b(?:quotation|quote|invoice|purchase\s*order|delivery\s*note|po\b|dn\b)\b/gi, '')
          .replace(/\b(?:client|customer|supplier)\s*(?:[:=\-]|\bis\b|\bare\b)?\s*/gi, '')
          .replace(/\b(?:a|an|the|for|from|to|and|with)\b/gi, '')
          .replace(/[,;:'"]+/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();

        // Remove the extracted client name so it doesn't pollute the item name
        if (clientSearch) {
          const escaped = clientSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          rawName = rawName.replace(new RegExp(escaped, 'gi'), '').replace(/\s{2,}/g, ' ').trim();
        }

        if (rawName.length > 1) {
          items.push({ name: rawName, quantity: block.qty || 1, unitPrice: block.price });
        }
      }
    }
  }

  // ── Strategy B: Per-item pricing ──
  // Handles: "UNIT PRICE FOR EACH IS BUSINESS CARDS 250 AND COMPANY PROFILE IS 3000"
  if (items.length === 0) {
    const perItemPriceSection = text.match(
      /\b(?:unit\s*price|price)s?\s*(?:for\s+(?:each|every)\s+)?(?:is|are|:)\s+([\s\S]+?)(?:\s*$)/i,
    );
    if (perItemPriceSection) {
      const priceText = perItemPriceSection[1].replace(/[^a-zA-Z0-9]+$/, '').trim();
      const segments = priceText.split(/\s+and\s+|,\s*/i);
      for (const seg of segments) {
        const trimmed = seg.replace(/[^a-zA-Z0-9]+$/, '').trim();
        if (!trimmed) continue;
        const priceMatch = trimmed.match(/(\d[\d,.]*)(?:\s*)$/);
        if (!priceMatch) continue;
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        if (isNaN(price)) continue;
        const rawName = trimmed.substring(0, trimmed.lastIndexOf(priceMatch[1]))
          .replace(/\b(?:is|are|the|a|an|for|zmw|k|usd)\b/gi, '')
          .replace(/[$£€₹¥₦]\s*/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
        if (rawName.length > 1) {
          const perQtyMatch = trimmed.match(/\b(?:quantity|qty)\s*[:=]?\s*(\d+)/i);
          const qty = perQtyMatch ? parseInt(perQtyMatch[1], 10) : sharedQty;
          items.push({ name: rawName, quantity: qty || 1, unitPrice: price });
        }
      }
    }
  }

  // ── Strategy C: Single-item structured format ──
  // "LENOVO LAPTOP UNIT PRICE zmw 40000 QUANTITY 1"
  // "laptop price K5000 qty 3"
  if (items.length === 0) {
    const structuredPriceMatch = text.match(
      /\b(?:unit\s*price|price)\s*[:=]?\s*(?:zmw|k)?\s*(\d[\d,.]*)/i,
    );

    if (structuredPriceMatch || sharedQtyMatch) {
      const unitPrice = structuredPriceMatch
        ? parseFloat(structuredPriceMatch[1].replace(/,/g, ''))
        : 0;

      let itemName = '';
      const beforeKeywordMatch = text.match(
        /\b(?:quotation|quote|invoice|purchase\s*order|delivery\s*note|po|dn)\b\s*(?:for\s+(?:the\s+)?(?:following|below|these)?\s*)?([\s\S]*?)(?:\b(?:unit\s*price|price|quantity|qty|client|customer|supplier)\b)/i,
      );
      if (beforeKeywordMatch) {
        itemName = beforeKeywordMatch[1]
          .replace(/\b(?:for|from|to|the|following|below|these|a|an|with)\b/gi, '')
          .replace(/[,;:]/g, '')
          .replace(/\s{2,}/g, ' ')
          .trim();
      }
      if (!itemName) {
        const capsMatch = text.match(
          /\b([A-Z][A-Z\s]+?)(?:\s+(?:unit\s*price|price|quantity|qty|client|customer)\b)/i,
        );
        if (capsMatch) {
          itemName = capsMatch[1]
            .replace(/\b(?:CREATE|MAKE|NEW|QUOTATION|QUOTE|INVOICE|FOR|THE|FOLLOWING|A|AN)\b/gi, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
        }
      }

      if (itemName && /\band\b/i.test(itemName)) {
        const parts = itemName.split(/\s+and\s+/i).map((p) => p.trim()).filter((p) => p.length > 1);
        if (parts.length > 1 && unitPrice > 0) {
          for (const part of parts) {
            items.push({ name: part, quantity: sharedQty, unitPrice });
          }
        } else if (parts.length > 1) {
          items.push({ name: itemName, quantity: sharedQty, unitPrice });
        }
      }

      if (items.length === 0 && itemName && itemName.length > 1) {
        items.push({ name: itemName, quantity: sharedQty, unitPrice });
      }
    }
  }

  // ── Strategy D: Classic format — "200 cement bags at K500" ──
  if (items.length === 0) {
    const itemPatterns = text.split(/\band\b|,/i);
    for (const segment of itemPatterns) {
      const qtyNameMatch = segment.match(/(\d+)\s+([A-Za-z][A-Za-z\s]*?)(?:\s+(?:at|@|for)\s+K?\s?(\d[\d,.]*)|$)/i);
      if (qtyNameMatch) {
        const quantity = parseInt(qtyNameMatch[1], 10);
        let name = qtyNameMatch[2].trim();
        const unitPrice = qtyNameMatch[3] ? parseFloat(qtyNameMatch[3].replace(/,/g, '')) : 0;

        name = name.replace(/\s+(?:for|from|to|of)\s*$/i, '').trim();

        if (name.toLowerCase() !== clientSearch.toLowerCase() && name.length > 1 && !/^(?:for|from|to|at|and)$/i.test(name)) {
          items.push({ name, quantity: quantity || 1, unitPrice });
        }
      }
    }
  }

  // ── Strategy E: Simplest fallback — "N <words>" ──
  if (items.length === 0) {
    const simpleMatch = text.match(/(\d+)\s+([A-Za-z][A-Za-z\s]*?)(?:\s+(?:for|from|at|@|to)\s)/i);
    if (simpleMatch) {
      const quantity = parseInt(simpleMatch[1], 10);
      let name = simpleMatch[2].trim();
      name = name.replace(/\s+(?:for|from|to|of)\s*$/i, '').trim();
      if (name.length > 1) {
        items.push({ name, quantity: quantity || 1, unitPrice: 0 });
      }
    }
  }

  return { items, clientSearch };
}

function extractTaxType(lower: string): string {
  if (/\bvat\b/.test(lower)) return 'vat';
  if (/\btot\b/.test(lower)) return 'tot';
  return 'none';
}

function detectDocumentTypeFromText(lower: string): DocumentType | undefined {
  if (/quotation|quote/i.test(lower)) return 'quotation';
  if (/invoice/i.test(lower)) return 'invoice';
  if (/purchase\s*order|po\b/i.test(lower)) return 'purchase_order';
  if (/delivery\s*note|dn\b/i.test(lower)) return 'delivery_note';
  return undefined;
}

function detectStatusFromText(lower: string): DocumentStatus | undefined {
  if (/unpaid|outstanding/i.test(lower)) return 'sent';
  if (/overdue/i.test(lower)) return 'overdue';
  if (/draft/i.test(lower)) return 'draft';
  if (/paid\b/i.test(lower)) return 'paid';
  if (/pending/i.test(lower)) return 'pending';
  if (/accepted|approved/i.test(lower)) return 'accepted';
  if (/rejected|declined/i.test(lower)) return 'rejected';
  if (/cancelled|canceled/i.test(lower)) return 'cancelled';
  if (/delivered/i.test(lower)) return 'delivered';
  if (/sent\b/i.test(lower)) return 'sent';
  return undefined;
}

// ═══════════════════════════════════════════════════════════════
// AI RESPONSE CLEANER
// Strips any malformed JSON / action blocks the AI model might
// include so the user only sees clean natural language text.
// ═══════════════════════════════════════════════════════════════

export function cleanAIResponse(response: string): string {
  let cleaned = response;

  // Remove <<<ACTION>>>…<<<END_ACTION>>> blocks (correct format)
  cleaned = cleaned.replace(/<<<ACTION>>>([\s\S]*?)<<<END_ACTION>>>/g, '');

  // Remove common malformed variants the small model produces
  cleaned = cleaned.replace(/<{1,4}ACTION>{0,4}([\s\S]*?)<{0,4}\/?END_ACTION>{0,4}/gi, '');
  cleaned = cleaned.replace(/<{1,4}>+([\s\S]*?)<{0,4}\/?>/gi, (match) => {
    // Only strip if it looks like it contains JSON
    if (/[{}\[\]]/.test(match)) return '';
    return match;
  });

  // Remove standalone JSON-looking blocks { "type": ... }
  cleaned = cleaned.replace(/\{[\s\S]*?"type"\s*:\s*"[^"]*"[\s\S]*?\}/g, '');

  // Remove markdown code fences wrapping JSON
  cleaned = cleaned.replace(/```(?:json)?\s*\{[\s\S]*?\}\s*```/g, '');

  // Clean up excessive whitespace left behind
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  // If we stripped everything, return a generic acknowledgment
  if (!cleaned || cleaned.length < 5) {
    return "I'll process that for you.";
  }

  return cleaned;
}

// ═══════════════════════════════════════════════════════════════
// ACTION EXECUTOR
// Runs the requested operation using the Zustand stores.
// ═══════════════════════════════════════════════════════════════

export async function executeERPAction(action: ERPAction): Promise<ERPActionResult> {
  const documentsStore = useDocumentsStore.getState();
  const clientsStore = useClientsStore.getState();
  const authStore = useAuthStore.getState();

  const companyId = authStore.company?.id;
  if (!companyId) {
    return { success: false, message: 'No company profile found. Please set up your company first.' };
  }

  // Ensure clients are loaded before any client lookup
  if (!clientsStore.isLoaded && !clientsStore.isLoading) {
    try {
      await clientsStore.fetchClients();
    } catch {
      // Continue with whatever clients are in the store
    }
  }

  // Ensure documents are loaded
  if (!documentsStore.isLoaded && !documentsStore.isLoading) {
    try {
      await documentsStore.fetchDocuments();
    } catch {
      // Continue with whatever documents are in the store
    }
  }

  try {
    switch (action.type) {
      // ── Clients ──
      case 'search_clients': {
        const query = (action.params.query || '').toLowerCase();
        const matches = clientsStore.clients.filter(
          (c) =>
            c.name.toLowerCase().includes(query) ||
            c.contactPerson?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query),
        );
        const isListAll = query === '';
        if (matches.length === 0) {
          return {
            success: true,
            message: isListAll
              ? 'You have no clients yet. Add your first client from the Clients page.'
              : `No clients found matching "${action.params.query}".`,
            data: { clients: [] },
          };
        }
        const list = matches.map((c) => `• **${c.name}**${c.contactPerson ? ` (${c.contactPerson})` : ''}${c.email ? ` — ${c.email}` : ''}`).join('\n');
        return {
          success: true,
          message: isListAll
            ? `You have ${matches.length} client(s):\n${list}`
            : `Found ${matches.length} client(s) matching "${action.params.query}":\n${list}`,
          data: { clients: matches },
        };
      }

      case 'create_client': {
        const { name, email, phone, contactPerson, address } = action.params;
        const newClient = await clientsStore.addClient({
          name,
          email: email || '',
          phone: phone || '',
          contactPerson: contactPerson || '',
          address: address || { street: '', city: '', state: '', country: 'Zambia', postalCode: '' },
          tin: '',
          notes: '',
        });
        return { success: true, message: `Client **${newClient.name}** created successfully.`, data: { client: newClient } };
      }

      // ── Quotation ──
      case 'create_quotation': {
        const client = resolveClient(action.params, clientsStore.clients);
        if (!client) return { success: false, message: clientNotFoundMessage(action.params) };

        const items = buildLineItems(action.params.items);
        if (items.length === 0) return { success: false, message: 'No items specified for the quotation.' };

        const data: CreateDocumentData = {
          companyId,
          clientId: client.id,
          items,
          taxType: action.params.taxType || 'none',
          taxPercent: resolveTaxPercent(action.params.taxType, action.params.taxPercent),
          discount: action.params.discount || 0,
          discountType: action.params.discountType || 'fixed',
          notes: action.params.notes,
          terms: action.params.terms,
          validUntil: action.params.validUntil,
        };

        const quotation = await documentsStore.createQuotation(data);
        return { success: true, message: formatDocumentSummary('Quotation', quotation, client), data: { document: quotation, client } };
      }

      // ── Invoice ──
      case 'create_invoice': {
        const client = resolveClient(action.params, clientsStore.clients);
        if (!client) return { success: false, message: clientNotFoundMessage(action.params) };

        const items = buildLineItems(action.params.items);
        if (items.length === 0) return { success: false, message: 'No items specified for the invoice.' };

        const dueDate = action.params.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const data: CreateDocumentData & { dueDate: string } = {
          companyId,
          clientId: client.id,
          items,
          dueDate,
          taxType: action.params.taxType || 'none',
          taxPercent: resolveTaxPercent(action.params.taxType, action.params.taxPercent),
          discount: action.params.discount || 0,
          discountType: action.params.discountType || 'fixed',
          notes: action.params.notes,
          terms: action.params.terms,
        };

        const invoice = await documentsStore.createInvoice(data);
        return { success: true, message: formatDocumentSummary('Invoice', invoice, client), data: { document: invoice, client } };
      }

      // ── Purchase Order ──
      case 'create_purchase_order': {
        const client = resolveClient(action.params, clientsStore.clients);
        if (!client) return { success: false, message: clientNotFoundMessage(action.params) };

        const items = buildLineItems(action.params.items);
        if (items.length === 0) return { success: false, message: 'No items specified for the purchase order.' };

        const data: CreateDocumentData = {
          companyId,
          clientId: client.id,
          items,
          taxType: action.params.taxType || 'none',
          taxPercent: resolveTaxPercent(action.params.taxType, action.params.taxPercent),
          discount: action.params.discount || 0,
          discountType: action.params.discountType || 'fixed',
          notes: action.params.notes,
          terms: action.params.terms,
          expectedDeliveryDate: action.params.expectedDeliveryDate,
        };

        const po = await documentsStore.createPurchaseOrder(data);
        return { success: true, message: formatDocumentSummary('Purchase Order', po, client), data: { document: po, client } };
      }

      // ── Delivery Note ──
      case 'create_delivery_note': {
        const client = resolveClient(action.params, clientsStore.clients);
        if (!client) return { success: false, message: clientNotFoundMessage(action.params) };

        const items = buildLineItems(action.params.items);
        if (items.length === 0) return { success: false, message: 'No items specified for the delivery note.' };

        const deliveryDate = action.params.deliveryDate || new Date().toISOString();
        const data: CreateDocumentData & { deliveryDate: string } = {
          companyId,
          clientId: client.id,
          items,
          deliveryDate,
          taxType: action.params.taxType || 'none',
          taxPercent: resolveTaxPercent(action.params.taxType, action.params.taxPercent),
          discount: action.params.discount || 0,
          discountType: action.params.discountType || 'fixed',
          notes: action.params.notes,
          terms: action.params.terms,
        };

        const dn = await documentsStore.createDeliveryNote(data);
        return { success: true, message: formatDocumentSummary('Delivery Note', dn, client), data: { document: dn, client } };
      }

      // ── Conversions ──
      case 'convert_to_invoice': {
        const docId = resolveDocumentId(action.params, documentsStore.documents);
        if (!docId) return { success: false, message: documentNotFoundMessage(action.params) };

        const invoice = await documentsStore.convertToInvoice(docId);
        if (!invoice) return { success: false, message: 'Failed to convert. Ensure the source document is a quotation.' };

        const client = clientsStore.getClient(invoice.clientId);
        return { success: true, message: formatDocumentSummary('Invoice', invoice, client), data: { document: invoice, client } };
      }

      case 'convert_to_purchase_order': {
        const docId = resolveDocumentId(action.params, documentsStore.documents);
        if (!docId) return { success: false, message: documentNotFoundMessage(action.params) };

        const po = await documentsStore.convertToPurchaseOrder(docId);
        if (!po) return { success: false, message: 'Failed to convert to purchase order.' };

        const client = clientsStore.getClient(po.clientId);
        return { success: true, message: formatDocumentSummary('Purchase Order', po, client), data: { document: po, client } };
      }

      case 'convert_to_delivery_note': {
        const docId = resolveDocumentId(action.params, documentsStore.documents);
        if (!docId) return { success: false, message: documentNotFoundMessage(action.params) };

        const dn = await documentsStore.convertToDeliveryNote(docId);
        if (!dn) return { success: false, message: 'Failed to convert to delivery note.' };

        const client = clientsStore.getClient(dn.clientId);
        return { success: true, message: formatDocumentSummary('Delivery Note', dn, client), data: { document: dn, client } };
      }

      // ── Read operations ──
      case 'get_document': {
        const doc = resolveDocument(action.params, documentsStore.documents);
        if (!doc) return { success: false, message: documentNotFoundMessage(action.params) };

        const client = clientsStore.getClient(doc.clientId);
        const typeName = DOCUMENT_TYPE_LABELS[doc.type];
        const itemsList = doc.items.map((it) => `  - ${it.name} × ${it.quantity} @ ${formatCurrency(it.unitPrice)}`).join('\n');
        return {
          success: true,
          message: [
            `**${typeName} ${doc.documentNumber}**`,
            `• Client: ${client?.name || 'Unknown'}`,
            `• Status: ${doc.status}`,
            `• Date: ${formatDate(doc.dateIssued)}`,
            `• Items:\n${itemsList}`,
            `• Subtotal: ${formatCurrency(doc.subtotal)}`,
            doc.taxTotal > 0 ? `• Tax: ${formatCurrency(doc.taxTotal)}` : null,
            `• **Grand Total: ${formatCurrency(doc.grandTotal)}**`,
          ].filter(Boolean).join('\n'),
          data: { document: doc, client },
        };
      }

      case 'list_documents': {
        const { type, status, limit } = action.params;
        let docs = [...documentsStore.documents];
        if (type) docs = docs.filter((d) => d.type === type);
        if (status) docs = docs.filter((d) => d.status === status);
        docs = docs.slice(0, limit || 10);

        if (docs.length === 0) return { success: true, message: 'No documents found matching the criteria.', data: { documents: [] } };

        const list = docs.map((d) => {
          const c = clientsStore.getClient(d.clientId);
          return `• **${d.documentNumber}** — ${c?.name || 'Unknown'} — ${formatCurrency(d.grandTotal)} _(${d.status})_`;
        }).join('\n');

        return { success: true, message: `Found ${docs.length} document(s):\n${list}`, data: { documents: docs } };
      }

      case 'get_follow_ups': {
        const allDocs = [...documentsStore.documents];
        const actionableStatuses = ['draft', 'sent', 'pending', 'overdue'];
        const actionable = allDocs.filter((d) => actionableStatuses.includes(d.status));

        if (actionable.length === 0) {
          return { success: true, message: '✅ **All clear!** No pending follow-ups — all documents are up to date.', data: { documents: [] } };
        }

        const groups: Record<string, string[]> = {};
        for (const doc of actionable) {
          const c = clientsStore.getClient(doc.clientId);
          const line = `  • **${doc.documentNumber}** — ${c?.name || 'Unknown'} — ${formatCurrency(doc.grandTotal)}`;
          const key = doc.status;
          if (!groups[key]) groups[key] = [];
          groups[key].push(line);
        }

        const statusLabels: Record<string, string> = {
          overdue: '🔴 Overdue',
          pending: '🟡 Pending / Awaiting Response',
          sent: '📤 Sent (awaiting payment/acceptance)',
          draft: '📝 Drafts (not yet sent)',
        };

        const sections: string[] = [`**📋 Follow-ups & Pending Tasks (${actionable.length})**`, ''];
        for (const status of ['overdue', 'pending', 'sent', 'draft']) {
          if (groups[status]?.length) {
            sections.push(`**${statusLabels[status] || status}:**`);
            sections.push(...groups[status]);
            sections.push('');
          }
        }

        return { success: true, message: sections.join('\n').trim(), data: { documents: actionable } };
      }

      case 'update_document_status': {
        const docId = resolveDocumentId(action.params, documentsStore.documents);
        if (!docId) return { success: false, message: documentNotFoundMessage(action.params) };

        await documentsStore.updateDocumentStatus(docId, action.params.status);
        const doc = documentsStore.getDocument(docId);
        return {
          success: true,
          message: `Document **${doc?.documentNumber || docId}** status updated to **${action.params.status}**.`,
          data: { document: doc },
        };
      }

      // ── PDF generation ──
      case 'generate_pdf': {
        const doc = resolveDocument(action.params, documentsStore.documents);
        if (!doc) return { success: false, message: documentNotFoundMessage(action.params) };

        const client = clientsStore.getClient(doc.clientId);
        if (!client) return { success: false, message: 'Client not found for this document.' };

        const company = authStore.company;
        if (!company) return { success: false, message: 'Company profile not found.' };

        const pdfSettings = usePDFSettingsStore.getState().settings;

        try {
          const blob = await generateDocumentPDF({ document: doc, company, client, pdfSettings: pdfSettings || undefined });
          const filename = `${doc.documentNumber.replace(/\s+/g, '_')}.pdf`;
          downloadPDF(blob, filename);
          return { success: true, message: `PDF downloaded: **${filename}**`, data: { document: doc } };
        } catch (err: any) {
          return { success: false, message: `PDF generation failed: ${err.message}` };
        }
      }

      // ── Email ──
      case 'send_email': {
        const doc = resolveDocument(action.params, documentsStore.documents);
        if (!doc) return { success: false, message: documentNotFoundMessage(action.params) };

        const client = clientsStore.getClient(doc.clientId);
        if (!client) return { success: false, message: 'Client not found for this document.' };
        if (!client.email) return { success: false, message: `No email address on file for **${client.name}**. Please update the client record.` };

        const company = authStore.company;
        if (!company) return { success: false, message: 'Company profile not found.' };

        const template = {
          to: client.email,
          subject: generateEmailSubject(doc, company),
          body: generateEmailBody(doc, company, client),
        };

        // Use openMailClient which uses window.location.href — more
        // reliable than window.open for mailto: links (avoids popup
        // blockers and works consistently across browsers).
        openMailClient(template);
        return { success: true, message: `Email client opened for **${doc.documentNumber}** → **${client.email}**.`, data: { document: doc, client } };
      }

      // ── Financials navigation ──
      case 'navigate_financials': {
        const page = action.params.page || '/financials';
        if (typeof window !== 'undefined') {
          window.location.href = page;
        }
        return { success: true, message: `Navigating to **${action.summary}**…` };
      }

      default:
        return { success: false, message: `Unknown action type: ${(action as any).type}` };
    }
  } catch (err: any) {
    return { success: false, message: `Operation failed: ${err.message || 'Something went wrong.'}` };
  }
}

// ── Post-action hook: update last-document context ──────────────
// Call this from the store after executeERPAction returns.
export function updateDocumentContextFromResult(result: ERPActionResult) {
  if (result.success && result.data?.document) {
    const doc = result.data.document;
    if (doc.id && doc.documentNumber) {
      setLastDocumentContext({ id: doc.id, documentNumber: doc.documentNumber, type: doc.type });
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function resolveClient(params: Record<string, any>, clients: Client[]): Client | null {
  if (params.clientId) return clients.find((c) => c.id === params.clientId) || null;

  const search = (params.clientSearch || params.clientName || params.supplierName || '').toLowerCase().trim();
  if (!search) return clients.length === 1 ? clients[0] : null; // If only one client exists, use it

  // Exact match
  const exact = clients.find((c) => c.name.toLowerCase() === search);
  if (exact) return exact;

  // Partial match — search contained in client name
  const partial = clients.find((c) => c.name.toLowerCase().includes(search));
  if (partial) return partial;

  // Reverse partial — client name contained in search term
  const reversePartial = clients.find((c) => search.includes(c.name.toLowerCase()));
  if (reversePartial) return reversePartial;

  // Word-based fuzzy: every word in search appears somewhere in the name
  const words = search.split(/\s+/).filter((w: string) => w.length > 1);
  if (words.length > 0) {
    const fuzzy = clients.find((c) => {
      const nameLower = c.name.toLowerCase();
      return words.every((w: string) => nameLower.includes(w));
    });
    if (fuzzy) return fuzzy;
  }

  // Any-word fuzzy: at least half the words in the search match
  if (words.length >= 2) {
    let bestMatch: Client | null = null;
    let bestScore = 0;
    for (const c of clients) {
      const nameLower = c.name.toLowerCase();
      const matchCount = words.filter((w: string) => nameLower.includes(w)).length;
      const score = matchCount / words.length;
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = c;
      }
    }
    if (bestMatch) return bestMatch;
  }

  // Single significant word: check if any word (>2 chars) matches any client
  for (const w of words) {
    if (w.length > 2) {
      const wordMatch = clients.find((c) => c.name.toLowerCase().includes(w));
      if (wordMatch) return wordMatch;
    }
  }

  return null;
}

function resolveDocument(params: Record<string, any>, documents: Document[]): Document | null {
  if (params.documentId || params.sourceId || params.quotationId) {
    const id = params.documentId || params.sourceId || params.quotationId;
    return documents.find((d) => d.id === id) || null;
  }

  const num = (params.documentNumber || params.sourceNumber || '').toUpperCase().trim();
  if (num) {
    // Exact
    const exact = documents.find((d) => d.documentNumber.toUpperCase() === num);
    if (exact) return exact;
    // Contains
    const partial = documents.find((d) => d.documentNumber.toUpperCase().includes(num));
    if (partial) return partial;
  }

  // Fallback: last document from conversation context
  const ctx = getLastDocumentContext();
  if (ctx) {
    return documents.find((d) => d.id === ctx.id) || documents.find((d) => d.documentNumber === ctx.documentNumber) || null;
  }

  return null;
}

function resolveDocumentId(params: Record<string, any>, documents: Document[]): string | null {
  if (params.documentId || params.sourceId || params.quotationId) {
    return params.documentId || params.sourceId || params.quotationId;
  }
  const doc = resolveDocument(params, documents);
  return doc?.id || null;
}

function buildLineItems(items: any[] | undefined): LineItem[] {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  return items.map((item: any) =>
    createLineItem({
      name: item.name || item.description || 'Item',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || Number(item.price) || 0,
    }),
  );
}

function resolveTaxPercent(taxType?: string, taxPercent?: number): number {
  if (taxPercent !== undefined) return taxPercent;
  if (taxType === 'vat') return 16;
  if (taxType === 'tot') return 4;
  return 0;
}

function clientNotFoundMessage(params: Record<string, any>): string {
  const search = params.clientSearch || params.clientName || params.supplierName || '';
  if (!search) {
    return 'I could not identify which client you meant. Please mention the client name — for example: "create an invoice for ZedBuild Ltd".';
  }
  return `Client **"${search}"** was not found. Please make sure the client exists in the system or create them first. You can say "create client ${search}" to add them.`;
}

function documentNotFoundMessage(params: Record<string, any>): string {
  const num = params.documentNumber || params.sourceNumber || params.documentId || 'the specified document';
  return `Document **"${num}"** was not found. Please verify the document number.`;
}

function formatDocumentSummary(typeName: string, doc: any, client?: Client | null): string {
  const lines: string[] = [
    `✅ **${typeName} ${doc.documentNumber}** created successfully!`,
    '',
    '**Summary:**',
    `• Client: ${client?.name || 'Unknown'}`,
  ];

  if (doc.items?.length) {
    doc.items.forEach((item: any) => {
      lines.push(`• ${item.name} × ${item.quantity} @ ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}`);
    });
  }

  lines.push(`• Subtotal: ${formatCurrency(doc.subtotal)}`);
  if (doc.taxTotal > 0) lines.push(`• Tax: ${formatCurrency(doc.taxTotal)}`);
  if (doc.discount > 0) lines.push(`• Discount: -${formatCurrency(doc.discount)}`);
  lines.push(`• **Grand Total: ${formatCurrency(doc.grandTotal)}**`);
  lines.push('');
  lines.push('Would you like me to send this via email?');

  return lines.join('\n');
}

// ── Business context for system prompt ──────────────────────────
export function getBusinessContext(): {
  clients: { id: string; name: string }[];
  recentDocuments: { id: string; number: string; type: string; clientName: string; status: string; total: number }[];
} {
  const clientsStore = useClientsStore.getState();
  const documentsStore = useDocumentsStore.getState();

  const clients = clientsStore.clients.map((c) => ({ id: c.id, name: c.name }));

  const recentDocuments = documentsStore.documents.slice(0, 25).map((d) => {
    const client = clientsStore.getClient(d.clientId);
    return {
      id: d.id,
      number: d.documentNumber,
      type: d.type,
      clientName: client?.name || 'Unknown',
      status: d.status,
      total: d.grandTotal,
    };
  });

  return { clients, recentDocuments };
}
