# Ancestro Business Suite

> **For any AI assistant picking this up**: This document is the single source of truth for this project. Read it fully before making changes. The codebase is a **full-stack SaaS** — not a purely client-side app. The old README was outdated and has been replaced with this one.

A multi-tenant, full-stack business management platform for **Zambia-based SMEs**. It handles document workflows (quotations → invoices → delivery notes), logistics tracking, social media marketing, and an AI assistant. Built on **Next.js 14 + Cloudflare Workers**.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Modules](#modules)
5. [Dev Environment Setup](#dev-environment-setup)
6. [Environment Variables](#environment-variables)
7. [Database](#database)
8. [API Routes Reference](#api-routes-reference)
9. [Frontend — State Management](#frontend--state-management)
10. [Frontend — Key Libraries](#frontend--key-libraries)
11. [AI Assistant](#ai-assistant)
12. [PDF Generation](#pdf-generation)
13. [Authentication & Security](#authentication--security)
14. [Multi-Tenancy](#multi-tenancy)
15. [Deployment](#deployment)
16. [Known Issues & TODOs](#known-issues--todos)
17. [Conventions & Patterns](#conventions--patterns)

---

## Architecture Overview

```
┌─────────────────────────────────────┐     ┌────────────────────────────────────────┐
│  Frontend — Next.js 14 App Router   │────▶│  Backend — Cloudflare Workers (Hono)   │
│  localhost:3000                     │     │  localhost:8787                         │
│                                     │     │                                         │
│  - React 18 + TypeScript            │     │  - Hono v4 router                       │
│  - Tailwind CSS                     │     │  - Cloudflare D1 (SQLite) — DB          │
│  - Zustand stores                   │     │  - Cloudflare R2 — file/media storage   │
│  - jsPDF (client-side PDF gen)      │     │  - Workers AI (Llama 3.1 8B) via REST   │
│  - Cloudflare AI (via fetch proxy)  │     │  - JWT auth (Web Crypto PBKDF2)         │
└─────────────────────────────────────┘     └────────────────────────────────────────┘
```

**Important:** Data is **not** stored in localStorage. All data lives in **Cloudflare D1** (SQLite), scoped per company (multi-tenant). The old README was wrong about this.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | Next.js | 14.0.4 |
| UI library | React | 18.2 |
| Language | TypeScript | 5.3 |
| Styling | Tailwind CSS | 3.4 |
| State management | Zustand | 4.4 |
| Forms | React Hook Form + Zod | 7.49 / 3.22 |
| PDF generation | jsPDF + jspdf-autotable | 2.5 / 3.8 |
| PDF reading | pdfjs-dist | 4.4 |
| Icons | Heroicons v2 + Lucide React | 2.2 / 0.303 |
| Date utilities | date-fns | 3.0 |
| QR codes | qrcode | 1.5 |
| ID generation | uuid | 9.0 |
| Backend runtime | Cloudflare Workers | — |
| Backend router | Hono | 4.0 |
| Database | Cloudflare D1 (SQLite) | — |
| File storage | Cloudflare R2 | — |
| AI model | Cloudflare Workers AI (Llama 3.1 8B) | — |

---

## Project Structure

```
business-suite/
│
├── .env.local                   # Frontend env vars (NEXT_PUBLIC_API_URL, CF tokens)
├── next.config.js               # Next.js config (pdfjs canvas shims)
├── tailwind.config.js
├── tsconfig.json
│
├── start-all.bat                # Starts BOTH frontend + backend (Windows)
├── start-backend.bat            # Backend only
├── start-server.bat             # Frontend only
├── init-database.bat            # Runs schema migrations on local D1
│
├── src/                         # ◀ FRONTEND (Next.js)
│   ├── app/                     # App Router pages
│   │   ├── page.tsx             # Dashboard (/)
│   │   ├── layout.tsx           # Root layout → AppShell
│   │   ├── login/               # /login
│   │   ├── signup/              # /signup
│   │   ├── company/             # /company — company profile
│   │   ├── clients/             # /clients — client management
│   │   ├── quotations/          # /quotations
│   │   ├── invoices/            # /invoices
│   │   ├── purchase-orders/     # /purchase-orders
│   │   ├── delivery-notes/      # /delivery-notes
│   │   ├── letters/             # /letters — business letters
│   │   ├── settings/            # /settings — theme, PDF, currency, data export
│   │   ├── logistics/           # /logistics/* — shipments, containers, riders, tracking
│   │   ├── marketing/           # /marketing/* — composer, campaigns, schedule, settings
│   │   └── api/                 # Next.js API routes (minimal — most logic is in CF backend)
│   │
│   ├── components/
│   │   ├── ai/                  # AIAssistantButton, AIAssistantPanel
│   │   ├── auth/                # AuthProvider (initialises auth on app load)
│   │   ├── documents/           # DocumentList, PDFColorSettings, document preview
│   │   ├── forms/               # DocumentForm, CompanyForm, ClientForm, etc.
│   │   ├── layout/              # AppShell, MainLayout, Sidebar, Header, ModuleGuard
│   │   └── ui/                  # Button, Modal, Card, Badge, Skeleton, etc.
│   │
│   ├── lib/
│   │   ├── api-base.ts          # JWT token management + apiFetch() wrapper
│   │   ├── api-client.ts        # Barrel: re-exports all domain API clients
│   │   ├── api-settings.ts      # PDF / app settings API calls
│   │   ├── constants.ts         # Document prefixes, status colours, currencies, tax rates
│   │   ├── email-service.ts     # Builds mailto: links for emailing documents
│   │   ├── erp-tools.ts         # AI assistant — ERP intent detection + action executor
│   │   ├── pdf-generator.ts     # jsPDF-based PDF generation for all doc types
│   │   ├── pdf-reader.ts        # pdfjs-dist PDF text extraction
│   │   ├── useAIContext.ts      # Hook: sets page context for AI assistant
│   │   ├── useDataInit.ts       # Hook: initialises all stores after login
│   │   └── utils.ts             # formatCurrency, formatDate, generateId, etc.
│   │
│   ├── modules/                 # Feature modules (each mirrors the backend module)
│   │   ├── registry.ts          # Central module registry (id, name, sidebar items)
│   │   ├── business-documents/  # Clients, Documents, Letters
│   │   │   ├── api/             # documents.ts, letters.ts API clients
│   │   │   ├── components/      # Module-specific components
│   │   │   ├── store/           # documents.ts, clients.ts, letters.ts Zustand stores
│   │   │   └── types/           # documents.ts, letters.ts TypeScript types
│   │   ├── logistics/           # Shipments, Containers, Riders, Deliveries, Tracking
│   │   │   ├── api/             # logistics API client
│   │   │   ├── store/           # Zustand store
│   │   │   └── types/           # Logistics types
│   │   └── marketing/           # Social media management
│   │       ├── api/             # marketing API client
│   │       ├── store/           # posts, campaigns, settings stores
│   │       └── types/           # Marketing types
│   │
│   ├── store/                   # Core Zustand stores (non-module)
│   │   ├── index.ts             # Barrel re-export for all stores
│   │   ├── auth-store.ts        # User auth state + login/signup/logout actions
│   │   ├── company-store.ts     # Company profile
│   │   ├── theme-store.ts       # Dark / light theme toggle
│   │   ├── ui-store.ts          # UI state (sidebar collapsed, modals, etc.)
│   │   ├── pdf-settings-store.ts # PDF colours, templates, active currency
│   │   ├── tenant-store.ts      # Module enable/disable state
│   │   └── ai-store.ts          # AI assistant messages, streaming, ERP actions
│   │
│   └── types/
│       ├── index.ts             # Barrel re-export
│       ├── core.ts              # CompanyProfile, Address, BankInfo, Client, etc.
│       └── pdf.ts               # PDFColor, PDFSettings, PDFTemplate types
│
└── backend/                     # ◀ BACKEND (Cloudflare Workers)
    ├── wrangler.toml            # CF Workers config: D1, R2, AI binding, Cron, OAuth secrets
    ├── src/
    │   ├── index.ts             # Entry point: Hono app, CORS, route registration, cron handler
    │   ├── types.ts             # Bindings, Variables, AppEnv, all DB row types
    │   ├── middleware/
    │   │   └── auth.ts          # JWT Bearer middleware (sets userId + companyId in context)
    │   ├── routes/              # Core routes (no module)
    │   │   ├── auth.ts          # /api/auth — signup, login, /me
    │   │   ├── companies.ts     # /api/company — CRUD + logo upload to R2
    │   │   ├── modules.ts       # /api/modules — module enable/disable per tenant
    │   │   └── settings.ts      # /api/settings — PDF settings persistence
    │   ├── utils/
    │   │   ├── auth.ts          # PBKDF2 password hash/verify + JWT sign/verify (Web Crypto)
    │   │   └── ...
    │   ├── db/
    │   │   ├── schema.sql       # Master schema (companies, users, clients, documents, …)
    │   │   └── migrations/      # Numbered SQL migration files
    │   └── modules/
    │       ├── business-documents/
    │       │   └── routes/
    │       │       ├── clients.ts   # /api/clients CRUD
    │       │       ├── documents.ts # /api/documents CRUD + status transitions
    │       │       └── letters.ts   # /api/letters CRUD
    │       ├── logistics/
    │       │   └── routes/
    │       │       ├── shipments.ts   # /api/logistics/shipments
    │       │       ├── containers.ts  # /api/logistics/containers
    │       │       ├── motorcycle.ts  # /api/logistics/riders + deliveries
    │       │       ├── tracking.ts    # /api/logistics/tracking
    │       │       └── reports.ts     # /api/logistics/reports
    │       └── marketing/
    │           ├── routes/
    │           │   ├── posts.ts      # /api/marketing/posts CRUD + schedule
    │           │   ├── campaigns.ts  # /api/marketing/campaigns CRUD
    │           │   ├── settings.ts   # /api/marketing/settings (connected accounts)
    │           │   ├── ai.ts         # /api/marketing/ai/generate (Llama 3.1 8B)
    │           │   └── oauth.ts      # /api/oauth/callback — Twitter, LinkedIn, Facebook
    │           └── utils/
    │               └── social-publisher.ts  # Cron: auto-publishes scheduled posts
```

---

## Modules

The app uses a **module registry pattern**. Each module is defined in `src/modules/registry.ts` and can be enabled/disabled per tenant via the `/api/modules` endpoint.

### Module: Business Documents (`business-documents`)
The core module. Always enabled.
- **Clients** — client address book, used as recipients on all documents
- **Quotations** — draft quotes with line items, tax (VAT 16% / TOT 4% / none), discounts
- **Invoices** — billings with due-date, payment status tracking
- **Purchase Orders** — supplier order management
- **Delivery Notes** — delivery records with dispatch/receipt dates
- **Letters** — formal letterhead-based business letters

Document numbers are auto-generated with configurable prefixes (QUO-, INV-, PO-, DN-).  
Documents support: draft → sent → accepted/rejected → paid → overdue lifecycle.  
All documents can be **converted** (e.g., Quotation → Invoice → Delivery Note).

### Module: Logistics (`logistics`)
- **Shipments** — track cargo shipments with origin/destination, weight, dimensions
- **Containers** — container load management
- **Riders / Motorcycle Deliveries** — GPS-tracked local delivery fleet
- **Tracking** — real-time tracking updates per shipment
- **Reports** — logistics performance reports

### Module: Marketing (`marketing`)
- **Post Composer** — write and schedule social media posts
- **Campaigns** — group posts into marketing campaigns
- **Schedule View** — calendar view of scheduled posts
- **Connected Accounts** — OAuth connections to Twitter/X, LinkedIn, Facebook
- **AI Content Generation** — Cloudflare Workers AI (Llama 3.1 8B) generates social copy from a prompt
- **Cron auto-publish** — every 5 minutes, the Cloudflare cron trigger fires `processScheduledPosts()` to auto-publish due posts

---

## Dev Environment Setup

### Prerequisites
- Node.js ≥ 18.17
- npm ≥ 9
- Wrangler CLI (installed as a dev dep in `backend/`)

### Quick Start (Windows)

```bat
REM From the project root — starts BOTH servers
start-all.bat
```

This opens two terminal windows:
- **Backend** → `http://localhost:8787` (Wrangler dev)
- **Frontend** → `http://localhost:3000` (Next.js dev)

### Manual Start

```bash
# Terminal 1 — Backend
cd backend
npx wrangler dev --port 8787

# Terminal 2 — Frontend (project root)
npm run dev
```

### Initialise the local database (first time)

```bash
cd backend
npm run db:init:local
# Runs: wrangler d1 execute business-suite-db --local --file=src/db/schema.sql
```

---

## Environment Variables

### Frontend — `.env.local` (project root)

| Variable | Example | Purpose |
|---------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8787/api` | Points frontend at the backend |
| `CLOUDFLARE_ACCOUNT_ID` | `b5c09d...` | Used if AI calls are proxied through Next.js |
| `CLOUDFLARE_AI_TOKEN` | `EDaC...` | Cloudflare AI REST API token |

### Backend — `backend/wrangler.toml` `[vars]` section

| Variable | Purpose |
|---------|---------|
| `JWT_SECRET` | Signs/verifies JWTs — **change in production** |
| `FRONTEND_URL` | CORS allow-list |
| `CLOUDFLARE_ACCOUNT_ID` | Workers AI REST API |
| `CLOUDFLARE_API_TOKEN` | Workers AI REST API |
| `TWITTER_CLIENT_ID/SECRET` | Twitter OAuth |
| `LINKEDIN_CLIENT_ID/SECRET` | LinkedIn OAuth |
| `FACEBOOK_APP_ID/SECRET` | Facebook OAuth |
| `OAUTH_REDIRECT_BASE` | Base URL registered in each OAuth app |

> ⚠️ **Security note**: `wrangler.toml` currently contains real credentials in plain text. These are fine for local dev but **must be replaced with Wrangler secrets** (`wrangler secret put VAR_NAME`) before deploying to production.

---

## Database

**Engine**: Cloudflare D1 (SQLite-compatible)  
**Binding name**: `DB`  
**DB name**: `business-suite-db`  
**Schema location**: `backend/src/db/schema.sql`  
**Migrations**: `backend/src/db/migrations/`

### Core Tables

| Table | Description |
|-------|-------------|
| `companies` | One row per tenant |
| `users` | Users belong to a company (company_id FK) |
| `clients` | Client address book, scoped by company_id |
| `documents` | All doc types (quotation, invoice, purchase_order, delivery_note) — polymorphic |
| `letters` | Business letters |
| `modules` | Per-tenant module enable/disable flags |
| `settings` | Per-company JSON settings blob (PDF colours, templates, currency) |
| + logistics tables | Shipments, containers, riders, deliveries, tracking |
| + marketing tables | Posts, campaigns, social_accounts |

**All tables are scoped by `company_id`** — this is the multi-tenancy boundary.

### DB commands

```bash
# Init local
cd backend && npm run db:init:local

# Init remote (Cloudflare D1 in production)
cd backend && npm run db:init:remote

# Run a query locally
npx wrangler d1 execute business-suite-db --local --command "SELECT * FROM companies"
```

---

## API Routes Reference

All routes are prefixed `/api`. Protected routes require `Authorization: Bearer <jwt>`.

### Auth (public)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Create company + owner user, returns JWT |
| POST | `/api/auth/login` | Returns JWT |
| GET | `/api/auth/me` | Current user + company (protected) |

### Company (protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/company` | Get company profile |
| PUT | `/api/company` | Update company profile |
| POST | `/api/company/logo` | Upload logo to R2 |

### Modules (protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/modules` | Get enabled modules for this tenant |
| PUT | `/api/modules/:id` | Enable/disable a module |

### Settings (protected)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/pdf` | Get PDF settings (colours, templates, currency) |
| PUT | `/api/settings/pdf` | Save PDF settings |

### Media (public)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/media/:key` | Serve file from R2 (e.g., company logos) |

### Business Documents (protected, module: business-documents)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/:id` | Update client |
| DELETE | `/api/clients/:id` | Delete client |
| GET | `/api/documents` | List documents (filterable by type/status) |
| POST | `/api/documents` | Create document |
| GET | `/api/documents/:id` | Get document |
| PUT | `/api/documents/:id` | Update document |
| PATCH | `/api/documents/:id/status` | Update status only |
| DELETE | `/api/documents/:id` | Delete document |
| GET | `/api/letters` | List letters |
| POST | `/api/letters` | Create letter |
| PUT | `/api/letters/:id` | Update letter |
| DELETE | `/api/letters/:id` | Delete letter |

### Logistics (protected, module: logistics)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/logistics/shipments` | List / create shipments |
| GET/PUT/DELETE | `/api/logistics/shipments/:id` | Single shipment |
| GET/POST | `/api/logistics/containers` | List / create containers |
| GET/POST | `/api/logistics/riders` | List / create riders |
| GET/POST | `/api/logistics/deliveries` | Motorcycle deliveries |
| GET/POST | `/api/logistics/tracking` | Tracking updates |
| GET | `/api/logistics/reports` | Reports |

### Marketing (protected, module: marketing)
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/marketing/posts` | List / create posts |
| PUT/DELETE | `/api/marketing/posts/:id` | Update / delete post |
| GET/POST | `/api/marketing/campaigns` | List / create campaigns |
| GET/PUT | `/api/marketing/settings` | Connected accounts settings |
| POST | `/api/marketing/ai/generate` | Generate social copy via Llama 3.1 8B |
| GET | `/api/oauth/callback` | OAuth callback (Twitter, LinkedIn, Facebook) |

---

## Frontend — State Management

All state is managed with **Zustand** stores. Stores persist their data by calling the backend API — there is **no localStorage persistence** for business data.

| Store file | What it manages |
|-----------|----------------|
| `auth-store.ts` | `user`, `company`, `token`; actions: `login`, `signup`, `logout`, `initialize` |
| `company-store.ts` | Company profile, fetched on login |
| `theme-store.ts` | `theme: 'light' \| 'dark'`, persisted in localStorage |
| `ui-store.ts` | Sidebar open/collapsed, loading spinners |
| `pdf-settings-store.ts` | PDF colour presets, active colour, templates, currency code |
| `tenant-store.ts` | Module enable/disable map, `isModuleEnabled(id)` |
| `ai-store.ts` | Chat messages, streaming state, pending ERP actions |
| `modules/business-documents/store/documents.ts` | All documents CRUD |
| `modules/business-documents/store/clients.ts` | Clients CRUD |
| `modules/business-documents/store/letters.ts` | Letters CRUD |
| `modules/logistics/store/` | Logistics CRUD + stats |
| `modules/marketing/store/` | Posts, campaigns, marketing settings |

**Data initialisation flow**:  
`AppShell` → `useDataInit()` hook → on auth, calls `fetchModuleStatus()`, `fetchSettings()`, `fetchDocuments()`, `fetchClients()`, etc. in parallel.

---

## Frontend — Key Libraries

### PDF Generation (`src/lib/pdf-generator.ts`)
Uses **jsPDF + jspdf-autotable**. Generates PDFs entirely client-side.  
Supports colour presets (configurable in Settings), company letterhead, QR codes, and four document templates.  
Called via `generateDocumentPDF(options)` and `downloadPDF(doc, filename)`.

### PDF Reading (`src/lib/pdf-reader.ts`)
Uses **pdfjs-dist**. Extracts text from uploaded PDFs so the AI assistant can read and answer questions about them.  
The worker is served from `public/pdf.worker.min.mjs`.  
`next.config.js` stubs out the canvas module for SSR compatibility.

### Email Service (`src/lib/email-service.ts`)
Builds `mailto:` links with pre-filled subject and body for emailing documents.  
Does **not** send email directly — opens the user's email client.

### Constants (`src/lib/constants.ts`)
Key exports:
- `DOCUMENT_TYPE_LABELS` / `DOCUMENT_TYPE_PREFIXES`
- `DOCUMENT_STATUS_LABELS` / `DOCUMENT_STATUS_COLORS`
- `TAX_OPTIONS` — `none` (0%), `vat` (16%), `tot` (4%) — Zambia tax types
- `CURRENCIES` — 12 currencies, default ZMW (Zambian Kwacha)
- `PDF_COLOR_PRESETS` / `DEFAULT_PDF_SETTINGS`

---

## AI Assistant

The AI assistant is a floating panel accessible from any page via `AIAssistantButton`.

### How it works

1. Each page calls `useAIContext('PageName')` at the top, which sets `pageContext` in `ai-store`.
2. User types a message in `AIAssistantPanel`.
3. `ai-store.sendMessage()` does two things in parallel:
   - **Intent detection** (`erp-tools.ts`): pattern-matches the raw message to detect ERP actions (create document, search client, generate PDF, send email, etc.) — client-side, no AI needed
   - **AI call**: sends message + context to the backend `/api/marketing/ai/generate` endpoint, which calls Cloudflare Workers AI (Llama 3.1 8B)
4. If an ERP action is detected with `requiresConfirmation: true`, the user is shown a confirmation UI before it executes.
5. AI responses are streamed with a typing effect.

### ERP Actions (`src/lib/erp-tools.ts`)
Actions the AI can perform:
`search_clients`, `create_client`, `create_quotation`, `create_invoice`, `create_purchase_order`, `create_delivery_note`, `convert_to_invoice`, `convert_to_purchase_order`, `convert_to_delivery_note`, `get_document`, `list_documents`, `update_document_status`, `generate_pdf`, `get_follow_ups`, `send_email`

The assistant also tracks the **last referenced document** in a module-level variable so contextual follow-ups like "convert it to an invoice" work correctly.

---

## PDF Generation

### Workflow
1. User opens a document → clicks "Download PDF" or "Preview PDF"
2. `pdf-generator.ts` > `generateDocumentPDF()` builds a jsPDF instance
3. Company logo (fetched from R2 via `/api/media/:key`) is embedded as an image
4. Line items rendered via `jspdf-autotable`
5. Colour scheme applied from `pdfSettingsStore.getActiveColor()`
6. Returned as a `jsPDF` object → `downloadPDF()` triggers browser download

### PDF Colour Presets
Configurable in **Settings → PDF Appearance**. Presets include blue, green, purple, gold, red, etc. Custom colours can be added. These are persisted in the backend (`/api/settings/pdf`).

### Templates
Four templates exist per document type (configurable per document type, stored in PDF settings).

---

## Authentication & Security

- **Password hashing**: PBKDF2-SHA256 with a random salt (100,000 iterations) — implemented in Web Crypto API since bcrypt is unavailable in Cloudflare Workers (`backend/src/utils/auth.ts`)
- **JWT**: HMAC-signed, payload contains `sub` (userId) + `company_id`; validated in `authMiddleware`
- **Token storage**: Stored in `localStorage` under `auth_token` key; loaded into memory on init
- **Auth middleware**: Applied globally to all `/api/*` routes except `/api/auth/signup`, `/api/auth/login`, `/api/media/*`, `/api/oauth/callback`
- **CORS**: Allows `localhost`, `127.0.0.1`, `*.pages.dev`, and `*.cloudflare` origins

> ⚠️ For production: rotate `JWT_SECRET`, move all OAuth secrets to `wrangler secret`, and restrict CORS to your production domain only.

---

## Multi-Tenancy

Every database table has a `company_id` column. The auth middleware injects `companyId` into the Hono request context after verifying the JWT. Every DB query in every route handler **must** include a `WHERE company_id = ?` clause — this is the isolation boundary.

The module system (`/api/modules`) lets each company enable/disable modules. The `ModuleGuard` component on the frontend enforces this by checking `useTenantStore().isModuleEnabled(moduleId)` before rendering sub-pages.

---

## Deployment

### Frontend → Cloudflare Pages
```bash
npm run build
# Deploy the .next output directory to Cloudflare Pages
```
Set `NEXT_PUBLIC_API_URL` to the deployed Worker URL in Pages environment variables.

### Backend → Cloudflare Workers
```bash
cd backend
npx wrangler deploy
```
Run remote DB migrations:
```bash
npm run db:init:remote
```
Ensure all secrets are set via `wrangler secret put <VAR_NAME>` rather than checked into `wrangler.toml`.

---

## Known Issues & TODOs

- [ ] `wrangler.toml` contains credentials in plain text — migrate to `wrangler secret`
- [ ] The `[ai]` Workers AI binding in `wrangler.toml` is commented out; the app falls back to the REST API. Re-enable `[ai]` binding for better local dev performance once CF local support improves.
- [ ] `src/store/index.ts.bak` is a leftover backup file — safe to delete
- [ ] `Logistics App/` folder in the project root is a separate, standalone Python/FastAPI/Vite logistics app — it is **not** integrated into this codebase. It predates the current app.
- [ ] Social media OAuth callbacks currently use `OAUTH_REDIRECT_BASE = http://localhost:8787` — update for production
- [ ] Email integration uses `mailto:` links only; no transactional email (e.g., SendGrid) is wired up yet
- [ ] The marketing AI calls use `/api/marketing/ai/generate` — consider unifying with a general `/api/ai` endpoint for the ERP assistant too (currently ERP assistant calls CF AI indirectly via the same POST endpoint)

---

## Conventions & Patterns

### Adding a New Page
1. Create `src/app/<route>/page.tsx`
2. Call `useAIContext('PageName')` at the top of the component
3. Wrap with `<ModuleGuard moduleId="your-module">` if it belongs to a toggleable module
4. Add route to `AppShell.tsx > APP_ROUTES` for prefetching

### Adding a New Module
1. Create `src/modules/<name>/` with `index.ts`, `api/`, `store/`, `types/`
2. Register in `src/modules/registry.ts` — add `MODULE_ID`, `MODULE_NAME`, `SIDEBAR_ITEMS`
3. Create backend module: `backend/src/modules/<name>/` with `index.ts`, `routes/`, `schema.sql`
4. Register backend routes in `backend/src/index.ts` with `registerModule(app)`

### API Client pattern
All frontend API calls go through `apiFetch()` in `src/lib/api-base.ts`, which:
- Reads the JWT from memory/localStorage
- Adds `Authorization: Bearer <token>` header
- Parses JSON response
- Throws on non-2xx responses

Domain-specific API clients (e.g., `clientsAPI`, `documentsAPI`) wrap `apiFetch()` and are co-located in their module's `api/` folder.

### File naming
- Next.js pages: `page.tsx`, `loading.tsx` (no suffix)
- Components: PascalCase `.tsx`
- Stores: kebab-case `-store.ts`
- API clients: kebab-case `documents.ts`
- Types: `documents.ts`, `letters.ts`, etc.

### Currency
Default currency is **ZMW (Zambian Kwacha, K)**. The active currency is stored in `pdfSettingsStore.settings.currency`. Use `formatCurrency(amount)` from `src/lib/utils.ts` — it reads the active currency automatically from the PDF settings store.

### Tax
Zambia-specific: **VAT 16%** or **TOT 4%** (Turnover Tax) or **none**. Set per-document. Applied to the subtotal.

---

*Last updated: March 2026 — README auto-generated from live codebase analysis.*
