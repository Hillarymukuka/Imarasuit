'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  TrashIcon,
  SparklesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  BoltIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import { useAIAssistantStore, ChatMessage } from '@/store/ai-store';
import { cn } from '@/lib/utils';
import { ERPAction, ERPActionResult } from '@/lib/erp-tools';
import { PaperClipIcon } from '@heroicons/react/24/outline';

// ── Quick-prompt suggestions per context ────────────────────────
const QUICK_PROMPTS: Record<string, string[]> = {
  Dashboard: [
    'List my recent quotations',
    'Show all unpaid invoices',
    'What should I follow up on this week?',
    'Show my recent purchase orders',
    'Any overdue documents?',
    'Give me a summary of pending tasks',
    'List all draft documents',
    'Show my delivery notes',
    'How many invoices are outstanding?',
    'Upload a PDF for me to read 📎',
  ],
  Quotations: [
    'List all draft quotations',
    'Suggest professional terms & conditions',
    'Show my recent quotes',
    'Create a quote with VAT included',
    'What are best practices for quotations?',
    'Convert my latest quote to an invoice',
    'List accepted quotations',
    'Help me draft payment terms',
  ],
  Invoices: [
    'Convert my latest quotation to an invoice',
    'List overdue invoices',
    'Write a polite payment reminder',
    'Show all unpaid invoices',
    'Create an invoice for consulting services',
    'What VAT rate applies in Zambia?',
    'List invoices from this month',
    'Help me draft late payment terms',
    'Show paid invoices',
  ],
  'Purchase Orders': [
    'Create a PO for 50 office chairs from ABC Suppliers',
    'List all pending purchase orders',
    'Best practices for supplier negotiations',
    'Show my recent POs',
    'Create a purchase order with multiple items',
    'What should a PO include?',
    'List draft purchase orders',
    'Help me write PO terms & conditions',
    'Tips for managing suppliers',
  ],
  'Delivery Notes': [
    'Create a delivery note for ZedBuild Ltd',
    'List recent delivery notes',
    'What should a delivery note include?',
    'Show pending deliveries',
    'Convert an invoice to a delivery note',
    'Best practices for delivery documentation',
    'List delivered items this week',
    'Draft delivery instructions',
    'Any outstanding deliveries?',
  ],
  Letters: [
    'Write a formal business introduction letter',
    'Draft a cover letter for a proposal',
    'Professional closing paragraphs for business letters',
    'Draft a supplier application letter',
    'Write a thank you letter to a client',
    'Help me with a contract renewal letter',
    'Draft a complaint letter to a supplier',
    'Write a recommendation letter',
    'Professional email templates for follow-ups',
  ],
  Clients: [
    'Search for client "ZedBuild"',
    'Create a new client called Copper Mining Corp',
    'Tips for maintaining client relationships',
    'List all my clients',
    'Help me draft a client onboarding email',
    'What details should I keep for each client?',
    'Search for clients in Lusaka',
    'Add a new supplier',
    'Best practices for client management',
  ],
  Settings: [
    'Recommendations for PDF branding',
    'What information should be on a business letterhead?',
    'How should I set up my company profile?',
    'Best color schemes for professional documents',
    'What currency should I use for exports?',
  ],
  'Company Profile': [
    'What bank details should I include?',
    'Best company profile practices',
    'Help me write a company description',
    'What contact details are essential?',
    'Tips for professional branding',
  ],
};

// Pick N random items from a pool, shuffled
function pickRandom(pool: string[], count: number): string[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getQuickPrompts(ctx: string): string[] {
  return QUICK_PROMPTS[ctx] ?? QUICK_PROMPTS['Dashboard'];
}

// Hook: returns a rotating subset of suggestions, refreshing every `intervalMs`
function useRotatingSuggestions(ctx: string, count: number = 3, intervalMs: number = 30000): string[] {
  const pool = getQuickPrompts(ctx);
  const [suggestions, setSuggestions] = React.useState<string[]>(() => pickRandom(pool, count));

  React.useEffect(() => {
    setSuggestions(pickRandom(pool, count));
    const timer = setInterval(() => {
      setSuggestions(pickRandom(pool, count));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [ctx, count, intervalMs, pool.length]);

  return suggestions;
}

// ── Markdown-lite renderer ──────────────────────────────────────
function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    let processed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(
      /`(.*?)`/g,
      '<code class="px-1 py-0.5 bg-gray-100 dark:bg-dark-700 rounded text-xs">$1</code>',
    );
    processed = processed.replace(
      /_(.*?)_/g,
      '<em>$1</em>',
    );
    if (/^[\-•]\s/.test(processed)) {
      processed = `<span class="flex gap-1.5"><span class="text-primary-500 flex-shrink-0">•</span><span>${processed.replace(/^[\-•]\s/, '')}</span></span>`;
    }
    const numMatch = processed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      processed = `<span class="flex gap-1.5"><span class="text-primary-500 font-medium flex-shrink-0">${numMatch[1]}.</span><span>${numMatch[2]}</span></span>`;
    }
    return (
      <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed || '&nbsp;' }} />
    );
  });
}

// ── Confirmation card ───────────────────────────────────────────
function ConfirmationCard({ action, onConfirm, onReject, isExecuting }: {
  action: ERPAction;
  onConfirm: () => void;
  onReject: () => void;
  isExecuting: boolean;
}) {
  const iconMap: Partial<Record<string, React.ReactNode>> = {
    create_quotation: <DocumentTextIcon className="w-4 h-4" />,
    create_invoice: <DocumentTextIcon className="w-4 h-4" />,
    create_purchase_order: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
    create_delivery_note: <DocumentTextIcon className="w-4 h-4" />,
    convert_to_invoice: <BoltIcon className="w-4 h-4" />,
    convert_to_purchase_order: <BoltIcon className="w-4 h-4" />,
    convert_to_delivery_note: <BoltIcon className="w-4 h-4" />,
    create_client: <ClipboardDocumentCheckIcon className="w-4 h-4" />,
    update_document_status: <BoltIcon className="w-4 h-4" />,
  };

  return (
    <div className="flex gap-2.5 max-w-full justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        {iconMap[action.type] || <BoltIcon className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="rounded-2xl px-3.5 py-3 text-[13px] leading-relaxed max-w-[85%] shadow-sm bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-200 border border-amber-200 dark:border-amber-800 rounded-bl-md">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Confirm Action
          </span>
        </div>
        <p className="font-medium text-sm mb-2.5">{action.summary}</p>

        {/* Show item details if available */}
        {action.params?.items?.length > 0 && (
          <div className="mb-2.5 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
            {action.params.items.map((item: any, idx: number) => (
              <div key={idx}>
                • {item.name} × {item.quantity}
                {item.unitPrice > 0 ? ` @ K${Number(item.unitPrice).toLocaleString()}` : ''}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={isExecuting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              isExecuting
                ? 'bg-gray-200 dark:bg-dark-600 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm',
            )}
          >
            {isExecuting ? (
              <>
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                Executing…
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Confirm
              </>
            )}
          </button>
          <button
            onClick={onReject}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600 transition-all"
          >
            <XCircleIcon className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Action result card ──────────────────────────────────────────
function ActionResultBadge({ result }: { result: ERPActionResult }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1',
        result.success
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      )}
    >
      {result.success ? (
        <CheckCircleIcon className="w-3 h-3" />
      ) : (
        <XCircleIcon className="w-3 h-3" />
      )}
      {result.success ? 'Completed' : 'Failed'}
    </div>
  );
}

// ── Message bubble ──────────────────────────────────────────────
function MessageBubble({ message, onSuggestionClick }: {
  message: ChatMessage;
  onSuggestionClick?: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <div className={cn('flex gap-2.5 max-w-full', isUser ? 'justify-end' : 'justify-start')}>
        {!isUser && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
            <SparklesIcon className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%] shadow-sm',
            isUser
              ? 'bg-primary-600 text-white rounded-br-md'
              : 'bg-white dark:bg-dark-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-dark-700 rounded-bl-md',
          )}
        >
          {message.actionResult && !isUser && (
            <ActionResultBadge result={message.actionResult} />
          )}
          {isUser ? message.content : renderContent(message.content)}
        </div>
      </div>

      {/* Suggestion chips — shown when phrasing wasn't recognised */}
      {!isUser && message.suggestions && message.suggestions.length > 0 && (
        <div className="pl-9 flex flex-col gap-1.5 w-full">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            Did you mean?
          </span>
          {message.suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick?.(s)}
              className="self-start text-left text-[12px] px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-100 dark:hover:bg-primary-800/40 hover:border-primary-400 transition-all font-medium"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 shadow-sm">
        <SparklesIcon className="w-3.5 h-3.5 text-white animate-pulse" />
      </div>
      <div className="bg-white dark:bg-dark-800 border border-gray-100 dark:border-dark-700 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ── Executing indicator ─────────────────────────────────────────
function ExecutingIndicator() {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center flex-shrink-0 shadow-sm">
        <BoltIcon className="w-3.5 h-3.5 text-white animate-pulse" />
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
          Executing action…
        </div>
      </div>
    </div>
  );
}

// ── Streaming bubble (typing effect with cursor) ────────────────
function StreamingBubble({ content }: { content: string }) {
  return (
    <div className="flex gap-2.5 max-w-full justify-start">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <SparklesIcon className="w-3.5 h-3.5 text-white animate-pulse" />
      </div>
      <div className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed max-w-[85%] shadow-sm bg-white dark:bg-dark-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-dark-700 rounded-bl-md">
        {renderContent(content)}
        <span className="inline-block w-[2px] h-[14px] bg-primary-500 ml-0.5 align-middle animate-pulse" />
      </div>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────
export function AIAssistantPanel() {
  const {
    isOpen,
    closePanel,
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    sendMessageWithPDF,
    clearChat,
    pageContext,
    pendingAction,
    isExecutingAction,
    confirmAction,
    rejectAction,
  } = useAIAssistantStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF attachment state
  const [pdfAttachment, setPdfAttachment] = useState<{
    file: File;
    text: string;
    pageCount: number;
  } | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isStreaming, streamingContent, pendingAction, isExecutingAction]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSend = () => {
    const text = input.trim();
    if (isLoading || isStreaming) return;

    if (pdfAttachment) {
      // Send with PDF context
      setInput('');
      const prompt = text || 'Summarize this PDF';
      sendMessageWithPDF(prompt, pdfAttachment.text, pdfAttachment.file.name, pdfAttachment.pageCount);
      setPdfAttachment(null);
      return;
    }

    if (!text) return;
    setInput('');
    sendMessage(text);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so the same file can be picked again
    e.target.value = '';

    setIsParsing(true);
    try {
      const { extractTextFromPDF } = await import('@/lib/pdf-reader');

      // Timeout safety — if extraction hangs (e.g. worker fails), don't freeze forever
      const result = await Promise.race([
        extractTextFromPDF(file),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF reading timed out. Please try a smaller file.')), 30000),
        ),
      ]);

      if (!result.text.trim()) {
        throw new Error('No readable text found in this PDF. It may be scanned/image-based.');
      }
      setPdfAttachment({ file, text: result.text, pageCount: result.pageCount });
    } catch (err: any) {
      // Show the error in the panel
      useAIAssistantStore.setState({ error: err?.message || 'Could not read this PDF.' });
    } finally {
      setIsParsing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Rotating suggestions: 3 for welcome screen, refreshed every 30s
  const quickPrompts = useRotatingSuggestions(pageContext, 3, 30000);

  return (
    <>
      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={closePanel}
        />
      )}

      {/* Slide-out panel */}
      <aside
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full sm:w-[400px] bg-gray-50 dark:bg-dark-900',
          'border-l border-gray-200 dark:border-dark-700 shadow-2xl',
          'transform transition-transform duration-300 ease-in-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
              <img
                src="/Logos/Logo%20Design_icon%20Dark.svg"
                alt="Imara AI"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Imara AI</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">ERP Assistant &bull; Sales &bull; Procurement &bull; Docs</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Context badge */}
            <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
              {pageContext}
            </span>
            <button
              onClick={clearChat}
              title="Clear chat"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <button
              onClick={closePanel}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            /* Welcome state */
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mb-4 shadow-lg">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                AI ERP Assistant
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 max-w-xs">
                I can create quotations, invoices, purchase orders, delivery notes, manage your business documents, and read &amp; summarize PDFs.
              </p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-6 max-w-xs">
                Try: &quot;Create a quote for 200 cement bags for ZedBuild Ltd&quot;
              </p>

              {/* Quick suggestions */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Try for {pageContext}
                </p>
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all group"
                  >
                    <span className="flex items-center gap-2">
                      <SparklesIcon className="w-3.5 h-3.5 text-primary-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onSuggestionClick={sendMessage} />
              ))}

              {/* Pending confirmation card */}
              {pendingAction && !isExecutingAction && (
                <ConfirmationCard
                  action={pendingAction}
                  onConfirm={confirmAction}
                  onReject={rejectAction}
                  isExecuting={false}
                />
              )}

              {/* Executing action */}
              {isExecutingAction && <ExecutingIndicator />}

              {isStreaming && streamingContent && (
                <StreamingBubble content={streamingContent} />
              )}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="flex gap-2 items-center text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                  <ArrowPathIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick prompts strip when chat is active */}
        {messages.length > 0 && !isLoading && !pendingAction && (
          <div className="flex-shrink-0 px-4 pb-1">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {quickPrompts.slice(0, 2).map((p, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="flex-shrink-0 text-[10px] px-2.5 py-1.5 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 text-gray-600 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  {p.length > 35 ? p.slice(0, 35) + '…' : p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* PDF attachment chip */}
          {pdfAttachment && (
            <div className={cn(
              'flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg',
              pdfAttachment.pageCount > 25
                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                : 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800',
            )}>
              <DocumentTextIcon className={cn(
                'w-4 h-4 flex-shrink-0',
                pdfAttachment.pageCount > 25
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-primary-600 dark:text-primary-400',
              )} />
              <div className="flex-1 min-w-0">
                <span className={cn(
                  'text-xs truncate block',
                  pdfAttachment.pageCount > 25
                    ? 'text-amber-700 dark:text-amber-300'
                    : 'text-primary-700 dark:text-primary-300',
                )}>
                  {pdfAttachment.file.name} ({pdfAttachment.pageCount} pg{pdfAttachment.pageCount !== 1 ? 's' : ''})
                </span>
                {pdfAttachment.pageCount > 25 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                    <ExclamationTriangleIcon className="w-3 h-3 flex-shrink-0" />
                    Large PDF — summary may not cover the entire document
                  </span>
                )}
              </div>
              <button
                onClick={() => setPdfAttachment(null)}
                className="p-0.5 rounded hover:bg-primary-100 dark:hover:bg-primary-800/40 transition-colors flex-shrink-0"
              >
                <XMarkIcon className="w-3.5 h-3.5 text-primary-500" />
              </button>
            </div>
          )}

          {/* PDF parsing indicator */}
          {isParsing && (
            <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <ArrowPathIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin flex-shrink-0" />
              <span className="text-xs text-amber-700 dark:text-amber-400">Reading PDF…</span>
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Upload PDF button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isStreaming || isParsing}
              title="Upload a PDF to read & summarize"
              className={cn(
                'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                isLoading || isStreaming || isParsing
                  ? 'bg-gray-100 dark:bg-dark-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400',
              )}
            >
              <PaperClipIcon className="w-4 h-4" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={pdfAttachment ? 'Ask about this PDF, or press send to summarize…' : 'Ask Imara AI or describe a task…'}
                rows={1}
                className={cn(
                  'w-full resize-none rounded-xl border border-gray-200 dark:border-dark-600',
                  'bg-gray-50 dark:bg-dark-700 text-sm text-gray-900 dark:text-white',
                  'placeholder:text-gray-400 dark:placeholder:text-gray-500',
                  'px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
                  'transition-all max-h-28',
                )}
                style={{ minHeight: '40px' }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 112) + 'px';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !pdfAttachment) || isLoading || isStreaming}
              className={cn(
                'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                (input.trim() || pdfAttachment) && !isLoading && !isStreaming
                  ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-400 cursor-not-allowed',
              )}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-1.5 text-center">
            AI ERP Assistant — can create docs, read PDFs, search data &amp; more. Verify important results.
          </p>
        </div>
      </aside>
    </>
  );
}
