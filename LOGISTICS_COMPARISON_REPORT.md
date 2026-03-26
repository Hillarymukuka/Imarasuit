# Logistics App — Detailed Comparison Report

## Original vs. Current Implementation

**Original Stack:** Python/FastAPI + React/Vite + SQLAlchemy/SQLite  
**Current Stack:** Hono/Cloudflare Workers + React/Next.js + D1/SQLite  

---

## 1. COMPLETE FEATURE INVENTORY — Original App

### 1.1 Backend Endpoints (Original)

| # | Module | Method | Endpoint | Description |
|---|--------|--------|----------|-------------|
| 1 | Auth | POST | `/auth/login` | Stub auth (accepts any credentials) |
| 2 | Shipments | POST | `/shipments/` | Create shipment + QR generation + waybill generation + notification |
| 3 | Shipments | GET | `/shipments/` | List with skip/limit/status/search |
| 4 | Shipments | GET | `/shipments/{code}` | Get by tracking code |
| 5 | Shipments | GET | `/shipments/{code}/waybill?format=pdf\|png` | Generate & stream waybill (PDF or PNG) |
| 6 | Shipments | GET | `/shipments/{code}/receipt` | Generate delivery receipt PDF |
| 7 | Status | POST | `/shipments/{code}/status` | Update status + notification (email+WhatsApp) |
| 8 | Status | GET | `/shipments/{code}/history` | Get status history |
| 9 | Containers | POST | `/containers` | Create container |
| 10 | Containers | GET | `/containers` | List with status/search + stats per container |
| 11 | Containers | GET | `/containers/{code}` | Detail with shipments + history |
| 12 | Containers | PATCH | `/containers/{code}` | Update details |
| 13 | Containers | POST | `/containers/{code}/status` | Update status + cascade to shipments + batch notifications |
| 14 | Containers | POST | `/containers/{code}/shipments` | Add shipments by tracking codes |
| 15 | Containers | DELETE | `/containers/{code}/shipments` | Remove shipments |
| 16 | Containers | GET | `/containers/{code}/available-shipments` | Get unassigned shipments matching route |
| 17 | Containers | DELETE | `/containers/{code}` | Delete (unlinks shipments) |
| 18 | Motorcycle | POST | `/motorcycle/riders` | Create rider |
| 19 | Motorcycle | GET | `/motorcycle/riders` | List riders (active/available/search) |
| 20 | Motorcycle | GET | `/motorcycle/riders/{code}` | Get rider detail |
| 21 | Motorcycle | PATCH | `/motorcycle/riders/{code}` | Update rider |
| 22 | Motorcycle | DELETE | `/motorcycle/riders/{code}` | Delete rider |
| 23 | Motorcycle | GET | `/motorcycle/riders/available` | Get available riders |
| 24 | Motorcycle | POST | `/motorcycle/riders/{code}/location` | Update rider GPS location |
| 25 | Motorcycle | POST | `/motorcycle/deliveries` | Create delivery |
| 26 | Motorcycle | GET | `/motorcycle/deliveries` | List deliveries (status/rider/search) |
| 27 | Motorcycle | GET | `/motorcycle/deliveries/{code}` | Get delivery detail |
| 28 | Motorcycle | PATCH | `/motorcycle/deliveries/{code}` | Update delivery |
| 29 | Motorcycle | DELETE | `/motorcycle/deliveries/{code}` | Delete delivery |
| 30 | Motorcycle | POST | `/motorcycle/deliveries/{code}/assign` | Assign rider |
| 31 | Motorcycle | POST | `/motorcycle/deliveries/{code}/status` | Update status with validation |
| 32 | Motorcycle | POST | `/motorcycle/deliveries/{code}/location` | Add GPS location point |
| 33 | Motorcycle | GET | `/motorcycle/deliveries/{code}/locations` | Get location history |
| 34 | Motorcycle | GET | `/motorcycle/deliveries/{code}/track` | Live tracking (rider position + delivery) |
| 35 | Motorcycle | GET | `/motorcycle/stats/deliveries` | Delivery statistics |
| 36 | Motorcycle | GET | `/motorcycle/stats/riders` | Rider statistics |
| 37 | Motorcycle | GET | `/motorcycle/stats/summary` | Combined summary stats |
| 38 | Reports | GET | `/reports/shipments-csv` | Export shipments as CSV |
| 39 | Reports | GET | `/reports/summary` | Comprehensive analytics (by_status, financial, weight, delivery_rate, containers, top_routes, recent) |
| 40 | Settings | GET | `/settings` | Get company settings |
| 41 | Settings | POST | `/settings` | Update settings |
| 42 | Settings | POST | `/settings/test-email` | Test email sending |
| 43 | Settings | POST | `/settings/reset` | Reset to defaults |
| 44 | Settings | POST | `/settings/smtp` | Configure SMTP (admin) |
| 45 | Settings | POST | `/settings/twilio` | Configure Twilio (admin) |
| 46 | Backup | POST | `/backup/create` | Create DB backup |
| 47 | Backup | GET | `/backup/list` | List backups |
| 48 | Backup | POST | `/backup/restore` | Restore from backup |
| 49 | Backup | DELETE | `/backup/delete/{file}` | Delete backup |

### 1.2 Backend Services (Original)

| Service | File | Capabilities |
|---------|------|-------------|
| **QR Service** | `qr_service.py` | Generate QR code PNG from tracking code, save to file, return bytes |
| **Waybill Service** | `waybill_service.py` | Generate A4 PDF waybill (reportlab) with company header, QR embed, shipment details; Generate thermal PNG label (384px) with PIL |
| **Receipt Service** | `receipt_service.py` | Generate delivery receipt PDF with company header, shipment info, delivery confirmation (recipient name/ID/time/signature), acknowledgement section |
| **Notifications** | `notifications_service.py` | 5 status templates (registered/dispatched/in_transit/arrived/delivered); send_email via SMTP; send_whatsapp via Twilio; send_sms via Twilio |
| **Settings** | `settings_service.py` | JSON file persistence: company_name, company_address, company_phone, logo_path, tracking_prefix, smtp config, twilio config |
| **ID Generator** | `idgen.py` | Generate tracking codes: `{PREFIX}-{YEAR}-{12 random chars}` with configurable prefix |
| **Printer Connector** | `printer_connector.py` | Stub for ESC/POS thermal printing, WebUSB |
| **Export Helpers** | `export_helpers.py` | URL builders for QR/waybill/label files, ensure directories, list exports |
| **Paths** | `paths.py` | `now_iso()`, `get_app_data_dir()`, `get_exports_dir()` |

### 1.3 Frontend Pages (Original)

| Page | File | Key Features |
|------|------|-------------|
| **Dashboard** | `Dashboard.tsx` | 8 grid cards: New Shipment, Shipments, Batch Shipments, Motorcycle, Scan QR, Reports, Settings, Track |
| **New Shipment** | `NewShipmentPage.tsx` | Full form with Zambian cities dropdown, optional container assignment (filtered by route), success screen with Print PDF/PNG waybill buttons |
| **Shipments List** | `ShipmentsListPage.tsx` | Table with search/filter, detail modal (sender/receiver/route/container/package/timeline/history), status update modal with progression validation, delivery recipient details when delivered (name, ID/NRC, time, signature), delivery receipt download, print receipt |
| **Tracking** | `TrackingPage.tsx` | PUBLIC page (no auth), search by code or QR scan, auto-fill from URL, visual 5-step timeline, status history |
| **Containers** | `ContainersPage.tsx` | Container cards with stats, Create modal (Zambian cities), Detail modal (shipments table, remove, history), Status update (cascade + notification toggles), Add shipments modal (available registered shipments, select all) |
| **Motorcycle** | `MotorcyclePage.tsx` | 3 tabs: Deliveries, Riders, Live Tracking. Stats overview. Delivery cards with route visualization. New Delivery with map picker (OpenStreetMap/Nominatim geocoding, GPS, map click). Rider CRUD with toggle active/assign. Live tracking with 5s polling, Leaflet map with custom icons |
| **Reports** | `ReportsPage.tsx` | Key metrics cards, Financial overview, Status breakdown bars, Container stats, Recent activity, Top routes, CSV export with status filter |
| **Settings** | `SettingsPage.tsx` | Company name, address, phone, tracking prefix. Save button |
| **Scan QR** | `ScanQRPage.tsx` | Camera QR scanning, manual code entry, shipment details display, print waybill PDF/PNG, navigate to update status |
| **Login** | `LoginPage.tsx` | Two-panel login with welcome + form |

### 1.4 Frontend Utilities (Original)

| Utility | Features |
|---------|----------|
| `printHelpers.ts` | `printPdfWaybill` (opens new tab + window.print), `printPngLabel` (thermal), `downloadPdfWaybill`, `downloadPngLabel`, `openBlobPdf`, `downloadBlob` |
| `zambianCities.ts` | Array of 40 Zambian cities used throughout forms |
| `api.ts` | Full Axios client: authAPI, shipmentsAPI, settingsAPI, reportsAPI, backupAPI, containersAPI, motorcycleAPI |

---

## 2. WHAT'S ALREADY IMPLEMENTED — Current Module

### 2.1 Backend Endpoints (Current)

| # | Module | Method | Endpoint | Matches Original? |
|---|--------|--------|----------|-------------------|
| 1 | Shipments | POST | `/api/logistics/shipments` | ✅ (minus QR/waybill/notification) |
| 2 | Shipments | GET | `/api/logistics/shipments` | ✅ |
| 3 | Shipments | GET | `/api/logistics/shipments/:code` | ✅ |
| 4 | Shipments | GET | `/api/logistics/shipments/:code/history` | ✅ |
| 5 | Shipments | PATCH | `/api/logistics/shipments/:code/status` | ✅ (minus notification) |
| 6 | Shipments | DELETE | `/api/logistics/shipments/:code` | ✅ |
| 7 | Containers | POST | `/api/logistics/containers` | ✅ |
| 8 | Containers | GET | `/api/logistics/containers` | ✅ |
| 9 | Containers | GET | `/api/logistics/containers/:code` | ✅ |
| 10 | Containers | PATCH | `/api/logistics/containers/:code` | ✅ |
| 11 | Containers | POST | `/api/logistics/containers/:code/status` | ✅ (cascade supported, minus notifications) |
| 12 | Containers | POST | `/api/logistics/containers/:code/shipments` | ✅ |
| 13 | Containers | DELETE | `/api/logistics/containers/:code/shipments` | ✅ |
| 14 | Containers | DELETE | `/api/logistics/containers/:code` | ✅ |
| 15 | Riders | POST | `/api/logistics/riders` | ✅ |
| 16 | Riders | GET | `/api/logistics/riders` | ✅ |
| 17 | Riders | GET | `/api/logistics/riders/:code` | ✅ |
| 18 | Riders | PATCH | `/api/logistics/riders/:code` | ✅ |
| 19 | Riders | PATCH | `/api/logistics/riders/:code/location` | ✅ |
| 20 | Riders | DELETE | `/api/logistics/riders/:code` | ✅ |
| 21 | Deliveries | POST | `/api/logistics/deliveries` | ✅ |
| 22 | Deliveries | GET | `/api/logistics/deliveries` | ✅ |
| 23 | Deliveries | GET | `/api/logistics/deliveries/:code` | ✅ |
| 24 | Deliveries | POST | `/api/logistics/deliveries/:code/assign` | ✅ |
| 25 | Deliveries | PATCH | `/api/logistics/deliveries/:code/status` | ✅ |
| 26 | Deliveries | DELETE | `/api/logistics/deliveries/:code` | ✅ |
| 27 | Deliveries | POST | `/api/logistics/deliveries/:code/location` | ✅ |
| 28 | Deliveries | GET | `/api/logistics/deliveries/:code/locations` | ✅ |
| 29 | Stats | GET | `/api/logistics/stats` | ✅ (combined stats endpoint) |

### 2.2 Frontend Pages (Current)

| Page | Route | Matches Original? |
|------|-------|-------------------|
| Dashboard | `/logistics` | ✅ (stat cards + quick actions + delivery overview) |
| Shipments List | `/logistics/shipments` | ✅ (table with search/filter) |
| New Shipment | `/logistics/shipments/new` | ✅ (form - minus Zambian cities + container assignment) |
| Shipment Detail | `/logistics/shipments/[code]` | ✅ (info + status history + advance status) |
| Containers List | `/logistics/containers` | ✅ (card grid with search/filter) |
| New Container | `/logistics/containers/new` | ✅ (form - minus Zambian cities) |
| Container Detail | `/logistics/containers/[code]` | ✅ (info + shipments + history + cascade advance) |
| Riders List | `/logistics/riders` | ✅ (card grid with search) |
| New Rider | `/logistics/riders/new` | ✅ |
| Rider Detail | `/logistics/riders/[code]` | ✅ (info + recent deliveries + toggle active) |
| Deliveries List | `/logistics/deliveries` | ✅ (table with search/filter) |
| New Delivery | `/logistics/deliveries/new` | ✅ (form with rider assignment - minus map picker) |
| Delivery Detail | `/logistics/deliveries/[code]` | ✅ (info + history + location trail + assign rider modal) |

### 2.3 Data Layer (Current)

| Component | Status |
|-----------|--------|
| Database schema (all 8 tables) | ✅ Complete |
| Frontend TypeScript types | ✅ Complete |
| API client functions | ✅ Complete |
| Zustand stores (4 stores) | ✅ Complete |
| Multi-tenant (company_id) | ✅ Added (original was single-tenant) |

---

## 3. WHAT'S MISSING — Gap Analysis

### 3.1 Missing Backend Endpoints

| Priority | Endpoint | Description | Implementation Notes |
|----------|----------|-------------|---------------------|
| 🔴 HIGH | `GET /shipments/:code/waybill?format=pdf\|png` | Generate shipment waybill | CRITICAL — Original used reportlab (Python) for PDF and PIL for PNG. In Cloudflare Workers, use `@react-pdf/renderer` or `pdfkit` or a PDF API. For QR, use `qrcode` npm package. |
| 🔴 HIGH | `GET /shipments/:code/receipt` | Generate delivery receipt PDF | Needs recipient_name, recipient_id, delivery_time, signature_collected query params. Similar PDF gen challenge. |
| 🟡 MEDIUM | `GET /containers/:code/available-shipments` | Get unassigned shipments matching route | Returns shipments where `container_id IS NULL` and matching `origin`/`destination`. Used by "Add Shipments" modal to show available shipments. |
| 🟡 MEDIUM | `GET /reports/shipments-csv` | Export shipments as CSV | Generates CSV file with status filter. Straightforward string building. |
| 🟡 MEDIUM | `GET /reports/summary` | Comprehensive analytics | Returns: by_status counts, financial (total_amount, avg per shipment), weight totals, delivery_rate, container stats, top_routes (GROUP BY origin+destination), recent activity (today + 7d) |
| 🟡 MEDIUM | `GET /settings` + `POST /settings` | Company settings CRUD | Original persists to JSON file. In current architecture, use a `logistics_settings` table or shared company settings. |
| 🟡 MEDIUM | `POST /settings/test-email` | Test email configuration | Sends test email via SMTP |
| 🟡 MEDIUM | `POST /settings/smtp` | Configure SMTP settings | Admin-protected |
| 🟡 MEDIUM | `POST /settings/twilio` | Configure Twilio settings | Admin-protected |
| 🟡 MEDIUM | `POST /settings/reset` | Reset settings to defaults | |
| 🟢 LOW | `GET /motorcycle/riders/available` | Get available riders only | Currently handled via query param `?available=true` on the main list — functionally equivalent |
| 🟢 LOW | `GET /motorcycle/deliveries/:code/track` | Live tracking with rider location | Returns delivery + rider current position. Could be composed from existing detail endpoint |
| 🟢 LOW | `GET /motorcycle/stats/deliveries` | Delivery-specific stats | Currently combined in `/stats` — functionally equivalent |
| 🟢 LOW | `GET /motorcycle/stats/riders` | Rider-specific stats | Currently combined in `/stats` — functionally equivalent |
| 🟢 LOW | `PATCH /motorcycle/deliveries/:code` | Update delivery fields | Missing general update (only status/assign exist) |
| 🟢 LOW | All backup endpoints | DB backup/restore/list/delete | Less critical for cloud-hosted D1 |

### 3.2 Missing Backend Services

| Priority | Service | What It Does | Implementation Notes |
|----------|---------|-------------|---------------------|
| 🔴 HIGH | **QR Generation** | Generate QR code PNG from tracking code | Use `qrcode` npm. In Workers, may need `qrcode-svg` or `qrcode` with Buffer polyfill |
| 🔴 HIGH | **Waybill PDF Generation** | A4 PDF with company header, QR code, sender/receiver, package details | Original used reportlab. Options for Workers: `@react-pdf/renderer`, `pdf-lib`, `jspdf`, or external service |
| 🔴 HIGH | **Waybill PNG (Thermal Label)** | 384px wide PNG with QR for thermal printers | Original used PIL/Pillow. In Workers: Canvas API or external service |
| 🔴 HIGH | **Delivery Receipt PDF** | Receipt with company header, delivery confirmation, signature section | Same PDF generation challenge |
| 🟡 MEDIUM | **Email Notifications** | Send email on status changes via SMTP | Templates for: registered, dispatched, in_transit, arrived, delivered. Options: Mailgun, SendGrid, or Cloudflare Email Workers |
| 🟡 MEDIUM | **WhatsApp Notifications** | Send WhatsApp messages via Twilio | Same 5 status templates. call Twilio REST API |
| 🟡 MEDIUM | **SMS Notifications** | Send SMS via Twilio | |
| 🟡 MEDIUM | **Settings Persistence** | Store company config | Need `logistics_settings` table with: company_name, company_address, company_phone, logo_path, tracking_prefix, smtp_host/port/user/pass, twilio_account_sid/auth_token/from_number |
| 🟢 LOW | **Printer Connector** | Direct thermal printing (ESC/POS) | Was a stub in original too |

### 3.3 Missing Frontend Pages

| Priority | Page | Original Location | What It Does |
|----------|------|-------------------|-------------|
| 🔴 HIGH | **Public Tracking Page** | `TrackingPage.tsx` | NO AUTH required. Search by tracking code or QR scan. URL param auto-fill (`/track?code=XXX`). Visual 5-step status timeline. This is customer-facing. |
| 🔴 HIGH | **QR Scanner Page** | `ScanQRPage.tsx` | Camera access for QR scanning, manual code entry fallback, displays shipment details, print waybill PDF/PNG buttons, navigate to update status |
| 🟡 MEDIUM | **Reports Page** | `ReportsPage.tsx` | Key metrics cards, Financial overview, Status breakdown (visual percentage bars), Container statistics, Recent activity, Top routes, CSV export with status filter |
| 🟡 MEDIUM | **Settings Page** | `SettingsPage.tsx` | Company info form (name, address, phone, tracking prefix). Save button. In original also had SMTP/Twilio config sections (admin-only). |
| 🟢 LOW | **Batch Shipments** | Dashboard link only | Referenced in original dashboard but no dedicated page implementation found |

### 3.4 Missing Frontend Features (Per Page)

#### Shipments — New Shipment Page
| Feature | Status | Details |
|---------|--------|---------|
| Zambian cities dropdown for origin/destination | ❌ MISSING | Original had `zambianCities` array (40 cities) used as `<select>` dropdown. Current uses plain text input. |
| Container assignment during creation | ❌ MISSING | Original showed active containers filtered by matching route (origin/destination), letting user assign shipment at creation. Current `NewShipmentPage` has no container picker. |
| Post-creation success screen | ❌ MISSING | Original showed success screen with Print PDF Waybill + Print PNG Label buttons after creation. Current just redirects to list. |
| QR code generation on create | ❌ MISSING | Original auto-generated QR code on shipment creation (saved to file). |
| Waybill auto-generation on create | ❌ MISSING | Original auto-scheduled waybill generation (PDF+PNG) in background on create. |
| Notification on create | ❌ MISSING | Original sent email + WhatsApp notification on shipment registration. |

#### Shipments — List / Detail Page
| Feature | Status | Details |
|---------|--------|---------|
| Status update with custom note | ⚠️ PARTIAL | Current advances status automatically without note input. Original had a modal where user typed a note. |
| Status progression validation | ❌ MISSING | Original disabled already-completed statuses (can't go backwards). Current has basic `NEXT_STATUS` map but no backwards prevention enforcement. |
| Delivery recipient details on delivered | ❌ MISSING | Original prompted for recipient name, ID/NRC number, delivery time, signature checkbox when marking as "delivered". |
| Delivery receipt generation | ❌ MISSING | Original had "Download Receipt" button after marking delivered, and "Print Receipt" in history entries. |
| Print/Download waybill from detail | ❌ MISSING | Original had "Print PDF Waybill", "Print PNG Label", "Download PDF", "Download PNG" buttons on shipment detail. |

#### Containers Page
| Feature | Status | Details |
|---------|--------|---------|
| Zambian cities dropdown | ❌ MISSING | Plain text inputs instead of dropdowns |
| Add shipments modal | ❌ MISSING | Original had modal showing available registered shipments on matching route with "select all" checkbox. Current API supports `addShipments` but UI for it is missing on the container detail page. |
| Remove shipments UI | ❌ MISSING | Original had remove buttons per shipment in container detail. Current API supports `removeShipments` but no UI for it. |
| Container stats (weight/amount aggregates) | ❌ MISSING | Original showed total_weight, total_amount per container in list. Current only shows shipment count. |
| Send notifications toggle on status update | ❌ MISSING | Original had "Send WhatsApp" and "Send Email" checkboxes when updating container status. |
| Available shipments endpoint | ❌ MISSING | `GET /containers/:code/available-shipments` to get unassigned shipments matching the container's route |

#### Motorcycle Deliveries
| Feature | Status | Details |
|---------|--------|---------|
| Map-based location picker (create delivery) | ❌ MISSING | Original used OpenStreetMap + Nominatim geocoding, GPS geolocation, map click to select pickup/delivery locations. Current has text inputs only. |
| Interactive Leaflet map for live tracking | ❌ MISSING | Original had full Leaflet map with custom marker icons for rider/pickup/delivery, 5-second polling for live position updates. Current shows GPS coordinates as text. |
| Stats overview on deliveries tab | ❌ MISSING | Original showed stats grid (total/pending/in_transit/delivered/cancelled/revenue/today's stats) above deliveries list. |
| Combined single-page tab layout | ❓ DIFFERENT | Original had 3 tabs (Deliveries/Riders/Live Tracking) on one page. Current splits into separate routes — which is arguably better UX for the business suite. |
| Status validation on update | ⚠️ PARTIAL | Original validated against allowed status transitions. Current accepts any status. |

#### Dashboard
| Feature | Status | Details |
|---------|--------|---------|
| Additional dashboard cards | ❌ MISSING | Original had: Batch Shipments, Scan QR, Reports, Settings, Track Package cards. Current has 4 stat cards + quick actions. |

### 3.5 Missing Business Logic

| Category | Feature | Details |
|----------|---------|---------|
| **Tracking Code Prefix** | Configurable prefix from settings | Original reads `tracking_prefix` from settings (defaults to "SHP"). Current hardcodes "SHP" prefix. |
| **Container Status Cascade** | Container→Shipment status mapping | Original had: loading→(no change), dispatched→dispatched, in_transit→in_transit, arrived→arrived. **Current DOES implement this** (containers.ts line ~145). ✅ |
| **Container Shipment Validation** | Preventing add to arrived/delivered containers | Original prevented adding shipments to containers with status "arrived". Current doesn't check. |
| **Container Shipment Validation** | Preventing adding already-assigned shipments | Original checked if shipment was already in another container. Current SQL has `WHERE container_id IS NULL` which handles this correctly. ✅ |
| **Delivery Status Timestamps** | Automatic timestamp fields | Original set `picked_up_at` and `delivered_at` automatically. **Current DOES implement this** (motorcycle.ts). ✅ |
| **Rider Availability** | Auto-toggle on assign/deliver/cancel | Original marked rider busy on assign, available on deliver/cancel (with multi-delivery check). **Current DOES implement this**. ✅ |
| **Active Delivery Check on Rider Delete** | Prevents deleting rider with active jobs | **Current DOES implement this**. ✅ |
| **Shipment Status Notification** | Auto-notify on every status change | Original sent email + WhatsApp notifications asynchronously on every status change. Completely missing in current. |
| **Batch Container Notifications** | Notify all shipment owners on container status change | Original sent batch notifications to all shipment senders/receivers when container status changed. Missing. |
| **Delivery Receipt Flow** | Capture recipient ID/signature on delivery | Original captured recipient_name, recipient_id, delivery_time, signature_collected when marking as delivered. Current just changes status. |

### 3.6 Missing Data / Constants

| Item | Details |
|------|---------|
| `zambianCities` array | 40 Zambian cities: Lusaka, Kitwe, Ndola, Livingstone, Kabwe, Chipata, etc. Used for origin/destination dropdowns throughout the app. |
| `printHelpers` utility | Functions for printing/downloading PDF waybills, PNG labels from blob responses. |
| Settings data model | company_name, company_address, company_phone, logo_path, tracking_prefix, smtp_host, smtp_port, smtp_username, smtp_password, smtp_from_email, twilio_account_sid, twilio_auth_token, twilio_from_number |

---

## 4. IMPLEMENTATION PRIORITY MATRIX

### Phase 1 — Critical (Core functionality gaps)
1. **QR Code Generation Service** — Generate QR PNG from tracking code
2. **Waybill PDF Generation** — A4 PDF waybill with company header + QR
3. **Waybill PNG Label** — 384px thermal label
4. **Delivery Receipt PDF** — Receipt with confirmation section
5. **Waybill/Receipt Endpoints** — `GET /shipments/:code/waybill`, `GET /shipments/:code/receipt`
6. **Public Tracking Page** — Customer-facing tracking without auth
7. **QR Scanner Page** — Camera QR scanning + manual entry
8. **Post-creation success screen** — Print waybill after creating shipment
9. **Zambian Cities Constants** — Add cities array for form dropdowns

### Phase 2 — Important (Enhanced UX)
10. **Reports endpoint + page** — `GET /reports/summary`, analytics dashboard
11. **CSV export endpoint** — `GET /reports/shipments-csv`
12. **Settings endpoint + page** — Company settings CRUD + table
13. **Available shipments endpoint** — `GET /containers/:code/available-shipments`
14. **Add/Remove shipments UI** — UI on container detail page
15. **Status update with note** — Note input on status change
16. **Container assignment on shipment create** — Route-filtered container picker
17. **Delivery recipient details** — Capture name/ID/signature on deliver
18. **Map-based location picker** — OpenStreetMap/Nominatim for delivery creation

### Phase 3 — Advanced Features
19. **Email notifications** — SMTP integration with status templates
20. **WhatsApp notifications** — Twilio integration
21. **Live tracking map** — Leaflet map with real-time rider positions
22. **Stats per container** — Weight/amount aggregates
23. **Configurable tracking prefix** — From settings
24. **Status validation** — Prevent backwards status transitions

### Phase 4 — Nice to Have
25. **Backup/Restore** — Less critical with cloud D1
26. **Batch shipments** — Referenced but never implemented in original
27. **Printer connector** — ESC/POS stub
28. **SMS via Twilio** — In addition to WhatsApp

---

## 5. SUMMARY SCORECARD

| Category | Original Features | Implemented | Missing | Coverage |
|----------|:-:|:-:|:-:|:-:|
| Shipment CRUD endpoints | 6 | 6 | 0 | **100%** |
| Shipment PDF/QR endpoints | 2 | 0 | 2 | **0%** |
| Container endpoints | 9 | 7 | 2 | **78%** |
| Motorcycle endpoints | 20 | 16 | 4 | **80%** |
| Reports endpoints | 2 | 0 | 2 | **0%** |
| Settings endpoints | 5 | 0 | 5 | **0%** |
| Backup endpoints | 4 | 0 | 4 | **0%** |
| Auth endpoint | 1 | 0* | 1 | **0%*** |
| **Backend Total** | **49** | **29** | **20** | **59%** |
| | | | | |
| Frontend pages | 10 | 13† | 3 | **77%** |
| PDF/Print utilities | 4 | 0 | 4 | **0%** |
| Map/Geocoding features | 2 | 0 | 2 | **0%** |
| Notification services | 3 | 0 | 3 | **0%** |
| Settings management | 1 | 0 | 1 | **0%** |
| **Frontend features** | **~35** | **~21** | **~14** | **~60%** |

\* Auth is handled by the business suite's shared auth system  
† Current has more pages (separate routes for riders/deliveries vs. original's single tabbed page) but missing Tracking, QR Scanner, Reports, Settings pages

**Overall Assessment: ~60% feature parity.** Core CRUD operations are solid. The main gaps are in document generation (PDF/PNG), notifications (email/WhatsApp), analytics/reporting, and interactive map features.
