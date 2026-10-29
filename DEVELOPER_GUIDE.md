# 🩺 Smart Healthcare Assistant — Complete Developer & Architecture Guide

Welcome to the **Smart Healthcare Assistant** codebase! This documentation is designed to onboard any software engineer, technical lead, or contributor to the project quickly. It details every technology, external service, architectural pattern, security measure, and operational workflow implemented across the platform.

---

## 📑 Table of Contents
1. [System Architecture & Overview](#1-system-architecture--overview)
2. [Technology Stack Matrix](#2-technology-stack-matrix)
3. [External APIs & Third-Party Services](#3-external-apis--third-party-services)
4. [Core Architectural Pipelines & Workflows](#4-core-architectural-pipelines--workflows)
   - [A. Conversational Intake & RAG Pipeline](#a-conversational-intake--rag-pipeline)
   - [B. Pre-Execution Crisis & Safety Guardrails](#b-pre-execution-crisis--safety-guardrails)
   - [C. Appointment Booking & Google Meet Integration](#c-appointment-booking--google-meet-integration)
   - [D. Dual Email Notification Engine](#d-dual-email-notification-engine)
   - [E. Clinician Portal & RLS Synchronization](#e-clinician-portal--rls-synchronization)
5. [Clinical Data Security & Privacy (HIPAA-Conscious)](#5-clinical-data-security--privacy-hipaa-conscious)
6. [Directory Structure & Code Anatomy](#6-directory-structure--code-anatomy)
7. [Environment Variables Reference](#7-environment-variables-reference)
8. [Local Development & Onboarding Walkthrough](#8-local-development--onboarding-walkthrough)
9. [Testing & Quality Assurance](#9-testing--quality-assurance)
10. [Developer Recipes & How-To Guides](#10-developer-recipes--how-to-guides)

---

## 1. System Architecture & Overview

Smart Healthcare Assistant is a full-stack, enterprise-grade digital healthcare platform combining conversational artificial intelligence, clinical triage guidance, and automated clinic scheduling.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  [ Patient Portal ]           [ Clinician Portal ]            [ Admin Dashboard ] |
|  - Real-time Chat             - Schedule Management           - Doctor Roster     |
|  - Voice Input (Web Speech)   - 1-Click Accept/Complete       - Crisis Logs Audit |
|  - Timezone-Aware Booking     - Direct Google Meet Launch     - Global Analytics  |
|  - Wellness Widgets (4-7-8)   - Clinical Notes Decryption                         |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / REST / Server Actions
                                          v
+-----------------------------------------------------------------------------------+
|                           NEXT.JS 14 SERVER RUNTIME                               |
|                                                                                   |
|  +---------------------------+  +--------------------------+  +----------------+  |
|  | Sliding-Window Rate Limit |  | Pre-Execution Safety     |  | AES-256-GCM    |  |
|  | (lib/ratelimit.ts)        |  | (lib/safety.ts - 988/911)|  | Encryption     |  |
|  +---------------------------+  +--------------------------+  +----------------+  |
|                                                                                   |
|  +---------------------------+  +--------------------------+  +----------------+  |
|  | Gemini 1.5 Flash Engine   |  | pgvector Semantic Search |  | Google Meet    |  |
|  | (lib/gemini.ts)           |  | (lib/vectorStore.ts)     |  | OAuth2 Client  |  |
|  +---------------------------+  +--------------------------+  +----------------+  |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +-----------------+
|  Google Gemini   |             |  Supabase Cloud  |             | External APIs   |
|  - Flash 1.5     |             |  - PostgreSQL 15 |             | - Google Cal/Meet
|  - Embeddings    |             |  - pgvector      |             | - Resend Email  |
|    (768 dims)    |             |  - Auth & RLS    |             | - Sentry & Cron |
+------------------+             +------------------+             +-----------------+
```

---

## 2. Technology Stack Matrix

| Category | Technology / Library | Version | Purpose in Codebase |
| :--- | :--- | :--- | :--- |
| **Language** | **TypeScript** | `^5.4.5` | End-to-end static typing across UI components, API handlers, database entities, and test suites. |
| **Runtime** | **Node.js** | `>=20.x` | Server execution environment. (Configured with `ws` polyfill for Node 20 WebSocket compatibility with Supabase Realtime). |
| **Framework** | **Next.js (App Router)** | `14.2.24` | Hybrid React Server Components (RSC), Client Components, Route Handlers (`app/api/`), dynamic routing, and Edge middleware. |
| **UI Library** | **React** | `^18.3.1` | Declarative component UI, hooks (`useState`, `useEffect`, `useCallback`, `useRef`), and streaming responses. |
| **Styling** | **Tailwind CSS** | `^3.4.3` | Utility-first styling, responsive healthcare grids, accessible color contrast, and custom CSS animations. |
| **Theming** | **next-themes** | `^0.3.0` | Accessible dark/light mode toggle with zero hydration mismatch and localStorage persistence. |
| **Icons** | **lucide-react** | `^0.378.0` | Lightweight SVG icons representing clinical specialties, calendars, audio inputs, and call statuses. |
| **Form Management** | **React Hook Form** | `^7.51.3` | High-performance uncontrolled form handling with state subscription optimization. |
| **Validation** | **Zod** | `^3.23.8` | Schema declarations for environment variables (`lib/env.ts`), API request bodies, and auth inputs (`lib/validations/`). |
| **Database & Vector** | **PostgreSQL + pgvector** | `15+` | Relational tables, foreign keys, triggers, Row Level Security, and HNSW cosine vector index for RAG. |
| **Client DB SDK** | **@supabase/supabase-js** | `^2.43.1` | Database query builder, realtime subscriptions, and admin service-role client. |
| **Server SSR Auth** | **@supabase/ssr** | `^0.3.0` | Cookie-based Supabase session interchange across Next.js Server Components, middleware, and Route Handlers. |
| **AI / LLM** | **@google/generative-ai** | `^0.11.1` | Official Google Gemini SDK for text inference (`gemini-1.5-flash`) and vector embeddings (`text-embedding-004`). |
| **Calendar API** | **googleapis** | `^137.0.0` | Google Calendar API v3 client managing 3-legged OAuth tokens, slot scheduling, and Google Meet room creation. |
| **Email Service** | **resend** | `^3.2.0` | Transactional email delivery engine dispatching patient & clinician booking confirmations and reminders. |
| **Date & Timezone** | **date-fns & date-fns-tz** | `^3.6.0` | Timezone-aware slot calculations converting between doctor clinic hours and patient local timezones. |
| **Toasts** | **sonner** | `^1.4.41` | Modern toast notifications for booking confirmations, error alerts, and copy actions. |
| **Bot Protection** | **@marsidev/react-turnstile**| `^0.7.0` | Cloudflare Turnstile integration defending public authentication endpoints against malicious automated scripts. |
| **Observability** | **@sentry/nextjs** | `^7.x` | Full-stack exception tracking, latency monitoring, and client-side error boundaries. |
| **Testing** | **Vitest** | `^1.6.0` | Blazing-fast unit and integration testing with native ESM and TypeScript support. |
| **E2E Testing** | **Playwright** | `^1.43.1` | Headless browser automation testing end-to-end patient onboarding and appointment booking journeys. |

---

## 3. External APIs & Third-Party Services

Every external service integrated into the project has a distinct responsibility and built-in fallback resilience:

### 1. Google Gemini API (`@google/generative-ai`)
- **Primary Model:** `gemini-1.5-flash`
- **Fallback Models:** `gemini-1.5-pro`
- **Embedding Model:** `text-embedding-004` (768-dimensional vector outputs)
- **What It Does:**
  - Synthesizes user symptoms into natural, conversational, doctor-bedside intake responses.
  - Generates dense vector embeddings for medical documents and patient search queries.
  - Extracts structured clinical parameters (symptom entities, duration, severity, emotional state).
- **Failure Resilience:**
  - If rate limits (HTTP 429) or quota errors occur, the system automatically engages `lib/nlpFallback.ts`, an offline rule-based NLP parser that extracts symptoms using regex heuristics without crashing the app.

### 2. Supabase Cloud (PostgreSQL + pgvector + Auth)
- **What It Does:**
  - **Relational Tables:** Manages `profiles`, `doctors`, `appointments`, `mood_logs`, `conversations`, and `crisis_logs`.
  - **pgvector Vector Database:** Stores embedded clinical guidelines from MedlinePlus, CDC, and WHO. Uses `match_health_documents` RPC with cosine similarity.
  - **Authentication:** Handles email/password authentication, Google OAuth sign-in, password reset tokens, and cookie session validation.
  - **Row Level Security (RLS):** Strict database-level isolation so patients only view their appointments and doctors view their assigned clinic queues.

### 3. Google Calendar & Google Meet (Google Cloud OAuth 2.0)
- **API:** Google Calendar API v3 (`calendar.events.insert`)
- **What It Does:**
  - Automates virtual room creation for telehealth consultations.
  - When an appointment is scheduled with `conferenceDataVersion: 1` and `conferenceSolutionKey: { type: "hangoutsMeet" }`, Google registers the call and returns an authentic Google Meet URL (`https://meet.google.com/xxx-yyyy-zzz`).
  - Directly launches in the doctor's and patient's browser without third-party iframe overlays.
- **Why OAuth 2.0 Instead of Service Accounts:**
  - Standard Google Cloud Service Accounts (`@iam.gserviceaccount.com`) cannot create Google Meet rooms without a paid Google Workspace domain license (they throw `400 Invalid conference type value`).
  - By using 3-legged user OAuth (`GOOGLE_CALENDAR_CLIENT_ID` + `GOOGLE_CALENDAR_CLIENT_SECRET` + `GOOGLE_REFRESH_TOKEN`), any Google user account automatically generates verified Google Meet links.

### 4. Resend (`resend`)
- **What It Does:**
  - Dispatches immediate transactional dual confirmation emails upon booking:
    - **To Patient:** Consultation summary, physician information, preparation instructions, and Google Meet link (if virtual) or clinic room number (if in-person).
    - **To Doctor:** Patient notification, clinical intake symptoms, and meeting link.
  - Dispatches scheduled 24-hour reminder emails via Vercel Cron.
- **Failure Resilience:**
  - If `RESEND_API_KEY` is omitted or in mock mode, `lib/resend.ts` logs the email payload safely to stdout without blocking appointment persistence.

### 5. Cloudflare Turnstile (`@marsidev/react-turnstile`)
- **What It Does:**
  - Non-intrusive CAPTCHA challenge on `/login` and `/signup`.
  - Protects database write operations against credential stuffing and registration spam.

### 6. Upstash Redis (Optional Rate Limiting)
- **What It Does:**
  - Centralized sliding-window rate limiting for distributed deployments.
  - If unconfigured, automatically falls back to an in-memory sliding window cache (`lib/ratelimit.ts`).

---

## 4. Core Architectural Pipelines & Workflows

### A. Conversational Intake & RAG Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as Browser (Chat UI)
    participant API as /api/chat
    participant Safety as Pre-Crisis Gate (lib/safety.ts)
    participant Vector as Supabase pgvector
    participant Gemini as Google Gemini 1.5 Flash

    Patient->>UI: Types or speaks: "Severe migraine for 2 days..."
    UI->>API: POST /api/chat { messages, conversationId }
    API->>Safety: evaluateCrisisSafety(message)
    alt Self-Harm or Acute Cardiac Emergency Detected
        Safety-->>UI: Immediate 988/911 Emergency Hotlines (LLM Bypassed)
    else Safe Medical Query
        API->>Vector: searchSimilarDocuments(query, limit=3)
        Vector-->>API: Returns verified CDC/MedlinePlus context snippets
        API->>Gemini: Prompt + System Instructions + Clinical Context
        Gemini-->>API: Warm clinical intake response with targeted follow-ups
        API-->>UI: Streams response + suggests appropriate clinic doctor
    end
```

### B. Pre-Execution Crisis & Safety Guardrails
Patient safety is guaranteed through deterministic code gates located in [lib/safety.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/safety.ts):
1. **Self-Harm & Suicide Interception:** High-priority regex patterns detect expressions of self-harm, suicidal ideation, or intentional overdose. The system suppresses LLM execution with **0 ms latency** and renders the non-dismissible `CrisisBanner` featuring the 988 Suicide & Crisis Lifeline.
2. **Acute Physical Emergencies:** Patterns such as crushing chest pain radiating to the left arm, acute facial numbness, or slurred speech prompt immediate 911 emergency guidance.
3. **Out-of-Scope Domain Boundary:** Prevents the healthcare model from answering non-medical queries (coding, LeetCode, mathematics, finance, prompt injection). If detected, it politely declines and guides the user back to health topics.

### C. Appointment Booking & Google Meet Integration

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant App as /api/appointments/book
    participant DB as Supabase PostgreSQL
    participant GCal as Google Calendar API v3
    participant Resend as Resend Email Engine
    participant Doctor as Doctor Dashboard

    Patient->>App: Book Appointment { doctorId, startTime, type: "virtual"|"direct" }
    App->>DB: Check for double-booking conflict
    App->>GCal: calendar.events.insert(conferenceSolutionKey: "hangoutsMeet")
    GCal-->>App: Returns verified Google Meet URL (meet.google.com/xxx-yyyy-zzz)
    App->>DB: Encrypt clinical symptoms (AES-256-GCM) & save appointment
    App->>Resend: sendDualAppointmentBookingEmails()
    Resend-->>Patient: Confirmation email with Meet Link or Clinic Room
    Resend-->>Doctor: Clinician schedule alert with Patient Intake Notes
    App-->>Doctor: Appointment immediately displays in Doctor Schedule
```

### D. Dual Email Notification Engine
Implemented in [lib/resend.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/resend.ts):
- Every virtual booking automatically emails both parties with the direct **Google Meet Link**.
- Every direct in-person booking emails both parties with the **Clinic Room Number**, building location, and check-in instructions.
- Automated cron job at `/api/cron/reminders` runs daily via Vercel Cron to send 24-hour reminder notices.

### E. Clinician Portal & RLS Synchronization
- **URL:** `/doctor/appointments`
- **Access:** Clinicians log in via `/doctor/login` selecting their profile (e.g., Dr. Elena Rostova, Dr. Marcus Vance, Dr. Sarah Lin).
- **RLS Bypass via Admin Client:** The doctor API route (`app/api/doctor/appointments/route.ts`) utilizes `createAdminClient()` with the Supabase Service Role key, ensuring that bookings made by any registered patient immediately sync to the doctor's queue without permission blockers.
- **Direct Meet Launch:** Clinicians click **"Join Google Meet"** to open the live room directly in a new tab (`target="_blank"`).

---

## 5. Clinical Data Security & Privacy (HIPAA-Conscious)

### 1. AES-256-GCM Encrypted Notes at Rest
Implemented in [lib/encryption.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/encryption.ts):
- Sensitive patient intake symptoms and medical notes are never stored as plain text in the database.
- Data is encrypted using **AES-256-GCM** with a unique 96-bit Initialization Vector (IV) and 128-bit authentication tag per entry.
- Database format: `enc:<base64-iv>.<base64-tag>.<base64-ciphertext>`.
- The encryption key is derived using a SHA-256 hash of `CLINICAL_ENCRYPTION_KEY`.
- Notes are decrypted strictly in memory upon retrieval by authorized doctors or patients.

### 2. Prompt Injection & XSS Defense
Implemented in [lib/sanitizer.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/sanitizer.ts):
- Strips control characters, script tags, and markdown escape injection attempts.
- Enforces structural framing so user inputs cannot override clinical system instructions.

---

## 6. Directory Structure & Code Anatomy

```text
HEALTHCARE ASSISTANCE/
├── app/                                 # Next.js 14 App Router
│   ├── (admin)/                         # Protected Admin dashboard routes
│   │   └── admin/
│   │       ├── appointments/page.tsx    # System-wide appointment oversight
│   │       ├── crisis-logs/page.tsx     # Crisis safety audit review log
│   │       └── doctors/page.tsx         # Doctor roster management
│   ├── (auth)/                          # Authentication pages
│   │   ├── login/page.tsx               # Patient login form with Turnstile
│   │   ├── signup/page.tsx              # Patient registration with password strength meter
│   │   ├── forgot-password/page.tsx     # Password recovery workflow
│   │   └── reset-password/page.tsx      # Password update screen
│   ├── (dashboard)/                     # Protected Patient pages
│   │   ├── appointments/page.tsx        # Patient schedule & Google Meet launch
│   │   └── settings/page.tsx            # Patient account settings & GDPR deletion
│   ├── api/                             # Backend API Route Handlers
│   │   ├── appointments/
│   │   │   ├── availability/route.ts    # Slot discovery endpoint
│   │   │   ├── book/route.ts            # Atomic booking, GCal sync & email dispatch
│   │   │   ├── cancel/route.ts          # Cancellation endpoint
│   │   │   └── reschedule/route.ts      # Rescheduling endpoint
│   │   ├── auth/
│   │   │   └── google/                  # Google OAuth authorization & callback
│   │   │       ├── route.ts             # Starts Google OAuth consent flow
│   │   │       └── callback/route.ts    # Captures refresh_token & persists to .env
│   │   ├── chat/route.ts                # Gemini streaming, RAG & pre-crisis gate
│   │   ├── cron/reminders/route.ts      # 24h appointment reminder cron job
│   │   ├── doctor/appointments/route.ts # Doctor queue API with note decryption
│   │   ├── extract/route.ts             # Symptom & emotional intent extractor
│   │   ├── feedback/route.ts            # Message helpfulness feedback
│   │   └── health/route.ts              # Uptime and connectivity health probe
│   ├── doctor/                          # Dedicated Clinician Portal
│   │   ├── appointments/page.tsx        # Doctor appointment management & Meet launcher
│   │   └── login/page.tsx               # Clinician authentication portal
│   ├── layout.tsx                       # Root layout & providers
│   ├── middleware.ts                    # Edge session protection & route routing
│   └── page.tsx                         # Landing page & interactive chat interface
├── components/                          # Modular React Components
│   ├── appointment/                     # BookingModal, SlotPicker, RescheduleModal
│   ├── auth/                            # GoogleAuthButton, BotProtection (Turnstile)
│   ├── chat/                            # ChatContainer, MessageBubble, VoiceInputButton
│   ├── ui/                              # DisclaimerBanner, FormField, ThemeToggle
│   └── wellness/                        # BreathingExercise (4-7-8), GroundingWidget (5-4-3-2-1)
├── lib/                                 # Shared Server & Client Utilities
│   ├── auth/requireRole.ts              # RBAC server verification guard
│   ├── doctors.ts                       # Clinic physician directory & profiles
│   ├── encryption.ts                    # AES-256-GCM clinical notes encryption
│   ├── env.ts                           # Zod environment variable parsing & validation
│   ├── gemini.ts                        # Google Gemini SDK & healthcare prompts
│   ├── googleCalendar.ts                # Google Calendar API & Google Meet room generator
│   ├── nlpFallback.ts                   # Local offline regex NLP engine
│   ├── ratelimit.ts                     # Sliding-window rate limiter
│   ├── resend.ts                        # Resend transactional email service
│   ├── safety.ts                        # 988/911 pre-execution crisis interceptor
│   ├── sanitizer.ts                     # Input sanitization & anti-prompt injection
│   ├── supabase/                        # Browser client, server client, admin client
│   └── vectorStore.ts                   # Supabase pgvector semantic search
├── scripts/                             # Utility & Database Maintenance Scripts
│   ├── google_oauth.ts                  # CLI Google Calendar OAuth token generator
│   ├── ingest_health_docs.ts            # Chunks & embeds medical FAQs into pgvector
│   ├── promote_admin.ts                 # CLI tool to promote user to administrator
│   ├── seed_test_db.ts                  # Seeds initial doctors & schedules
│   └── smoke_test.ts                    # Automated end-to-end API smoke test
├── supabase/migrations/                 # Production PostgreSQL migrations
└── tests/                               # Vitest automated test suites (69 tests)
```

---

## 7. Environment Variables Reference

All environment variables are validated at runtime via **Zod** in [lib/env.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/env.ts). Populate these in `.env.local`:

```ini
# --- Core Environment ---
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3001

# --- Google Gemini AI API ---
# Obtain from: https://aistudio.google.com/
GEMINI_API_KEY=AIzaSy...

# --- Supabase Database & Auth ---
# Obtain from: Supabase Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# --- Google Calendar & Google Meet (OAuth2) ---
# Obtain from: Google Cloud Console -> APIs & Services -> Credentials
GOOGLE_CALENDAR_CLIENT_ID=523129607801-...apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
# Populated automatically when authorizing via /api/auth/google
GOOGLE_REFRESH_TOKEN=1//0g...

# --- Google Cloud Service Account (Fallback Slot Queries) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=healthcare-clinic-service@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- Resend Email Service ---
# Obtain from: https://resend.com/
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
EMAIL_FROM=onboarding@resend.dev

# --- Security & Clinical Encryption ---
# 32-character encryption key for AES-256-GCM clinical data encryption
CLINICAL_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
CRON_SECRET=default_cron_secret_32_characters_long

# --- Cloudflare Turnstile Bot Defense (Optional) ---
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAA...

# --- Sentry Observability (Optional) ---
NEXT_PUBLIC_SENTRY_DSN=https://...
SENTRY_AUTH_TOKEN=sntrys_...
```

---

## 8. Local Development & Onboarding Walkthrough

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env.local` and add your Supabase and Gemini keys:
```bash
cp .env.example .env.local
```

### Step 3: Run Database Migrations & Seeds
Execute the SQL files inside `supabase/migrations/` in your Supabase SQL Editor, then seed initial clinic data:
```bash
npx tsx scripts/seed_test_db.ts
```

### Step 4: Ingest Clinical Guidelines into Vector Store
Generate 768-dimension Gemini embeddings and insert curated medical knowledge into pgvector:
```bash
npx tsx scripts/ingest_health_docs.ts
```

### Step 5: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3001](http://localhost:3001) in your browser.

### Step 6: 1-Click Google Calendar & Meet Activation
1. Visit the Doctor Portal: `http://localhost:3001/doctor/appointments`.
2. Click the banner **"Connect Google Calendar"** (or open `http://localhost:3001/api/auth/google`).
3. Sign in with your Google account and grant Calendar permissions.
4. The system will automatically receive and persist `GOOGLE_REFRESH_TOKEN` to `.env.local`. All subsequent telehealth bookings will generate live Google Meet links.

---

## 9. Testing & Quality Assurance

The codebase includes an extensive suite of automated tests verifying safety guardrails, encryption, and API endpoints.

### Run Static Type Checking
```bash
npm run typecheck
```

### Run Vitest Automated Test Suite
```bash
npm test -- --run
```

#### Test Suite Breakdown (69 Tests):
- `tests/safety/crisis.test.ts`: Verifies that suicidal triggers, self-harm keywords, and acute cardiac emergencies bypass LLM generation and output 988/911 resources immediately.
- `tests/safety/domainGuardrails.test.ts`: Confirms strict refusal of coding, LeetCode, math, and system prompt leakage requests.
- `tests/unit/sanitizer.test.ts`: Tests defensive prompt injection filters and HTML entity sanitization.
- `tests/unit/gemini.test.ts`: Verifies temperature configuration, fallback model chaining, and safety threshold compliance.
- `tests/api/appointments.test.ts`: Tests double-booking conflict prevention, date boundary validation, and slot formatting.
- `tests/api/chat.test.ts`: Validates rate limiting, payload parsing, and conversational message formatting.
- `tests/db/rls.test.ts`: Verifies Row Level Security isolation between different patient accounts.
- `tests/validations/auth.test.ts`: Tests Zod password complexity rules and email format validation.
- `tests/rag/benchmark.test.ts`: Benchmarks top-3 medical context retrieval accuracy.

---

## 10. Developer Recipes & How-To Guides

### Recipe 1: How to Add a New Doctor
1. Open [lib/doctors.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/doctors.ts).
2. Append a new profile entry to `CLINIC_DOCTORS`:
   ```typescript
   {
     id: "44444444-4444-4444-4444-444444444444",
     name: "Dr. Alex Taylor, MD",
     specialty: "Dermatology & Skin Health",
     email: "alex.taylor@healthcare.local",
     clinicRoom: "Room 108 - Dermatology Suite",
     avatar_url: "https://images.unsplash.com/...",
     bio: "Board-certified dermatologist specializing in acute rashes, skin lesions, and preventative care.",
     calendar_id: "primary",
     clinicalCode: "DR-TAYLOR-108",
   }
   ```
3. Update `BASE_HEALTHCARE_SYSTEM_INSTRUCTION` in [lib/gemini.ts](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/lib/gemini.ts) so the AI assistant introduces the new specialist during symptom intake.

### Recipe 2: How to Add New Medical Knowledge to RAG
1. Add raw clinical FAQ or guideline documents to `data/health_docs/`.
2. Run the ingestion script:
   ```bash
   npx tsx scripts/ingest_health_docs.ts
   ```
3. The script will automatically chunk the text, call Google Gemini embeddings, and store them into `health_documents` in Supabase with vector indexing.

### Recipe 3: How to Test an In-Person vs Virtual Appointment
- **Virtual Telehealth:** Select "Virtual (Google Meet)" during booking. The backend will invoke Google Calendar API, generate a live `https://meet.google.com/xxx-yyyy-zzz` link, and display **"Join Google Meet"** on both patient and doctor schedules.
- **Direct In-Person:** Select "Direct In-Person". The backend assigns the doctor's assigned clinic room (e.g. *Room 102 - Internal Medicine Wing*) and includes physical arrival instructions in the confirmation email without generating a video link.

---

*Authored for the Smart Healthcare Assistant engineering team.*
