export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

// ── Cloudflare Workers AI ───────────────────────────────────────
// Uses the free @cf/meta/llama-3.1-8b-instruct model via the
// Cloudflare REST API.  Set CLOUDFLARE_ACCOUNT_ID and
// CLOUDFLARE_AI_TOKEN in .env.local.
// ────────────────────────────────────────────────────────────────

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? '';
const CF_AI_TOKEN   = process.env.CLOUDFLARE_AI_TOKEN   ?? '';
const MODEL         = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ── ERP-aware system prompt ─────────────────────────────────────
// The AI model provides ONLY conversational text replies.
// Intent detection and action execution is handled client-side.
function buildSystemPrompt(context?: string): string {
  return `You are Imara AI — a helpful, professional ERP assistant embedded in a Zambian business management system.

You help users with:
• Drafting professional letters (supplier applications, cover letters, business proposals, formal correspondence, etc.)
• Writing terms & conditions, payment terms, and contract wording
• Business advice on quotations, invoices, purchase orders, and delivery notes
• Market price guidance and cost estimation tips
• Tax questions relevant to Zambia (VAT 16%, TOT 4%)
• Explaining document best-practices
• Confirming what you will do when the user asks you to create, convert, list, or manage documents
• Reading and summarizing uploaded PDF documents — when PDF text is included, analyze and summarize the content clearly

RESPONSE LENGTH:
- For quick questions, confirmations, or operational commands: give SHORT replies (2-5 sentences).
- For content requests (drafting letters, proposals, terms, contracts, emails, etc.): provide the FULL, complete content. Write the entire letter or document — do NOT give outlines or summaries when the user asks you to "draft", "write", or "create" text content. Include proper formatting with date, addresses, salutation, body paragraphs, and closing.

IMPORTANT RULES:
- Use bullet points or numbered lists for multi-step answers.
- Currency is Zambian Kwacha (ZMW / K) unless specified otherwise.
- When a user asks you to create a document (quotation, invoice, PO, delivery note), convert a document, list documents, search clients, or any operational task — confirm what you understood and that you are proceeding. Do NOT output any JSON, code blocks, structured data, or action blocks. The system handles execution automatically.
- NEVER output JSON objects, code fences, or angle-bracket tags in your reply.
- NEVER invent, fabricate, or hallucinate business data. You do NOT have access to the user's documents, clients, quotes, invoices, purchase orders, or delivery notes. When the user asks to list, view, or look up any documents or records, simply acknowledge the request (e.g. "I'll look up your recent quotations now.") and let the system retrieve the real data. Do NOT generate fake document numbers, client names, amounts, dates, or any made-up records.
- When drafting letters or proposals, use any company name, services, and details the user provides in the conversation. If details are missing, ask for them before drafting.
- If you are unsure, say so honestly instead of guessing.
- Do NOT generate harmful, hateful, or inappropriate content.
${context ? `\nThe user is currently on the "${context}" page of the app.` : ''}
`.trim();
}

export async function POST(req: NextRequest) {
  // ── Validate env ──────────────────────────────────────────────
  if (!CF_ACCOUNT_ID || !CF_AI_TOKEN) {
    return NextResponse.json(
      { error: 'Cloudflare AI credentials not configured. Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN to .env.local.' },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const messages: Message[] = body.messages ?? [];
    const pageContext: string | undefined = body.context;
    const pdfText: string | undefined = body.pdfText;
    const pdfFileName: string | undefined = body.pdfFileName;
    const pdfPageCount: number | undefined = body.pdfPageCount;
    const pdfUserPrompt: string | undefined = body.pdfUserPrompt;

    // Prepend system prompt (conversational only — no structured output)
    const systemMsg: Message = { role: 'system', content: buildSystemPrompt(pageContext) };

    let payload;
    if (pdfText) {
      // Truncate to ~40k chars (~10k tokens) to keep within model limits and avoid timeouts
      const truncated = pdfText.length > 40000
        ? pdfText.slice(0, 40000) + '\n\n[…document truncated — only the first portion was included.]'
        : pdfText;

      // Build a single user message with the PDF text + question
      const pdfMessage: Message = {
        role: 'user',
        content: `I've uploaded a PDF document: "${pdfFileName ?? 'document.pdf'}" (${pdfPageCount ?? '?'} pages).\n\nHere is the full text extracted from the PDF:\n\n---BEGIN DOCUMENT---\n${truncated}\n---END DOCUMENT---\n\nBased on the document above, ${pdfUserPrompt ?? 'please provide a clear, structured summary covering key points, parties involved, dates, amounts, and any action items.'}`,
      };

      // Place conversation history first, then the PDF question at the end
      payload = { messages: [systemMsg, ...messages, pdfMessage], max_tokens: 4096, temperature: 0.7 };
    } else {
      payload = { messages: [systemMsg, ...messages], max_tokens: 2048, temperature: 0.7 };
    }

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`;

    // Retry up to 3 times — Node's undici has a hardcoded 10s connect timeout
    // that can fail on slow networks or large payloads.
    let cfRes: Response | null = null;
    let lastError: Error | null = null;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        cfRes = await fetch(cfUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CF_AI_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(120000),
        });
        break; // success — exit retry loop
      } catch (fetchErr: any) {
        lastError = fetchErr;
        console.warn(`Cloudflare AI fetch attempt ${attempt}/${MAX_RETRIES} failed:`, fetchErr?.cause?.code ?? fetchErr.message);
        if (attempt < MAX_RETRIES) {
          // Wait before retrying: 2s, then 4s
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    if (!cfRes) {
      console.error('Cloudflare AI: all retry attempts failed', lastError);
      return NextResponse.json(
        { error: 'Could not connect to the AI service. Please check your internet connection and try again.' },
        { status: 502 },
      );
    }

    if (!cfRes.ok) {
      const errText = await cfRes.text();
      console.error('Cloudflare AI error:', cfRes.status, errText);
      return NextResponse.json(
        { error: 'AI service returned an error. Please try again.' },
        { status: 502 },
      );
    }

    const cfData = (await cfRes.json()) as { result?: { response?: string }; success?: boolean };
    const reply = cfData?.result?.response ?? 'Sorry, I could not generate a response.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI assistant error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
