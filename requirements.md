# Smart Healthcare Assistant using Conversational AI
## Software Requirements Specification (SRS)

**Document Version:** 1.3.0  
**Status:** Approved / Active Baseline  
**Target Architecture:** Next.js (TypeScript) + Tailwind CSS + Supabase (pgvector + Auth) + Google Gemini API + Google Calendar API  

---

## 1. Project Overview

The **Smart Healthcare Assistant** is an intelligent, voice-enabled conversational web platform designed to bridge the gap between preliminary health concerns and actionable wellness guidance. Utilizing Retrieval-Augmented Generation (RAG) powered by Google's Gemini models and Supabase `pgvector`, the platform delivers evidence-backed wellness information while analyzing user sentiments and symptoms in real time.

### Core Objectives
* **Accessible Health Literacy:** Provide immediate, reliable answers to general wellness and health inquiries grounded in curated medical knowledge bases.
* **Contextual & Empathetic Engagement:** Detect symptom patterns, user intent, and emotional states (anxiety, distress, neutral, positive) to offer empathetic dialogue and evidence-based mental wellness coping techniques.
* **Streamlined Care Logistics:** Enable frictionless appointment scheduling with doctors or wellness counselors integrated seamlessly with Google Calendar (via Service Account delegation) and automated email notifications.
* **Clinical Supervision & Auditability:** Provide healthcare administrators with secure, role-based dashboards to manage doctor directories, review all patient bookings, and audit crisis-flag incidents.
* **Data Privacy by Design:** Guarantee user privacy and data security through PostgreSQL Row-Level Security (RLS), encrypted database records, and anonymous guest interaction options with seamless account migration.
* **Resilience & Observability:** Ensure graceful fallbacks for rate limits and offline states, full-stack error tracking via Sentry, and transparent API quota telemetry.

---

## 2. Functional Requirements

### 2.1 Requirements Traceability Matrix

| ID | Feature / Requirement | Description | Priority | Status |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Basic Health & Wellness RAG | Retrieve context from vetted health documents using `pgvector` and synthesize responses via Gemini API. | High | Not Started |
| **FR-02** | Source Citations & References | Display verified reference links and knowledge base sources alongside AI responses in UI citation pills. | Medium | Not Started |
| **FR-03** | Symptom & Intent Extraction | Parse conversational inputs into structured entities (symptoms, duration, severity, urgency) via Gemini JSON mode. | High | Not Started |
| **FR-04** | Mood & Sentiment Analysis | Detect user emotional states (stress, anxiety, depression markers) to adapt tone and empathy level dynamically. | High | Not Started |
| **FR-05** | Empathetic Mental Wellness Support | Deliver interactive mindfulness exercises (4-7-8 breathing circle, 5-4-3-2-1 sensory grounding). | High | Not Started |
| **FR-06** | Crisis Escalation & Safety Protocol | Automatically detect suicidal ideation, self-harm, or severe emergencies and trigger instant helpline prompts. | High | Not Started |
| **FR-07** | Calendar Slot Discovery | Fetch real-time available appointment slots using Google Calendar API (Service Account / OAuth). | High | Not Started |
| **FR-08** | Appointment Booking & Event Creation | Confirm booking, atomically persist appointment record, and create Google Calendar events with Google Meet links. | High | Not Started |
| **FR-09** | Email Notification Dispatch | Send transactional booking confirmations, rescheduling notices, and cancellation alerts via Resend. | Medium | Not Started |
| **FR-10** | User Authentication & Authorization | Secure signup, login, session management, and Google OAuth support via Supabase Auth. | High | Not Started |
| **FR-11** | Encrypted Chat Persistence | Store conversation histories tied to authenticated user profiles with encryption at rest and RLS isolation. | High | Not Started |
| **FR-12** | Chat Thread Management | Allow users to create, view, rename, search, export, and delete individual conversation threads. | Medium | Not Started |
| **FR-13** | Medical Disclaimer & Consent Enforcement | Require user acknowledgment of the non-diagnostic disclaimer prior to initial interaction and per session. | High | Not Started |
| **FR-14** | Admin Knowledge Base Ingestion | Provide administrative scripts to chunk markdown/PDF health documents and generate 768-dim vector embeddings. | Medium | Not Started |
| **FR-15** | Export Chat & Health Summaries | Enable users to export their conversational symptom log as a structured Markdown or JSON summary for their physician. | Low | Not Started |
| **FR-16** | Voice Input & Speech-to-Text | Transcribe spoken user inquiries directly into the chat input via the browser-native Web Speech API. | Medium | Not Started |
| **FR-17** | Persistent Consent State | Store disclaimer acceptance in `localStorage` and synchronize with user profiles in Supabase upon authentication. | High | Not Started |
| **FR-18** | Client & Server Auth Form Validation | Validate login and signup fields using Zod schemas on both client (`react-hook-form`) and API route handlers. | High | Not Started |
| **FR-19** | Account Recovery & Password Reset | Support self-service password reset flows using Supabase Auth recovery tokens and dedicated reset forms. | High | Not Started |
| **FR-20** | Guest-to-Authenticated Session Migration | Detect in-memory guest conversations upon signup/login and atomically commit them to the new user's chat history. | Medium | Not Started |
| **FR-21** | Local Entity & Offline NLP Fallback | Provide rule- and regex-based entity extraction fallback (`lib/nlpFallback.ts`) when Gemini API is rate-limited. | Medium | Not Started |
| **FR-22** | Physician Directory & Availability Model | Manage certified doctor records in a dedicated `doctors` table as the definitive source of truth for scheduling. | High | Not Started |
| **FR-23** | Appointment Cancellation & Rescheduling | Allow users to reschedule or cancel appointments, updating database states and releasing Google Calendar slots. | High | Not Started |
| **FR-24** | Automated 24-Hour Reminder Cron | Trigger automated email reminders 24 hours prior to scheduled consultations via Vercel Cron and Resend. | Medium | Not Started |
| **FR-25** | Timezone-Aware Slot Scheduling | Detect client browser timezone and convert physician operating hours and calendar events to the patient's local time. | High | Not Started |
| **FR-26** | Longitudinal Mood & Sentiment Tracking | Persist user mood scores and emotional states to a dedicated `mood_logs` table for wellness history visualization. | Medium | Not Started |
| **FR-27** | Pre-Execution Crisis Interception | Intercept chat requests in the server pipeline prior to LLM invocation, immediately halting inference on crisis triggers. | High | Not Started |
| **FR-28** | AI Response Feedback Mechanism | Enable thumbs up/down user feedback on assistant messages and log ratings to Supabase for response evaluation. | Low | Not Started |
| **FR-29** | Free-Tier Quota & Telemetry Monitoring | Monitor and log Gemini API call volume, token estimates, Supabase storage, and Resend email quotas to prevent outages. | Medium | Not Started |
| **FR-30** | Role-Based Access Control (RBAC) & Route Guard | Enforce user roles (`user`, `admin`), server checks (`requireRole.ts`), and middleware protecting `/admin/*` routes. | High | Not Started |
| **FR-31** | Physician Directory Administration | Full administrative CRUD interface in `/admin/doctors` to configure doctor bios, specialties, working hours, and calendar IDs. | High | Not Started |
| **FR-32** | System-Wide Appointment Administration | Centralized administrative view in `/admin/appointments` across all patient bookings with status filters and overrides. | High | Not Started |
| **FR-33** | Crisis Incident Audit & Review Panel | Persist crisis incidents into `crisis_logs` table and provide `/admin/crisis-logs` panel for clinical follow-up tracking. | High | Not Started |
| **FR-34** | Field-Level Data Encryption for Notes | Encrypt sensitive free-text columns (`mood_logs.notes`, `appointments.patient_notes`) via `pgcrypto` / AES-256-GCM. | Medium | Not Started |
| **FR-35** | Bot & Spam Protection for Auth Endpoints | Prevent credential stuffing and bot registrations using hidden honeypot fields and free-tier Cloudflare Turnstile. | Low | Not Started |

---

### 2.2 Detailed Feature Breakdown

#### FR-01 & FR-02: Health & Wellness RAG Chatbot
* **Description:** The system queries an embedded database of curated medical guidelines (CDC, MedlinePlus, WHO open-access docs).
* **Processing Flow:**
  1. Generate query embedding using Gemini `text-embedding-004` (768 dimensions).
  2. Perform cosine similarity search against `health_documents` in Supabase via RPC function `match_health_documents` (threshold $\ge 0.75$, top $K=3$).
  3. Inject retrieved context into a tightly constrained Gemini system prompt.
  4. Stream response tokens via Server-Sent Events (SSE) to the frontend.
* **Outputs:** Markdown-formatted response containing citations that render as interactive UI pills linking to source excerpts.

#### FR-03 & FR-21: Symptom, Intent, and Offline NLP Extraction
* **Description:** Extracts structured clinical parameters from conversational turns.
* **Primary Extractor:** Gemini JSON schema / function calling mode:
  ```json
  {
    "intent": "symptom_inquiry | appointment_booking | mental_health_support | general_faq",
    "symptoms": [{"name": "migraine", "duration": "3 days", "severity": "moderate"}],
    "mood": "anxious | stressed | neutral | hopeful",
    "urgency": "low | medium | emergency"
  }
  ```
* **Offline Fallback (FR-21):** If the Gemini API returns HTTP 429 (rate-limited) or is unreachable, the system routes the query through `lib/nlpFallback.ts` using regex pattern matching and medical term dictionaries to identify symptoms and urgency without crashing.

#### FR-05, FR-06, FR-26 & FR-27: Mental Wellness & Crisis Protocol
* **Mood Logging (FR-26):** User emotional state and sentiment intensity are recorded in the `mood_logs` table to allow longitudinal wellness tracking.
* **Empathetic Dialogue (FR-05):** When stress or anxiety is detected, prompt parameters dynamically tune tone toward non-judgmental active listening, recommending interactive micro-tools:
  * `BreathingExercise.tsx`: Visual pacing for 4-7-8 and box breathing patterns.
  * `GroundingWidget.tsx`: 5-4-3-2-1 sensory awareness checklist.
* **Pre-Execution Crisis Safety Gate (FR-27):** Before sending user input to the Gemini LLM, `app/api/chat/route.ts` runs a deterministic safety classifier (`lib/safety.ts`). If self-harm or suicidal ideation triggers are hit, generation is halted immediately, and the client renders an unclosable `CrisisBanner.tsx` displaying:
  * **988 Suicide & Crisis Lifeline** (Call/Text 988)
  * **Crisis Text Line** (Text HOME to 741741)
  * **Emergency Services** (911 / 112)

#### FR-07, FR-08, FR-22, FR-23, FR-24 & FR-25: Doctor Scheduling & Calendar Integration
* **Doctor Directory (FR-22):** Validated physician records are stored in `doctors`, defining specialties, working hours (JSONB), and calendar IDs.
* **Google Calendar Integration:** Uses a Google Cloud Service Account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` & `GOOGLE_PRIVATE_KEY`) to manage central clinic calendar availability and atomically book events with Google Meet links.
* **Timezone Normalization (FR-25):** The client's IANA timezone is resolved via `Intl.DateTimeFormat().resolvedOptions().timeZone` and translated to doctor operating hours before rendering slots in `SlotPicker.tsx`.
* **Appointment Lifecycle (FR-23):** Users can reschedule or cancel bookings via `/api/appointments/cancel` and `/reschedule`, freeing calendar slots and issuing notification emails.
* **Automated Reminders (FR-24):** A Vercel Cron job (`/api/cron/reminders`, secured by `CRON_SECRET`) runs daily to email patients with consultations scheduled in the next 24 hours.

#### FR-10, FR-18, FR-19, FR-20 & FR-30: Authentication, RBAC & Secure Storage
* **Form Validation (FR-18):** Strict Zod schemas (`lib/validations/auth.ts`) enforce password complexity, confirmation matching, and terms acceptance on both client (`react-hook-form`) and server (`lib/auth/validateServerInput.ts`).
* **Session Migration (FR-20):** In-memory conversations held by anonymous guests are automatically preserved upon login or account creation and committed to Supabase tables.
* **Role-Based Access Control (FR-30):** User roles (`user`, `admin`) are stored on `profiles.role`. Administrative routes (`/admin/*`) are protected by server-side guards (`lib/auth/requireRole.ts`) and Next.js middleware, rejecting unauthorized requests with a 403 Forbidden redirect.
* **Data Storage Schema:**
  * `profiles`: `id (uuid, PK)`, `email (text)`, `full_name (text)`, `role (text: 'user' | 'admin' default 'user')`, `has_accepted_disclaimer (boolean)`, `created_at (timestamptz)`.
  * `conversations`: `id (uuid, PK)`, `user_id (uuid, FK)`, `title (text)`, `created_at`, `updated_at`.
  * `messages`: `id (uuid, PK)`, `conversation_id (uuid, FK)`, `role (text)`, `content (text)`, `metadata (jsonb)`, `created_at`.
  * `health_documents`: `id (uuid, PK)`, `title (text)`, `content (text)`, `source_url (text)`, `embedding (vector(768))`, `metadata (jsonb)`, `created_at`.
  * `doctors`: `id (uuid, PK)`, `name (text)`, `specialty (text)`, `working_hours (jsonb)`, `calendar_id (text)`, `bio (text)`, `avatar_url (text)`, `created_at`. *RLS: Public/authenticated read-only; admin-only insert/update/delete.*
  * `appointments`: `id (uuid, PK)`, `user_id (uuid, FK)`, `doctor_id (uuid, FK)`, `doctor_name (text)`, `doctor_specialty (text)`, `start_time (timestamptz)`, `end_time (timestamptz)`, `status (text)`, `google_event_id (text)`, `meet_link (text)`, `patient_notes (text, field-level encrypted)`, `created_at`.
  * `mood_logs`: `id (uuid, PK)`, `user_id (uuid, FK)`, `sentiment (text)`, `mood (text)`, `intensity (int)`, `notes (text, field-level encrypted)`, `created_at`.
  * `message_feedback`: `id (uuid, PK)`, `message_id (uuid, FK)`, `user_id (uuid, FK)`, `rating (int: +1/-1)`, `feedback_text (text)`, `created_at`.
  * `crisis_logs`: `id (uuid, PK)`, `user_id (uuid, FK)`, `trigger_text (text)`, `detected_severity (text)`, `reviewed (boolean default false)`, `reviewer_notes (text)`, `created_at (timestamptz)`.
* **Administrative RLS Overrides:** While standard users are strictly isolated to their own records via RLS, administrators hold authenticated `SELECT` override policies on `conversations`, `messages`, `appointments`, `mood_logs`, and full read/write access to `crisis_logs` and `doctors`.

#### FR-31, FR-32 & FR-33: Administrative Management & Crisis Auditability
* **Doctor Directory CRUD (FR-31):** Administrators manage healthcare providers at `/admin/doctors`, updating calendar synchronization IDs, specialties, and weekly working hour JSON structures.
* **Supervisory Appointment View (FR-32):** Real-time monitoring of all patient bookings across physicians at `/admin/appointments`, including cancellation overrides and status filtering.
* **Crisis Review Panel (FR-33):** Critical safety review workflow at `/admin/crisis-logs` logging every `CRISIS_TRIGGERED` event with flagged prompts, severity classification, clinician acknowledgment checkboxes, and audit notes.

---

## 3. Non-Functional Requirements

### 3.1 Performance
* **NFR-P1 (Response Latency):** First token of streaming chat responses must arrive in $< 1.2$ seconds over standard broadband connections.
* **NFR-P2 (Vector Search Latency):** Cosine similarity search using `pgvector` HNSW indexes must execute in $< 150\text{ ms}$.
* **NFR-P3 (Lighthouse Score):** Web client must achieve $\ge 90$ across Performance, Accessibility, Best Practices, and SEO.

### 3.2 Security & Compliance
* **NFR-S1 (Data Isolation & RLS Verification):** Mandatory Supabase Row Level Security (RLS) policies enabled across all tables. Automated tests (`tests/db/rls.test.ts`) must explicitly assert cross-tenant isolation on `conversations`, `messages`, `appointments`, and `mood_logs`.
* **NFR-S2 (Transport Encryption):** All network communication enforced over TLS 1.3 / HTTPS.
* **NFR-S3 (Prompt Injection & Sanitization):** User inputs sanitized via `lib/sanitizer.ts` to neutralize delimiter hijacking, jailbreaking, and cross-site scripting (XSS).
* **NFR-S4 (Key Isolation):** Secret keys (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PRIVATE_KEY`, `RESEND_API_KEY`, `CLINICAL_ENCRYPTION_KEY`) strictly confined to server-side execution.
* **NFR-S5 (Server-Side Validation Guard):** All client-submitted forms must re-validate on the server via Zod to prevent direct API manipulation.
* **NFR-S6 (Data Minimization):** Zero permanent retention of guest session transcripts unless the user explicitly authenticates. Account settings allow complete GDPR-aligned data deletion.
* **NFR-S7 (Privilege Escalation Defense):** Zero public signup vector for administrator accounts; promotions strictly enforced via CLI (`scripts/promote_admin.ts`) using the Service Role key.
* **NFR-S8 (Field-Level Column Encryption):** Sensitive clinical notes (`mood_logs.notes`, `appointments.patient_notes`) must be encrypted at rest using PostgreSQL `pgcrypto` (`pgp_sym_encrypt`) or AES-256-GCM before writing to storage.
* **NFR-S9 (Bot & Abuse Mitigation):** Public authentication forms protected against automated registration and credential stuffing attacks via invisible honeypot fields and free-tier Cloudflare Turnstile verification.

### 3.3 Scalability & Availability
* **NFR-SC1 (Serverless Architecture):** Next.js App Router deployed on Vercel Serverless and Edge network for horizontal scaling.
* **NFR-SC2 (Database Connection Pooling):** Supabase connection pooling (Supavisor) configured to handle concurrent requests without exhaustion.
* **NFR-SC3 (Availability):** Target $99.5\%$ operational uptime, verified via automated `/api/health` heartbeat probes.
* **NFR-SC4 (Container Portability):** Multi-stage `Dockerfile` and `docker-compose.yml` for local development parity and standalone container deployments.

### 3.4 Usability & Accessibility
* **NFR-U1 (Responsive Design):** Fully responsive layout adapting across mobile (320px+), tablet, and desktop viewports built with Tailwind CSS.
* **NFR-U2 (Accessibility Standards):** Conformance with WCAG 2.1 Level AA standards, including keyboard focus traps, screen-reader labels, and $> 4.5:1$ color contrast.
* **NFR-U3 (Resilience & Error UX):** Dedicated Next.js error boundaries (`error.tsx`), not-found views (`not-found.tsx`), skeleton loaders (`loading.tsx`), and accessible Sonner toast alerts.
* **NFR-U4 (Voice Accessibility):** Browser-native speech-to-text integration with clear active-listening pulse states and graceful fallbacks for unsupported browsers.

### 3.5 Observability
* **NFR-O1 (Full-Stack Error Tracking):** Sentry integration across client components, server route handlers, and edge functions to capture uncaught exceptions and latency spikes.
* **NFR-O2 (API Quota Telemetry):** Server-side telemetry logging Gemini API call counts, token estimations, and Resend email quotas to alert before free-tier limit exhaustion.

---

## 4. User Roles & Permissions

| Role | Permissions & Capabilities |
| :--- | :--- |
| **Guest / Anonymous User** | • Query basic health and wellness questions via text or voice input.<br>• View non-diagnostic medical disclaimers.<br>• Access emergency crisis hotline information and interactive breathing tools.<br>• Chat history held in-memory; migrated automatically upon registration.<br>• Cannot book calendar consultations. |
| **Registered Patient / User** | • Full persistent chat history across sessions and devices.<br>• Discover physician availability, book, reschedule, and cancel calendar consultations.<br>• Receive automated booking confirmations and 24-hour reminder emails.<br>• Longitudinal mood logging and emotional check-in history.<br>• Provide thumbs up/down feedback on AI responses.<br>• Export chat summaries to Markdown/JSON, update profile, or permanently delete account and health records. |
| **System Administrator** | • Access dedicated `/admin` dashboard shell protected by `lib/auth/requireRole.ts` and middleware.<br>• Full CRUD management over `doctors` directory (specialties, hours, calendar IDs).<br>• Supervise all patient appointments across physicians with status filtering and cancellation overrides.<br>• Review logged crisis safety incidents (`crisis_logs`), verify clinician follow-ups, and maintain legal audit trails.<br>• Ingest, chunk, and embed curated medical guidelines into `pgvector`.<br>• Monitor Sentry error logs, `/api/health` endpoint metrics, and free-tier API quotas.<br>• Promoted exclusively via CLI (`scripts/promote_admin.ts`); no public registration route. |

---

## 5. External Dependencies & APIs

| Service / Tool | Purpose | Free Tier Limits |
| :--- | :--- | :--- |
| **Google Gemini API** (`gemini-1.5-flash` / `text-embedding-004`) | Conversational synthesis, symptom extraction, sentiment analysis, vector embeddings. | 15 RPM, 1M TPM, 1,500 RPD on free tier. |
| **Supabase** | PostgreSQL database, Auth engine, `pgvector` vector store, Row Level Security. | 500 MB DB storage, 50,000 monthly active users, 500 MB file storage. |
| **Google Cloud Service Account & Calendar API** | Clinic calendar availability lookup, automated appointment scheduling, Google Meet creation. | 1,000,000 queries/day on GCP free quota. |
| **Resend** | Transactional booking confirmations, cancellation alerts, and 24-hour reminder emails. | 100 emails/day free (3,000 emails/month). |
| **Web Speech API** | Client-side speech-to-text transcription directly within the user's browser. | Native browser API (No external API quotas or cost). |
| **Sentry** | Full-stack application performance monitoring and exception capture. | 5,000 errors/month free Developer tier. |
| **Upstash Ratelimit** | Redis-backed token bucket rate limiting on public API endpoints. | 10,000 requests/day free tier. |
| **Cloudflare Turnstile** | Smart CAPTCHA & bot challenge widget for signup and login forms. | Free tier: Unlimited requests. |
| **Vercel** | Next.js serverless and edge hosting with global CDN. | Free Hobby tier: 100 GB bandwidth, 10s serverless timeout, daily cron jobs. |
| **GitHub Actions** | Automated CI/CD pipeline (ESLint, TypeScript checks, unit and E2E tests). | 2,000 compute minutes/month for public/private repositories. |

---

## 6. Constraints

1. **Free-Tier Operational Ceiling:** The entire application must operate strictly within the free tiers of Vercel, Supabase, Google AI Studio, GCP, Resend, and Sentry.
2. **Serverless Execution Timeout:** Vercel Hobby serverless functions timeout after 10 seconds. All generative dialogue must utilize streaming (`ReadableStream`) via the Vercel AI SDK to prevent connection terminations.
3. **Database Capacity:** Supabase 500 MB limit requires efficient vector storage: text chunks capped at 500 tokens with 768-dimensional float arrays and index optimization.
4. **API Rate Limiting & Throttling:** Gemini free tier limit of 15 requests per minute necessitates debounce controls, exponential backoff, and local rule-based entity fallback (`lib/nlpFallback.ts`).
5. **Vercel Cron Limitations:** Free hobby tier restricts cron triggers to once per day; reminder jobs query appointments within a rolling 24-hour window.
6. **No Direct Health Insurance / Billing:** Zero capability or legal provision to process insurance claims, copays, or payments.

---

## 7. Assumptions

* Users have a stable internet connection and a modern web browser supporting ES6, Server-Sent Events (SSE), and the Web Speech API (for voice input).
* Health knowledge base documents are sourced exclusively from curated, publicly verified open-access health organizations (CDC, WHO, MedlinePlus).
* The clinic's Google Cloud project maintains active Service Account credentials with calendar write permissions.
* The system resolves patient timezones automatically via standard browser APIs (`Intl.DateTimeFormat`) for appointment display.

---

## 8. Out of Scope

The following capabilities are strictly excluded from the project scope:
* **Medical Diagnosis & Prescription Writing:** The system will **never** diagnose clinical conditions, prescribe medications, or alter medical dosages.
* **Emergency Dispatch (E-911):** The assistant cannot dispatch first responders or directly dial emergency services.
* **Full EHR/EMR Integration:** Direct synchronization with hospital clinical record systems via HL7 or FHIR protocols is not supported.
* **Native Video Telehealth:** Video consultation streams are delegated externally to Google Meet via calendar invites rather than hosted natively.
* **Payment Processing:** No integration with payment gateways (Stripe, PayPal) for consultation fees.
