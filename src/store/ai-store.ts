import { create } from 'zustand';
import {
  ERPAction,
  ERPActionResult,
  detectIntentFromMessage,
  suggestReformulations,
  cleanAIResponse,
  executeERPAction,
  updateDocumentContextFromResult,
} from '@/lib/erp-tools';

// ── AI Assistant Store ──────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // ERP extensions
  pendingAction?: ERPAction;
  actionResult?: ERPActionResult;
  /** Clickable rephrasing suggestions shown when intent wasn't detected */
  suggestions?: string[];
}

interface AIAssistantStore {
  // Panel visibility
  isOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  // Page context — set by each page so the AI knows where the user is
  pageContext: string;
  setPageContext: (ctx: string) => void;

  // Chat
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sendMessageWithPDF: (userPrompt: string, pdfText: string, fileName: string, pageCount: number) => Promise<void>;
  clearChat: () => void;
  _stopStreaming: () => void;

  // ERP action handling
  pendingAction: ERPAction | null;
  isExecutingAction: boolean;
  confirmAction: () => Promise<void>;
  rejectAction: () => void;
}

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg_${Date.now()}_${msgCounter}`;
}

// Tracks the current streaming interval so we can cancel it
let streamInterval: ReturnType<typeof setInterval> | null = null;

// ── Typing effect helper ────────────────────────────────────────
function runTypingEffect(
  fullText: string,
  set: (partial: Partial<ReturnType<typeof useAIAssistantStore.getState>>) => void,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const words = fullText.split(/(\s+)/);
    let wordIdx = 0;
    let revealed = '';

    set({ isLoading: false, isStreaming: true, streamingContent: '' });

    streamInterval = setInterval(() => {
      const chunkSize = 3;
      for (let i = 0; i < chunkSize && wordIdx < words.length; i++) {
        revealed += words[wordIdx];
        wordIdx++;
      }
      set({ streamingContent: revealed });

      if (wordIdx >= words.length) {
        if (streamInterval) {
          clearInterval(streamInterval);
          streamInterval = null;
        }
        resolve();
      }
    }, 30);
  });
}

export const useAIAssistantStore = create<AIAssistantStore>()((set, get) => ({
  isOpen: false,
  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  pageContext: 'Dashboard',
  setPageContext: (ctx) => set({ pageContext: ctx }),

  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  error: null,

  // ERP state
  pendingAction: null,
  isExecutingAction: false,

  _stopStreaming: () => {
    if (streamInterval) {
      clearInterval(streamInterval);
      streamInterval = null;
    }
    set({ isStreaming: false, streamingContent: '' });
  },

  // ══════════════════════════════════════════════════════════════
  // sendMessage — the main chat flow.
  //
  // 1. Detect an ERP action from the USER's message (client-side).
  // 2. Call the AI for a conversational reply (no structured output).
  // 3. Clean the AI reply of any leaked JSON.
  // 4. If an action was detected, show a confirmation card or execute
  //    immediately (depending on requiresConfirmation).
  // ══════════════════════════════════════════════════════════════
  sendMessage: async (content: string) => {
    // Cancel any ongoing stream
    get()._stopStreaming();

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content, timestamp: Date.now() };
    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true, error: null, pendingAction: null }));

    // ── Step 1: Detect intent from the user's natural language ──
    const action = detectIntentFromMessage(content);

    try {
      // ── Step 2: Get conversational reply from AI ──────────────
      const history = [...get().messages]
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: get().pageContext,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }

      // ── Step 3: Clean the AI reply ────────────────────────────
      const rawReply: string = data.reply ?? '';
      let displayText = cleanAIResponse(rawReply) || 'Got it!';

      // When an ERP action was detected, suppress the AI's conversational
      // text if it looks like hallucinated data (fake doc numbers, amounts,
      // client names, etc.).  Replace it with the action summary which is
      // generated from the real detected params.
      if (action) {
        displayText = action.summary || "I'll process that for you.";
      }

      // ── Step 4: Typing effect ─────────────────────────────────
      await runTypingEffect(displayText, set as any);

      const msgId = nextId();

      // ── Step 5: Handle the detected action ────────────────────
      if (action && action.requiresConfirmation) {
        // Show confirmation card
        const assistantMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
          pendingAction: action,
        };
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
          pendingAction: action,
        }));
      } else if (action && !action.requiresConfirmation) {
        // Execute read-only operations immediately
        const assistantTextMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
        };
        set((s) => ({
          messages: [...s.messages, assistantTextMsg],
          isStreaming: false,
          streamingContent: '',
        }));

        // Execute the action
        set({ isExecutingAction: true });
        const result = await executeERPAction(action);
        updateDocumentContextFromResult(result);
        set({ isExecutingAction: false });

        const resultMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
          actionResult: result,
        };
        await runTypingEffect(result.message, set as any);
        set((s) => ({
          messages: [...s.messages, resultMsg],
          isStreaming: false,
          streamingContent: '',
        }));
      } else {
        // Regular conversation — no ERP action detected.
        // Generate clickable reformulation suggestions if the message
        // seems to be about documents or clients but used unfamiliar phrasing.
        const suggestions = suggestReformulations(content);
        const assistantMsg: ChatMessage = {
          id: msgId,
          role: 'assistant',
          content: displayText,
          timestamp: Date.now(),
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        };
        set((s) => ({
          messages: [...s.messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
        }));
      }
    } catch (err: any) {
      set({ isLoading: false, isStreaming: false, streamingContent: '', error: err?.message || 'Something went wrong.' });
    }
  },

  confirmAction: async () => {
    const action = get().pendingAction;
    if (!action) return;

    set({ pendingAction: null, isExecutingAction: true });

    try {
      const result = await executeERPAction(action);
      updateDocumentContextFromResult(result);

      // Typing effect for result
      await runTypingEffect(result.message, set as any);

      const resultMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: result.message,
        timestamp: Date.now(),
        actionResult: result,
      };
      set((s) => ({
        messages: [...s.messages, resultMsg],
        isStreaming: false,
        streamingContent: '',
        isExecutingAction: false,
      }));
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: `Action failed: ${err.message || 'Something went wrong.'}`,
        timestamp: Date.now(),
        actionResult: { success: false, message: err.message },
      };
      set((s) => ({
        messages: [...s.messages, errorMsg],
        isExecutingAction: false,
      }));
    }
  },

  rejectAction: () => {
    const action = get().pendingAction;
    set({ pendingAction: null });

    if (action) {
      const cancelMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: `Action cancelled: ${action.summary}. Let me know if you need anything else.`,
        timestamp: Date.now(),
      };
      set((s) => ({ messages: [...s.messages, cancelMsg] }));
    }
  },

  // ══════════════════════════════════════════════════════════════
  // sendMessageWithPDF — upload a PDF, extract text client-side,
  // then send the text + user prompt to the AI for summarization.
  // ══════════════════════════════════════════════════════════════
  sendMessageWithPDF: async (userPrompt: string, pdfText: string, fileName: string, pageCount: number) => {
    get()._stopStreaming();

    const cleanPrompt = userPrompt || 'Summarize this PDF';
    const displayContent = `📄 **${fileName}** (${pageCount} page${pageCount !== 1 ? 's' : ''})\n${cleanPrompt}`;

    const userMsg: ChatMessage = { id: nextId(), role: 'user', content: displayContent, timestamp: Date.now() };
    set((s) => ({ messages: [...s.messages, userMsg], isLoading: true, error: null, pendingAction: null }));

    try {
      // Build history WITHOUT the display message we just added
      const allMsgs = get().messages;
      const history = allMsgs
        .slice(0, -1)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: get().pageContext,
          pdfText,
          pdfFileName: fileName,
          pdfPageCount: pageCount,
          pdfUserPrompt: cleanPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      const rawReply: string = data.reply ?? '';
      const displayText = cleanAIResponse(rawReply) || 'I could not extract a useful summary from this PDF.';

      await runTypingEffect(displayText, set as any);

      const assistantMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        content: displayText,
        timestamp: Date.now(),
      };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isStreaming: false,
        streamingContent: '',
      }));
    } catch (err: any) {
      set({ isLoading: false, isStreaming: false, streamingContent: '', error: err?.message || 'Something went wrong.' });
    }
  },

  clearChat: () => {
    const s = get();
    s._stopStreaming();
    set({ messages: [], error: null, pendingAction: null, isExecutingAction: false });
  },
}));
