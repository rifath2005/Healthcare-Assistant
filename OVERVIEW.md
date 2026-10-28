# 🏥 Developer Architecture & System Overview
## Smart Healthcare Assistant using Conversational AI

> **Target Audience:** Software engineers, full-stack developers, AI/ML engineers, and technical maintainers.  
> **Repository:** [Smart Healthcare Assistant](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE)  
> **Companion Documents:** [requirements.md](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/requirements.md) | [tasks.md](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/tasks.md) | [README.md](file:///home/nabeel/Downloads/HEALTHCARE%20ASSISTANCE/README.md)

---

## 1. Executive Technical Summary & Philosophy

The **Smart Healthcare Assistant** is an enterprise-grade, privacy-first conversational healthcare web application built entirely on modern, free-tier cloud infrastructure. It blends **Retrieval-Augmented Generation (RAG)**, structured clinical NLP, hands-free voice transcription, calendar appointment automation, and clinical crisis safety controls.

```mermaid
graph TD
    Client["Browser Client (Next.js 14/15 + Web Speech)"]
    Edge["Edge Network & Middleware (Vercel)"]
    API["Serverless Route Handlers (/api/chat, /api/extract)"]
    SafetyGate["Pre-Execution Safety Gate (lib/safety.ts)"]
    Gemini["Google Gemini API (1.5 Flash + text-embedding-004)"]
    Supabase["Supabase Cloud (PostgreSQL + pgvector + RLS)"]
    GoogleCal["Google Calendar API (Service Account v3)"]
    Resend["Resend API (Transactional Email + Cron)"]
    Sentry["Sentry Error Monitoring"]

    Client -->|HTTPS / SSE| Edge
    Edge --> API
    API --> SafetyGate
    SafetyGate -->|Normal Turn| Gemini
    SafetyGate -->|Crisis Detected| Supabase
    API -->|Vector Search & RLS| Supabase
    API -->|Central Calendar Sync| GoogleCal
    API -->|Email & Reminders| Resend
    API -->|Telemetry & Errors| Sentry
```

### Architectural Principles
1. **Safety-First Pre-Execution Gates:** No medical advice or clinical inquiry is processed by generative models before passing through deterministic clinical safety filters. If self-harm or suicidal ideation is recognized, LLM inference is immediately aborted and persistent crisis audit logs are written.
2. **Data Minimization & Multi-Tenant Isolation:** Zero persistent storage of guest health conversations unless explicitly opted into via registration. All database operations strictly enforce PostgreSQL Row-Level Security (RLS).
3. **Field-Level Encryption at Rest:** Clinical free-text entries (`mood_logs.notes` and `appointments.patient_notes`) are encrypted at the database column level using AES-256 / `pgcrypto`.
4. **Free-Tier Operational Resilience:** Built with zero-cost services (Vercel, Supabase, Google AI Studio, Google Cloud Service Account, Resend, Sentry), fortified with client debouncing, offline fallback entity parsers, and quota monitoring.

---

## 2. Technical Stack Deep-Dive

| Subsystem | Technology | Architectural Rationale & Role |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 14/15 (App Router, TypeScript)** | Provides React Server Components (RSC) for zero-client-bundle data fetching, Streaming UI via `Suspense`, and server actions. TypeScript enforces strict schema typing. |
| **Styling & Design System** | **Tailwind CSS + Lucide Icons** | Utility-first, responsive healthcare design system with dark/light theme switching via `next-themes` and accessible WCAG 2.1 AA color contrast tokens. |
| **Form State & Bot Defense** | **React Hook Form + Zod + Cloudflare Turnstile** | Schema validation unified across client and server (`lib/validations/auth.ts` and `lib/auth/validateServerInput.ts`). Cloudflare Turnstile and hidden honeypot fields eliminate spam. |
| **Speech Processing** | **Web Speech API** | Client-side, browser-native speech-to-text (`webkitSpeechRecognition` / `SpeechRecognition`) in `VoiceInputButton.tsx` eliminating third-party audio transcription API costs. |
| **Generative LLM & Embeddings** | **Google Gemini (`gemini-1.5-flash` & `text-embedding-004`)** | `gemini-1.5-flash` delivers sub-second streaming inference and JSON schema function calling. `text-embedding-004` generates dense 768-dimensional vector embeddings for RAG retrieval. |
| **Database & Vector Engine** | **Supabase (PostgreSQL 15 + `pgvector`)** | Relational data integrity, native vector similarity search (`HNSW` cosine index), Supabase Auth (JWTs, session tokens), and Row-Level Security (RLS). |
| **Column-Level Encryption** | **PostgreSQL `pgcrypto` / AES-256-GCM** | Ensures clinical notes are encrypted before storage and only decrypted for authorized owners or clinic administrators via `lib/encryption.ts`. |
| **Calendar & Video Engine** | **Google Calendar API v3 (Service Account)** | 2-legged server-to-server OAuth delegation (`GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`) enabling bookings directly on clinic physician calendars with Google Meet links. |
| **Transactional Email & Cron** | **Resend + Vercel Cron** | High-deliverability transactional emails for booking confirmations, cancellations, and daily automated 24-hour reminder cron jobs triggered via `app/api/cron/reminders/route.ts`. |
| **Error Observability & Probes** | **Sentry (`@sentry/nextjs`) + `/api/health`** | Full-stack exception tracking, performance latency monitoring, and external ping endpoints for uptime monitors. |
| **Containerization & CI/CD** | **Docker + GitHub Actions** | Multi-stage Node Alpine Dockerfile for local parity and standalone hosting; GitHub Actions runs automated ESLint, TypeScript checks, and Playwright tests. |

---

## 3. How the Subsystems Work

### 3.1 Subsystem A: The RAG Knowledge Retrieval Pipeline

The RAG engine ensures that the AI assistant provides evidence-backed health information rather than hallucinated responses.

```mermaid
sequenceDiagram
    autonumber
    actor User as Patient Browser
    participant API as /api/chat
    participant Embed as Gemini text-embedding-004
    participant DB as Supabase pgvector
    participant LLM as Gemini 1.5 Flash

    User->>API: POST /api/chat { message: "How to manage tension headaches?" }
    API->>Embed: Embed query string
    Embed-->>API: 768-dim float vector
    API->>DB: RPC match_health_documents(embedding, threshold=0.75, count=3)
    DB-->>API: Top 3 medical passages + source URLs
    API->>LLM: Stream prompt [System Persona + Context Passages + User Query]
    LLM-->>API: SSE Stream chunk tokens
    API-->>User: Server-Sent Events (SSE) stream with source citation pills
```

1. **Ingestion (`scripts/ingest_health_docs.ts`):** Curated public health documents (CDC, MedlinePlus, WHO) in `data/health_docs/` are split into 500-token chunks with 50-token overlap, embedded with `text-embedding-004`, and stored in `health_documents`.
2. **Query Execution (`lib/vectorStore.ts`):** User queries are embedded in real time and compared against the `health_documents` vector index using cosine similarity:
   $$\text{similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$
3. **Synthesis & Citation:** Passages scoring $\ge 0.75$ are injected into the Gemini system prompt under strict grounding instructions: *"Use only the provided context. Cite sources using [1], [2] tags."*
4. **Rendering:** `MessageBubble.tsx` parses citation tags into interactive pills that open modal reference excerpts.

---

### 3.2 Subsystem B: Pre-Execution Safety & Crisis Interception

Handling mental wellness and potential self-harm inquiries requires immediate, deterministic intervention.

```mermaid
flowchart TD
    Inbound["User Chat Message Inbound"] --> PreFilter{"lib/safety.ts Pre-Check"}
    PreFilter -- "Self-Harm / Suicide Detected" --> Halt["1. Abort LLM Invocation Immediately"]
    Halt --> Persist["2. Log Incident to crisis_logs Table"]
    Persist --> Stream["3. Stream CRISIS_TRIGGERED Payload"]
    Stream --> UI["4. Client Renders Unclosable CrisisBanner (988 / 741741)"]
    
    PreFilter -- "Safe Query" --> ToneCheck{"Sentiment & Mood Analyzer"}
    ToneCheck -- "Elevated Anxiety/Stress" --> Empathetic["Inject Active Listening Prompt Guidelines"]
    ToneCheck -- "Neutral/Informational" --> Standard["Standard RAG Pipeline"]
    Empathetic --> Gen["Generate Empathetic Response + Micro-Tools"]
    Standard --> Gen
```

* **Deterministic Interception:** In `app/api/chat/route.ts`, before sending messages to Gemini, `lib/safety.ts` evaluates inputs against high-priority safety heuristics.
* **Immediate Response:** When a safety trigger is encountered, LLM generation is completely bypassed. A structured `CRISIS_TRIGGERED` event streams to the client, activating the high-contrast `CrisisBanner.tsx` with one-tap dials for:
  * **988 Suicide & Crisis Lifeline** (Call/Text 988)
  * **Crisis Text Line** (Text HOME to 741741)
  * **Local Emergency Services** (911 / 112)
* **Clinical Audit Trail:** The event is asynchronously committed to `crisis_logs` with the trigger text and severity for review on the `/admin/crisis-logs` dashboard.

---

### 3.3 Subsystem C: Symptom, Intent & Mood Extraction with Offline Fallback

The assistant converts conversational text into actionable clinical entities via `app/api/extract/route.ts`.

* **Online Mode (Gemini Function Calling / JSON Schema):**
  Extracts structured data conforming to the TypeScript schema:
  ```typescript
  interface ExtractionPayload {
    intent: 'symptom_inquiry' | 'appointment_booking' | 'mental_health_support' | 'general_faq';
    symptoms: Array<{ name: string; duration: string; severity: 'mild' | 'moderate' | 'severe' }>;
    mood: 'anxious' | 'depressed' | 'stressed' | 'overwhelmed' | 'calm' | 'neutral';
    intensity: number; // 1 to 5
    urgency: 'low' | 'medium' | 'emergency';
  }
  ```
* **Offline Fallback (`lib/nlpFallback.ts`):**
  If Gemini returns HTTP 429 (rate-limit) or network connection drops, the system falls back to a deterministic regex and keyword dictionary parser that extracts basic symptom entities and detects critical urgency terms without service interruption.

---

### 3.4 Subsystem D: Appointment Booking, Calendar Sync & 24h Reminders

Unlike standard consumer apps that require 3-legged user OAuth delegation, clinic appointments are booked on centralized doctor calendars via **Google Cloud Service Account delegation**.

```mermaid
sequenceDiagram
    autonumber
    actor Patient as User
    participant App as Next.js API (/api/appointments/book)
    participant DB as Supabase (appointments table)
    participant Cal as Google Calendar API (Service Account)
    participant Mail as Resend Transactional Email

    Patient->>App: Book Slot (doctor_id, start_time, patient_notes)
    App->>Cal: Check Free/Busy Availability for doctor's calendar_id
    Cal-->>App: Confirmed Slot Available
    App->>Cal: Create Calendar Event + Google Meet Link
    Cal-->>App: Event Created (event_id, meet_link)
    App->>DB: Encrypt patient_notes -> Insert into appointments table
    App->>Mail: Send AppointmentConfirmation.tsx with .ics invite
    Mail-->>Patient: Email Delivered to Inbox
    App-->>Patient: 200 OK { booking_id, meet_link }
```

* **Doctors Directory (`doctors` table):** Contains doctor names, specialties, weekly availability JSON, and individual Google Calendar IDs.
* **Timezone Normalization (`lib/timezone.ts`):** Converts the patient's local timezone (e.g. `America/New_York`) to UTC for database storage and Google Calendar scheduling.
* **Automated 24h Reminders:** Vercel Cron triggers `/api/cron/reminders/route.ts` daily, checking:
  $$\text{start\_time} \in [\text{NOW}() + 23\text{h}, \text{NOW}() + 25\text{h}] \quad \text{AND} \quad \text{status} = \text{'confirmed'}$$
  and dispatches reminder emails via Resend.

---

### 3.5 Subsystem E: Auth, Guest Migration & Role-Based Access Control (RBAC)

* **Dual-Layer Validation:**
  * Client: `react-hook-form` paired with `zodResolver(signupSchema)` gives instantaneous `onBlur` visual feedback and password strength metering.
  * Server: `lib/auth/validateServerInput.ts` re-validates incoming JSON payloads to prevent API bypass attacks.
* **Bot Mitigation:** Cloudflare Turnstile token validation and invisible honeypot fields reject automated signups.
* **Guest-to-Authenticated Session Migration (`lib/supabase/syncGuestSession.ts`):**
  When an anonymous user registers mid-chat, their temporary in-memory message history is automatically committed to Supabase under their new `user_id`, preserving conversation continuity.
* **RBAC & Route Protection:**
  Users have `profiles.role` (`'user'` or `'admin'`). `lib/auth/requireRole.ts` and `middleware.ts` intercept requests to `/admin/*`, redirecting unauthorized users to `/chat` with a 403 status. Admins are created exclusively through the CLI (`scripts/promote_admin.ts`), eliminating public administrative registration vulnerabilities.

---

### 3.6 Subsystem F: Database Security & Field-Level Encryption

```mermaid
erDiagram
    profiles ||--o{ conversations : "owns"
    profiles ||--o{ appointments : "books"
    profiles ||--o{ mood_logs : "records"
    profiles ||--o{ message_feedback : "submits"
    profiles ||--o{ crisis_logs : "triggers"
    conversations ||--o{ messages : "contains"
    doctors ||--o{ appointments : "conducts"

    profiles {
        uuid id PK
        text email
        text full_name
        text role "user | admin"
        boolean has_accepted_disclaimer
        timestamptz created_at
    }

    conversations {
        uuid id PK
        uuid user_id FK
        text title
        timestamptz created_at
        timestamptz updated_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        text role "user | assistant | system"
        text content
        jsonb metadata
        timestamptz created_at
    }

    health_documents {
        uuid id PK
        text title
        text content
        text source_url
        vector_768 embedding
        jsonb metadata
        timestamptz created_at
    }

    doctors {
        uuid id PK
        text name
        text specialty
        jsonb working_hours
        text calendar_id
        text bio
        text avatar_url
        timestamptz created_at
    }

    appointments {
        uuid id PK
        uuid user_id FK
        uuid doctor_id FK
        text doctor_name
        text doctor_specialty
        timestamptz start_time
        timestamptz end_time
        text status "confirmed | cancelled | completed"
        text google_event_id
        text meet_link
        text patient_notes "encrypted AES-256"
        timestamptz created_at
    }

    mood_logs {
        uuid id PK
        uuid user_id FK
        text sentiment
        text mood
        int intensity
        text notes "encrypted AES-256"
        timestamptz created_at
    }

    crisis_logs {
        uuid id PK
        uuid user_id FK
        text trigger_text
        text detected_severity
        boolean reviewed
        text reviewer_notes
        timestamptz created_at
    }

    message_feedback {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        int rating "+1 | -1"
        text feedback_text
        timestamptz created_at
    }
```

* **Row Level Security (RLS):**
  * `profiles`, `conversations`, `messages`, `appointments`, `mood_logs`: Authenticated users can only read/write rows matching `auth.uid() = user_id`.
  * `doctors`: Public read-only for availability checking; admin-only for insert/update/delete.
  * Admin Overrides: Users with `profiles.role = 'admin'` hold global `SELECT` policies across all patient records and write access to `crisis_logs`.
* **Field-Level Encryption (`lib/encryption.ts` / `pgcrypto`):**
  Sensitive notes in `appointments.patient_notes` and `mood_logs.notes` are symmetrically encrypted with AES-256-GCM before writing to the database, ensuring database compromise does not expose raw clinical disclosures.

---

## 4. Developer Runbook & Operations

### 4.1 Environment Configuration (`.env.local`)

```ini
# --- Core AI & LLM ---
GEMINI_API_KEY=AIzaSy...

# --- Supabase Database, Auth & Vectors ---
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# --- Google Cloud Service Account (Calendar API v3) ---
GOOGLE_SERVICE_ACCOUNT_EMAIL=healthcare-bot@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...\n-----END PRIVATE KEY-----\n"
GOOGLE_CALENDAR_ID=primary

# --- Resend Email & Vercel Cron ---
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=appointments@yourdomain.com
CRON_SECRET=super_secret_cron_token_32chars

# --- Security, Encryption & Bot Defense ---
CLINICAL_ENCRYPTION_KEY=32_character_hex_or_passphrase_key
NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=0x4AAAAAA...
CLOUDFLARE_TURNSTILE_SECRET_KEY=0x4AAAAAA...

# --- Sentry Observability (Optional) ---
NEXT_PUBLIC_SENTRY_DSN=https://xxxxxxxx@sentry.io/xxxxxxx
SENTRY_AUTH_TOKEN=sntrys_xxxxxxx

# --- App URL ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 4.2 Database Migrations Workflow

All database schemas, extensions, and RLS policies are version-controlled in `supabase/migrations/`:

| Migration File | Contents |
| :--- | :--- |
| `01_initial_schema.sql` | `profiles`, `conversations`, `messages` tables with primary keys, FKs, and constraints. |
| `02_rls_policies.sql` | Row-Level Security policies enforcing user data isolation. |
| `03_pgvector_rag.sql` | `vector` extension, `health_documents` table, HNSW cosine index, and `match_health_documents` RPC. |
| `04_appointments.sql` | `appointments` table with Google event IDs, Meet links, and patient RLS. |
| `05_mood_logs.sql` | `mood_logs` table for sentiment and mood intensity tracking. |
| `06_admin_roles_rls.sql` | Adds `profiles.role` column and administrative RLS override `SELECT` policies. |
| `07_crisis_logs.sql` | `crisis_logs` table for persistent safety review and clinician follow-ups. |
| `08_field_encryption.sql` | Enables `pgcrypto` extension and field-level encryption helper functions. |

To apply migrations locally or to a hosted Supabase project:
```bash
npx supabase db push
```

---

### 4.3 CLI Maintenance Scripts

The project includes purpose-built TypeScript CLI utilities in `scripts/`:

```bash
# 1. Fetch open-access medical FAQs (MedQuAD/MedlinePlus) into data/health_docs/
npm run docs:fetch

# 2. Chunk, embed (text-embedding-004), and upsert medical vectors into pgvector
npm run docs:ingest

# 3. Promote an existing user to system administrator (No public signup path)
npx ts-node scripts/promote_admin.ts admin@hospital.com

# 4. Wipe and re-seed the local/preview database with deterministic test fixtures
npm run test:seed
```

---

### 4.4 Running Locally and with Docker

#### Standard Local Development
```bash
npm install
npm run dev
# App runs at http://localhost:3000
```

#### Containerized Execution (Local Parity)
```bash
docker compose up --build
# Containerized Next.js standalone build runs at http://localhost:3000
```

---

### 4.5 Testing Architecture & Verification

The application employs a 3-tier testing strategy:

1. **Unit & Component Testing (Vitest + React Testing Library):**
   * Tests `lib/gemini.ts`, `lib/safety.ts`, `lib/vectorStore.ts`, `lib/sanitizer.ts`, and `lib/validations/auth.ts`.
   * Run: `npm run test`
2. **Database Security & RLS Tests (`tests/db/rls.test.ts`):**
   * Uses two distinct mock user sessions to verify that cross-tenant read/writes are strictly blocked across `conversations`, `messages`, `appointments`, and `mood_logs`.
   * Run: `npm run test:db`
3. **End-to-End User Flow Tests (Playwright in `e2e/`):**
   * `e2e/auth-flow.spec.ts`: Tests signup validation, honeypot rejection, email verification, and login.
   * `e2e/chat-flow.spec.ts`: Tests disclaimer acceptance, streaming chat, source citation pills, and booking modal triggers.
   * Run: `npx playwright test`

---

### 4.6 Free-Tier Quota & Cost Controls

To ensure continuous operation on free cloud tiers without unexpected service halts:

| Service | Free Limit | Architectural Protection |
| :--- | :--- | :--- |
| **Google Gemini API** | 15 Requests/Min | Client-side debouncing, token-bucket throttling, and offline fallback (`lib/nlpFallback.ts`). |
| **Supabase Postgres** | 500 MB Storage | 500-token vector chunk caps, metadata truncation, and automated guest chat cleanup. |
| **Resend** | 100 Emails/Day | Rolling 24-hour reminder queries; cancellation emails batched and deduplicated. |
| **Vercel Serverless** | 10s Execution Limit | Streaming responses (`ReadableStream` via SSE) bypass the 10-second request timeout. |
| **Vercel Cron** | 1 Execution/Day | Cron scheduled at `0 0 * * *` (midnight UTC) scanning the full 24-hour window. |

---

## 5. Codebase Directory Map

```text
smart-healthcare-assistant/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx              # Admin dashboard layout & RBAC verification
│   │       ├── doctors/page.tsx        # Doctors management CRUD interface
│   │       ├── appointments/page.tsx   # System-wide patient bookings view
│   │       └── crisis-logs/page.tsx    # Safety incident review & audit log
│   ├── (auth)/
│   │   ├── login/page.tsx              # Login form with Zod & Turnstile
│   │   ├── signup/page.tsx             # Signup form with password strength bar
│   │   ├── forgot-password/page.tsx    # Password reset request screen
│   │   ├── reset-password/page.tsx     # Password reset token handler
│   │   └── verify-email/page.tsx       # Post-signup email verification screen
│   ├── (dashboard)/
│   │   ├── appointments/page.tsx       # Patient appointment management dashboard
│   │   ├── settings/page.tsx           # Profile & GDPR account data deletion
│   │   └── chat/page.tsx               # Primary conversational interface
│   ├── api/
│   │   ├── chat/route.ts               # Streaming chat, RAG, & pre-crisis safety gate
│   │   ├── extract/route.ts            # Clinical entity, intent & mood extractor
│   │   ├── appointments/
│   │   │   ├── availability/route.ts   # Free/busy slot discovery route
│   │   │   ├── book/route.ts           # Atomic booking, calendar sync & email dispatch
│   │   │   ├── cancel/route.ts         # Cancellation & calendar slot release
│   │   │   └── reschedule/route.ts     # Appointment rescheduling handler
│   │   ├── cron/
│   │   │   └── reminders/route.ts      # 24-hour reminder email dispatch cron
│   │   ├── auth/
│   │   │   ├── callback/route.ts       # OAuth token exchange route
│   │   │   └── resend-verification/    # Resend verification email route
│   │   └── health/route.ts             # Uptime & database health check probe
│   ├── error.tsx                       # Global error boundary with retry button
│   ├── not-found.tsx                   # Accessible custom 404 screen
│   ├── loading.tsx                     # Route-level skeleton loader
│   ├── privacy/page.tsx                # Privacy Policy & HIPAA/GDPR alignment
│   ├── terms/page.tsx                  # Terms of Service & Medical Disclaimer
│   ├── layout.tsx                      # Root layout, theme provider, metadata
│   └── page.tsx                        # Public landing page with consent modal
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx           # Chat thread orchestrator & stream reader
│   │   ├── ChatInput.tsx               # Auto-resizing textarea with mic toggle
│   │   ├── VoiceInputButton.tsx        # Web Speech API speech-to-text module
│   │   ├── MessageBubble.tsx           # Markdown renderer with citation pills & feedback
│   │   ├── CrisisBanner.tsx            # Unclosable 988 emergency hotline overlay
│   │   └── SentimentIndicator.tsx      # Mood badge & emotional wellness trigger
│   ├── appointment/
│   │   ├── BookingModal.tsx            # Doctor selection & consultation dialogue
│   │   └── SlotPicker.tsx              # Timezone-aware interactive slot picker
│   ├── wellness/
│   │   ├── BreathingExercise.tsx       # Interactive 4-7-8 & box breathing visualizer
│   │   └── GroundingWidget.tsx         # Interactive 5-4-3-2-1 sensory checklist
│   ├── auth/
│   │   ├── GoogleAuthButton.tsx        # OAuth sign-in trigger
│   │   └── BotProtection.tsx           # Honeypot & Cloudflare Turnstile challenge
│   └── ui/                             # FormField, PasswordInput, Toast, Modals
├── data/
│   └── health_docs/                    # Curated open medical FAQs (MedQuAD/MedlinePlus)
├── lib/
│   ├── gemini.ts                       # Gemini SDK configuration & prompt templates
│   ├── vectorStore.ts                  # Supabase pgvector cosine similarity search
│   ├── googleCalendar.ts               # Service Account Calendar API v3 wrapper
│   ├── resend.ts                       # Resend email client & email dispatch helpers
│   ├── safety.ts                       # Deterministic crisis & self-harm detection gate
│   ├── nlpFallback.ts                  # Offline regex symptom & intent fallback parser
│   ├── timezone.ts                     # Patient/doctor timezone conversion utilities
│   ├── sanitizer.ts                    # Prompt injection, XSS & Markdown sanitizer
│   ├── encryption.ts                   # Column-level AES-256-GCM / pgcrypto encryption
│   ├── auth/
│   │   ├── requireRole.ts              # Server-side RBAC role verification guard
│   │   └── validateServerInput.ts      # Server-side Zod payload validation guard
│   ├── supabase/
│   │   ├── client.ts                   # Browser Supabase SSR client
│   │   ├── server.ts                   # Server component Supabase client
│   │   └── syncGuestSession.ts         # Guest-to-authenticated chat migration
│   └── validations/
│       └── auth.ts                     # Zod schemas (signupSchema, loginSchema)
├── scripts/
│   ├── fetch_health_docs.ts            # Download open medical knowledge base files
│   ├── ingest_health_docs.ts           # Chunk and generate 768-dim embeddings into pgvector
│   ├── promote_admin.ts                # Manual administrator promotion script (CLI)
│   └── seed_test_db.ts                 # Reset and seed test database fixtures
├── supabase/
│   └── migrations/                     # SQL schema migrations (01 through 08)
├── e2e/                                # Playwright end-to-end test suites
├── sentry.client.config.ts             # Sentry client exception monitoring
├── sentry.server.config.ts             # Sentry server-side exception monitoring
├── sentry.edge.config.ts               # Sentry edge exception monitoring
├── Dockerfile                          # Production multi-stage Alpine Docker build
├── docker-compose.yml                  # Local container orchestration
├── requirements.md                     # Software Requirements Specification (SRS)
├── tasks.md                            # Comprehensive phased engineering roadmap
├── OVERVIEW.md                         # This developer architecture & system guide
├── README.md                           # Public repository landing documentation
├── package.json                        # Dependencies and script definitions
└── tsconfig.json                       # Strict TypeScript configuration
```
