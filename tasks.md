# 📋 Project Tasks: Smart Healthcare Assistant using Conversational AI

A comprehensive, phased engineering roadmap designed for incremental development and tracking in an AI-assisted IDE (Antigravity). Each task represents a focused, actionable unit of work (1–3 hours) with explicit technical deliverables and dependency tracking.

---

## Phase 0: Project Setup

- [x] **Task 0.1: Initialize Next.js TypeScript application**  
  Initialize a Next.js 14/15 App Router project with TypeScript, Tailwind CSS, and ESLint configured (`npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`).
- [x] **Task 0.2: Configure UI component primitives & styling utilities**  
  Install `lucide-react`, `clsx`, `tailwind-merge`, and `@tailwindcss/typography`. Configure `lib/utils.ts` for className merging and verify Tailwind theme styling for healthcare color palettes (emerald/teal/sky).
- [x] **Task 0.3: Define environment configuration & schema validation**  
  Create `.env.example` and a runtime environment validator in `lib/env.ts` (using Zod or TypeScript schemas) covering `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, and `RESEND_API_KEY`.
- [x] **Task 0.4: Initialize Git repository & version control hygiene**  
  Initialize Git repository, ensure `.gitignore` excludes `.env*.local`, `.next`, build caches, and node_modules, and establish initial repository baseline.
- [x] **Task 0.5: Set up GitHub Actions CI workflow**  
  Create `.github/workflows/ci.yml` to run automated linting (`npm run lint`), TypeScript compile check (`npx tsc --noEmit`), and build verification on all pull requests and pushes to `main`.

---

## Phase 1: Basic Chat (MVP)

- [x] **Task 1.1: Build Google Gemini SDK client wrapper** *(requires Task 0.3 completed)*  
  Install `@google/generative-ai` (or `@google/genai`) and build `lib/gemini.ts` configured with `gemini-1.5-flash`, setting initial healthcare persona system instructions, temperature (0.3 for medical grounding), and safety thresholds.
- [x] **Task 1.2: Implement streaming chat API endpoint** *(requires Task 1.1 completed)*  
  Create Next.js Route Handler `app/api/chat/route.ts` accepting a POST payload of `{ messages: Array<{ role: string, content: string }> }` and returning a server-sent streaming response (`ReadableStream`) utilizing Gemini streaming generation.
- [x] **Task 1.3: Build message bubble and markdown renderer components** *(requires Task 0.2 completed)*  
  Create `components/chat/MessageBubble.tsx` to render conversational turns with user/assistant avatars, formatted markdown text, syntax highlighting, and copy-to-clipboard functionality.
- [x] **Task 1.4: Implement chat input and auto-resizing textarea** *(requires Task 0.2 completed)*  
  Create `components/chat/ChatInput.tsx` featuring auto-growing textarea, submit on `Enter` (without `Shift`), character counter, and disable state while awaiting streaming tokens.
- [x] **Task 1.5: Build conversational chat container & stream consumer** *(requires Tasks 1.2, 1.3, and 1.4 completed)*  
  Create `components/chat/ChatContainer.tsx` that manages conversational state, reads stream chunks from `/api/chat`, handles network aborts, auto-scrolls smoothly to new tokens, and displays a loading/typing indicator.
- [x] **Task 1.6: Build non-diagnostic medical disclaimer modal & banner** *(requires Task 0.2 completed)*  
  Create `components/ui/DisclaimerBanner.tsx` and a first-visit acknowledgment modal in `components/ui/ConsentModal.tsx` requiring users to confirm that the assistant is an informational tool, not a certified medical diagnostic device.
- [x] **Task 1.7: Construct MVP landing chat view** *(requires Tasks 1.5 and 1.6 completed)*  
  Integrate `ChatContainer`, header, disclaimer banner, and quick-prompt suggestion chips into `app/page.tsx` for immediate end-to-end guest chat testing.
- [x] **Task 1.8: Write integration test for chat streaming API** *(requires Task 1.2 completed)*  
  Create automated test in `tests/api/chat.test.ts` mocking Gemini API stream and verifying proper HTTP 200 chunk headers, 400 error handling on empty body, and rate-limiting responses.
- [x] **Task 1.9: Build Voice Input (Speech-to-Text) module** *(requires Task 1.4 completed)*  
  Create `components/chat/VoiceInputButton.tsx` using the browser-native Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`). Wire it to `ChatInput.tsx` to transcribe microphone input directly into the textarea with mic toggle, active recording pulse states, and fallback error handling for unsupported browsers.
- [x] **Task 1.10: Persist disclaimer acceptance state** *(requires Task 1.6 completed)*  
  Add logic to `ConsentModal.tsx` to store user consent in `localStorage` (and sync to `profiles.has_accepted_disclaimer` once authenticated), preventing the legal disclaimer modal from re-appearing on every page refresh.

---

## Phase 2: Auth & Database Integration

- [x] **Task 2.1: Author Supabase relational schema migration** *(requires Task 0.3 completed)*  
  Write SQL migration `supabase/migrations/01_initial_schema.sql` defining:
  - `profiles`: `id uuid references auth.users on delete cascade primary key`, `email text`, `full_name text`, `has_accepted_disclaimer boolean default false`, `created_at timestamptz default now()`.
  - `conversations`: `id uuid primary key default gen_random_uuid()`, `user_id uuid references profiles(id) on delete cascade`, `title text`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
  - `messages`: `id uuid primary key default gen_random_uuid()`, `conversation_id uuid references conversations(id) on delete cascade`, `role text check (role in ('user', 'assistant', 'system'))`, `content text not null`, `metadata jsonb default '{}'::jsonb`, `created_at timestamptz default now()`.
- [x] **Task 2.2: Implement PostgreSQL Row-Level Security (RLS) policies** *(requires Task 2.1 completed)*  
  Write SQL policies in `supabase/migrations/02_rls_policies.sql` ensuring authenticated users can only `SELECT`, `INSERT`, `UPDATE`, and `DELETE` their own profile, conversation threads, and associated messages.
- [x] **Task 2.3: Configure Supabase SSR client utilities** *(requires Task 2.1 completed)*  
  Install `@supabase/supabase-js` and `@supabase/ssr`. Configure `lib/supabase/client.ts` for client components, `lib/supabase/server.ts` for server components/actions, and Next.js `middleware.ts` for managing session token refresh.
- [x] **Task 2.4.1: Install form validation dependencies** *(requires Task 2.3 completed)*  
  Install `react-hook-form`, `zod`, and `@hookform/resolvers` to handle form state management and schema-based validation across login and signup workflows (`npm install react-hook-form zod @hookform/resolvers`).
- [x] **Task 2.4.2: Define validation schemas** *(requires Task 2.4.1 completed)*  
  Create `lib/validations/auth.ts` defining Zod schemas:
  - `signupSchema`: `fullName` (min 2, max 50 chars, letters/spaces only), `email` (valid email format, lowercase, trimmed), `password` (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character), `confirmPassword` (must match password via `.refine()`), and `terms` (boolean literal `true` for consent checkbox).
  - `loginSchema`: `email` (valid email format) and `password` (min 1 char required).  
  Export TypeScript types inferred from both schemas (`SignupInput`, `LoginInput`) for component and API reuse.
- [x] **Task 2.4.3: Build reusable form input components** *(requires Task 0.2 completed)*  
  Create `components/ui/FormField.tsx` and `components/ui/PasswordInput.tsx`:
  - `FormField`: Labeled accessible input with error message slot and red border state on validation errors.
  - `PasswordInput`: Show/hide password visibility toggle (eye/eye-off icon from `lucide-react`) and live password strength indicator bar (weak / medium / strong) updated as the user types.
- [x] **Task 2.4.4: Build Signup page with validation** *(requires Tasks 2.3, 2.4.2, and 2.4.3 completed)*  
  Create `app/(auth)/signup/page.tsx`:
  - Use `react-hook-form` with `zodResolver(signupSchema)`.
  - Fields: Full Name, Email, Password, Confirm Password, Terms checkbox.
  - Real-time validation (`mode: "onBlur"`) showing inline error messages per field.
  - On submit: call `supabase.auth.signUp()` with email/password, storing `full_name` in user metadata.
  - Map Supabase-specific errors (e.g., "User already registered") to user-friendly messages.
  - Display loading spinner on submit button and disable submit button until form inputs satisfy schema.
- [x] **Task 2.4.5: Build Login page with validation** *(requires Tasks 2.3, 2.4.2, and 2.4.3 completed)*  
  Create `app/(auth)/login/page.tsx`:
  - Use `react-hook-form` with `zodResolver(loginSchema)`.
  - Fields: Email, Password, "Remember me" checkbox, and "Forgot password?" recovery link.
  - On submit: call `supabase.auth.signInWithPassword()`.
  - Gracefully handle errors: invalid credentials, unverified email, or rate-limited attempts with inline alerts.
  - Redirect to `/chat` (or previous destination) on successful authentication with loading state on submit button.
- [x] **Task 2.4.6: Implement Google OAuth sign-in button** *(requires Task 2.3 completed)*  
  Create `components/auth/GoogleAuthButton.tsx` executing `supabase.auth.signInWithOAuth({ provider: 'google' })`. Add to both Login and Signup pages separated by a visual divider ("OR continue with"). Configure OAuth redirect URL and callback route handler at `app/auth/callback/route.ts`.
- [x] **Task 2.4.7: Implement email verification flow** *(requires Task 2.4.4 completed)*  
  Handle post-signup email verification:
  - Create `app/(auth)/verify-email/page.tsx` displaying a "Check your inbox" confirmation notice.
  - Handle unverified login attempts in `login/page.tsx` by presenting a "Resend verification email" action.
  - Build `app/api/auth/resend-verification/route.ts` triggering verification email resend via Supabase Auth Admin/client.
- [x] **Task 2.4.8: Build server-side validation guard** *(requires Task 2.4.2 completed)*  
  Create `lib/auth/validateServerInput.ts` to re-validate incoming payloads on the server using `signupSchema` and `loginSchema` inside auth-related API routes, preventing client validation bypass and returning structured 400 Bad Request responses.
- [x] **Task 2.4.9: Build auth error boundary & toast notifications** *(requires Task 0.2 completed)*  
  Install/configure `sonner` or create `components/ui/Toast.tsx` to provide accessible toast notifications for auth successes ("Account created successfully!") and failures ("Invalid credentials") across login and signup pages.
- [x] **Task 2.4.10: Implement auth redirect/session guard middleware** *(requires Task 2.3 completed)*  
  Update `middleware.ts`:
  - If authenticated user accesses `/login` or `/signup` → redirect to `/chat`.
  - If unauthenticated user accesses protected routes (`/dashboard`, `/appointments`, `/settings`) → redirect to `/login` with `?redirect=` query parameter to restore destination after authentication.
- [x] **Task 2.4.11: Write validation unit tests** *(requires Task 2.4.2 completed)*  
  Create `tests/validations/auth.test.ts` directly testing Zod schemas:
  - Assert rejection of weak passwords, invalid email formats, mismatched confirmation passwords, and empty required fields.
  - Assert acceptance of valid data and verify edge cases (email uppercase normalization, minimum boundary length passwords).
- [x] **Task 2.4.12: Write E2E test for signup/login flow** *(requires Tasks 2.4.4, 2.4.5, and 7.2 setup)*  
  Create Playwright test specs in `e2e/auth-flow.spec.ts`:
  - Fill signup form with invalid data → assert inline validation errors appear.
  - Fill signup form correctly → assert redirect to `/verify-email`.
  - Attempt login with invalid credentials → assert error notification appears.
  - Log in with valid credentials → assert session creation and redirect to `/chat`.
- [x] **Task 2.4.13: Bot and spam protection for auth endpoints** *(requires Tasks 2.4.4 and 2.4.5 completed)*  
  Integrate an invisible honeypot field and free-tier Cloudflare Turnstile challenge widget (`@marsidev/react-turnstile`) in `components/auth/BotProtection.tsx`. Wire into `app/(auth)/signup/page.tsx` and `app/(auth)/login/page.tsx`, and add server-side token verification against Cloudflare's `siteverify` API in `lib/auth/validateServerInput.ts` to block automated registration and credential stuffing spam.
- [x] **Task 2.5: Build conversation history sidebar** *(requires Tasks 2.2, 2.3, 2.4.4, and 2.4.5 completed)*  
  Create `components/chat/ChatSidebar.tsx` displaying the authenticated user's past chat threads grouped by date ("Today", "Previous 7 Days"), with inline controls to rename or delete threads.
- [x] **Task 2.6: Connect chat API and frontend to Supabase message persistence** *(requires Tasks 1.5, 2.2, and 2.5 completed)*  
  Refactor `app/api/chat/route.ts` and `components/chat/ChatContainer.tsx` to persist user inquiries and completed assistant replies to the `messages` table when a session is authenticated, while maintaining anonymous in-memory fallback for guests.
- [x] **Task 2.7: Write database RLS policy unit tests (including mood_logs)** *(requires Tasks 2.2 and 5.0 completed)*  
  Create tests in `tests/db/rls.test.ts` verifying that cross-tenant read/write attempts between two distinct user UUIDs are strictly rejected by Supabase across `conversations`, `messages`, `appointments`, and `mood_logs`. Specifically assert that non-admin User A cannot read or write User B's `mood_logs`, while users with `profiles.role = 'admin'` hold authorized read override.
- [x] **Task 2.8: Forgot password & reset password flow** *(requires Task 2.3 completed)*  
  Build password recovery pages `app/(auth)/forgot-password/page.tsx` and `app/(auth)/reset-password/page.tsx` using Supabase Auth `resetPasswordForEmail` and `updateUser` methods, handling recovery link redirect tokens and security validations.
- [x] **Task 2.9: Guest-to-authenticated session migration** *(requires Tasks 2.4.4, 2.4.5, and 2.6 completed)*  
  Create a migration utility in `lib/supabase/syncGuestSession.ts` that detects in-memory/guest chat history when a user completes login/signup and automatically commits that active conversation to the Supabase `conversations` and `messages` tables under their new `user_id`, clearing temporary local state.
- [x] **Task 2.10: User profile & data settings page** *(requires Tasks 2.2 and 2.4.5 completed)*  
  Build `app/(dashboard)/settings/page.tsx` allowing authenticated users to update their profile name, change passwords, and permanently delete their account and associated health conversation history in compliance with healthcare data minimization principles.
- [x] **Task 2.11: Profile role schema & admin RLS override policies** *(requires Tasks 2.1 and 2.2 completed)*  
  Update `profiles` table to add `role text default 'user' check (role in ('user', 'admin'))`. Create SQL migration `supabase/migrations/06_admin_roles_rls.sql` adding administrator override `SELECT` policies across `conversations`, `messages`, `appointments`, and `mood_logs` to allow system administrators to view cross-user records.
- [x] **Task 2.12: Server role validation & admin route middleware protection** *(requires Tasks 2.11 and 2.4.10 completed)*  
  Build `lib/auth/requireRole.ts` to inspect user profile role on the server, and update `middleware.ts` to block non-admin users from accessing any `/admin/*` routes with a 403 Forbidden redirect.
- [x] **Task 2.13: Manual admin promotion CLI script** *(requires Task 2.11 completed)*  
  Create `scripts/promote_admin.ts` using the Supabase Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) to manually promote an existing user's `profiles.role` to `'admin'` by email without providing any public signup vector.

---

## Phase 3: NLP + RAG Knowledge Base

- [x] **Task 3.0: Curate and store raw medical source datasets**  
  Create folder `data/health_docs/` and add a script/task `scripts/fetch_health_docs.ts` to download public domain medical FAQs (e.g., MedQuAD subset or MedlinePlus markdown files) so `scripts/ingest_health_docs.ts` has vetted source files to read, clean, and chunk.
- [x] **Task 3.1: Enable pgvector extension and create documents table** *(requires Task 2.1 completed)*  
  Write SQL migration `supabase/migrations/03_pgvector_rag.sql` enabling the `vector` extension, creating `health_documents` table (`id uuid primary key default gen_random_uuid()`, `title text`, `content text`, `source_url text`, `embedding vector(768)`, `metadata jsonb`, `created_at timestamptz default now()`), and adding an HNSW cosine similarity index.
- [x] **Task 3.2: Implement vector search PostgreSQL function** *(requires Task 3.1 completed)*  
  Create RPC function `match_health_documents(query_embedding vector(768), match_threshold float, match_count int)` returning matched document chunks ordered by cosine similarity distance.
- [x] **Task 3.3: Build medical document ingestion and embedding script** *(requires Tasks 1.1, 3.0, and 3.1 completed)*  
  Create a CLI utility `scripts/ingest_health_docs.ts` that reads curated public health files from `data/health_docs/`, splits content into 500-token chunks with overlap, generates 768-dimensional embeddings using Gemini `text-embedding-004`, and upserts into `health_documents`.
- [x] **Task 3.4: Implement vector store query service** *(requires Tasks 3.2 and 3.3 completed)*  
  Create `lib/vectorStore.ts` with `searchSimilarDocuments(query: string, limit = 3, threshold = 0.75)` that embeds user queries via `text-embedding-004` and queries the Supabase `match_health_documents` RPC endpoint.
- [x] **Task 3.5: Build structured symptom & intent extractor** *(requires Task 1.1 completed)*  
  Create Route Handler `app/api/extract/route.ts` utilizing Gemini JSON schema/function calling to extract structured entities: `{ intent: string, symptoms: Array<{ name: string, duration: string, severity: string }>, mood: string, urgency: 'low' | 'medium' | 'emergency' }`.
- [x] **Task 3.6: Integrate RAG retrieval into streaming chat pipeline** *(requires Tasks 3.4, 3.5, and 1.2 completed)*  
  Update `app/api/chat/route.ts` to first query `searchSimilarDocuments` when health inquiries are identified, inject the retrieved knowledge passages into the Gemini prompt context, and constrain the model to cite sources.
- [x] **Task 3.7: Add citation pill components to chat UI** *(requires Tasks 1.3 and 3.6 completed)*  
  Update `components/chat/MessageBubble.tsx` to parse citation annotations and display clickable source reference badges that expand into popovers showing the retrieved document title and excerpt.
- [x] **Task 3.8: Execute vector retrieval quality benchmark** *(requires Task 3.6 completed)*  
  Run test script `tests/rag/benchmark.test.ts` evaluating top-3 document retrieval precision against 15 standardized common health questions.
- [x] **Task 3.9: Implement lightweight local entity fallback (regex/heuristic-based)** *(requires Task 3.5 completed)*  
  Add a fallback parser in `lib/nlpFallback.ts` (using lightweight regex/keyword matching or a local spaCy/WASM pipeline) to extract basic symptoms if Gemini API is rate-limited, offline, or returns a 429 status code.

---

## Phase 4: Appointment Booking

- [x] **Task 4.0: Set up Google Service Account & Calendar Delegation** *(requires Task 0.3 completed)*  
  Set up a Google Cloud Service Account with calendar access, download credentials JSON key, and add `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` to `lib/env.ts` to enable 2-legged central clinic/doctor calendar slot availability discovery and booking.
- [x] **Task 4.1: Configure Google Cloud OAuth2 & Calendar API service** *(requires Tasks 0.3 and 4.0 completed)*  
  Set up Google Cloud Console OAuth consent screen and credentials. Implement `lib/googleCalendar.ts` using `googleapis` with methods for checking free/busy calendar slots, creating calendar events with Google Meet links, and handling calendar errors.
- [x] **Task 4.2: Create appointments table in Supabase** *(requires Task 2.1 completed)*  
  Write SQL migration `supabase/migrations/04_appointments.sql` creating `appointments` (`id uuid primary key default gen_random_uuid()`, `user_id uuid references profiles(id) on delete cascade`, `doctor_id uuid references doctors(id)`, `doctor_name text`, `doctor_specialty text`, `start_time timestamptz not null`, `end_time timestamptz not null`, `status text default 'confirmed'`, `google_event_id text`, `meet_link text`, `patient_notes text`, `created_at timestamptz default now()`) with RLS policies.
- [x] **Task 4.3: Implement transactional email service with Resend** *(requires Task 0.3 completed)*  
  Install `resend` and `@react-email/components`. Implement `lib/resend.ts` and React email templates in `emails/AppointmentConfirmation.tsx` sending confirmed booking details, calendar invite link, and preparation notes.
- [x] **Task 4.4: Build appointment availability & booking API routes** *(requires Tasks 4.0, 4.1, 4.2, and 4.3 completed)*  
  - Create `app/api/appointments/availability/route.ts` to return available 30-minute booking intervals for a requested date range.  
  - Create `app/api/appointments/book/route.ts` to perform atomic booking: create Google Calendar event, store row in Supabase `appointments`, and trigger confirmation email.
- [x] **Task 4.5: Build slot picker and appointment booking modal** *(requires Task 4.4 completed)*  
  Create `components/appointment/SlotPicker.tsx` and `components/appointment/BookingModal.tsx` allowing users to select an available doctor specialty, pick a date/time slot, and input primary symptoms.
- [x] **Task 4.6: Integrate appointment booking trigger into chatbot flow** *(requires Tasks 3.5 and 4.5 completed)*  
  When the extractor in `/api/extract` detects `intent === 'appointment_booking'`, instruct the chatbot to return an interactive appointment scheduling card directly inside the chat stream.
- [x] **Task 4.7: Build user appointment management dashboard** *(requires Tasks 4.4 and 4.5 completed)*  
  Create `app/(dashboard)/appointments/page.tsx` allowing authenticated users to view upcoming appointments, join Google Meet calls, or trigger cancellation requests.
- [x] **Task 4.8: Write automated mock tests for appointment booking flow** *(requires Task 4.4 completed)*  
  Create test suite in `tests/api/appointments.test.ts` mocking Google Calendar API responses and Resend email dispatches to verify error handling and state persistence.
- [x] **Task 4.9: Doctors data model, seed data & RLS policies** *(requires Task 2.1 completed)*  
  Create a `doctors` table in Supabase (`id uuid primary key default gen_random_uuid()`, `name text not null`, `specialty text not null`, `working_hours jsonb not null`, `calendar_id text not null`, `bio text`, `avatar_url text`, `created_at timestamptz default now()`) and seed with certified healthcare provider profiles to serve as the source of truth for physician availability. Explicitly configure RLS policies: public read-only (`SELECT`) policy allowing anonymous and authenticated users to discover doctors, and strict write (`INSERT`, `UPDATE`, `DELETE`) policies restricted solely to users with `profiles.role = 'admin'`.
- [x] **Task 4.10: Appointment cancellation & status webhook/API** *(requires Tasks 4.2, 4.3, and 4.4 completed)*  
  Implement route handlers `app/api/appointments/cancel/route.ts` and `app/api/appointments/reschedule/route.ts` to update Supabase appointment status to `cancelled`, delete/modify the Google Calendar event, free up calendar slots, and dispatch cancellation/rescheduling confirmation emails via Resend.
- [x] **Task 4.11: Appointment reminder cron job** *(requires Tasks 4.2 and 4.3 completed)*  
  Set up a scheduled cron job using Vercel Cron (`vercel.json`) invoking `app/api/cron/reminders/route.ts` (secured with `CRON_SECRET`) or Supabase `pg_cron` to query appointments starting in the next 24 hours and dispatch reminder emails via Resend.
- [x] **Task 4.12: Timezone handling across booking flow** *(requires Tasks 4.4 and 4.5 completed)*  
  Implement timezone handling utilities in `lib/timezone.ts` (using `date-fns-tz` or `Intl.DateTimeFormat`) to detect patient browser timezone, correctly convert doctor availability into the patient's local timezone in `SlotPicker.tsx`, and accurately record UTC ISO timestamps with appropriate timezone offsets in Google Calendar events.
- [x] **Task 4.13: Admin dashboard shell & navigation layout** *(requires Tasks 0.2 and 2.12 completed)*  
  Build `app/(admin)/admin/layout.tsx` featuring an admin navigation sidebar, role verification guard, responsive mobile drawer, and breadcrumb header linking to Doctor Management, All Appointments, and Crisis Logs.
- [x] **Task 4.14: Doctors management CRUD interface** *(requires Tasks 4.9 and 4.13 completed)*  
  Create `app/(admin)/admin/doctors/page.tsx` providing a full CRUD UI allowing administrators to view, create, edit, and deactivate physician profiles, configure working hours (JSON), assign specialties, and connect Google Calendar IDs (replacing manual seed-only approaches).
- [x] **Task 4.15: System-wide appointment administration view** *(requires Tasks 4.2, 2.11, and 4.13 completed)*  
  Create `app/(admin)/admin/appointments/page.tsx` displaying all patient bookings across the entire system, with search and filtering by doctor, date range, and status (confirmed, cancelled, completed), plus manual cancellation override controls.

---

## Phase 5: Mental Wellness Module

- [x] **Task 5.0: Create mood_logs database migration** *(requires Task 2.1 completed)*  
  Write SQL migration `supabase/migrations/05_mood_logs.sql` defining `mood_logs` (`id uuid primary key default gen_random_uuid()`, `user_id uuid references profiles(id) on delete cascade`, `sentiment text`, `mood text`, `intensity int`, `notes text`, `created_at timestamptz default now()`) with RLS policies so users can track their emotional history over time.
- [x] **Task 5.1: Extend sentiment & mood classification engine** *(requires Task 3.5 completed)*  
  Refine extraction prompt in `app/api/extract/route.ts` to output sentiment polarity (`positive`, `neutral`, `negative`), specific mood states (`anxious`, `depressed`, `stressed`, `overwhelmed`, `calm`), and intensity rating (1–5).
- [x] **Task 5.2: Implement empathetic dialogue prompt adjustments** *(requires Tasks 1.1 and 5.1 completed)*  
  Update `lib/gemini.ts` to dynamically inject supportive behavioral counseling guidelines (active listening, validation, non-judgmental tone) when moderate or elevated stress/anxiety is detected.
- [x] **Task 5.3: Build clinical crisis and self-harm detection gate** *(requires Task 1.1 completed)*  
  Create `lib/safety.ts` implementing a multi-layered safety detector (keyword heuristics + high-priority Gemini safety filter) that intercepts expressions of self-harm, suicidal ideation, or severe clinical emergencies.
- [x] **Task 5.4: Create emergency crisis intervention UI component** *(requires Task 5.3 completed)*  
  Build `components/chat/CrisisBanner.tsx` that replaces regular conversation with an unclosable, high-contrast emergency card providing immediate contact buttons for **988 Suicide & Crisis Lifeline**, **Crisis Text Line (HOME to 741741)**, and **911/112**.
- [x] **Task 5.5: Build interactive breathing & grounding micro-tools** *(requires Task 0.2 completed)*  
  Create interactive wellness widgets:
  - `components/wellness/BreathingExercise.tsx`: An animated visual circle guiding 4-7-8 and box breathing patterns with audio chime toggle.
  - `components/wellness/GroundingWidget.tsx`: An interactive 5-4-3-2-1 sensory grounding checklist for acute stress de-escalation.
- [x] **Task 5.6: Build mood indicator & wellness action drawer** *(requires Tasks 5.1 and 5.5 completed)*  
  Create `components/chat/SentimentIndicator.tsx` displaying a subtle emotional wellness badge above the chat box with one-click access to the breathing and grounding exercises.
- [x] **Task 5.7: Write safety protocol test suite** *(requires Tasks 5.3 and 5.4 completed)*  
  Create `tests/safety/crisis.test.ts` verifying that suicidal or self-harm prompts 100% reliably trigger crisis interventions and suppress generic conversational generation.
- [x] **Task 5.8: Intercept crisis checks in server chat pipeline** *(requires Tasks 1.2, 5.3, and 5.4 completed)*  
  Update `app/api/chat/route.ts` to run `lib/safety.ts` before invoking Gemini. If severe crisis/self-harm triggers are hit, halt LLM generation immediately and stream back a structured `CRISIS_TRIGGERED` payload to trigger the `CrisisBanner` on the client.
- [x] **Task 5.9: Crisis incident logging & admin review panel** *(requires Tasks 5.8 and 4.13 completed)*  
  Write SQL migration `supabase/migrations/07_crisis_logs.sql` defining `crisis_logs` (`id uuid primary key default gen_random_uuid()`, `user_id uuid references profiles(id) on delete set null`, `trigger_text text not null`, `detected_severity text not null`, `reviewed boolean default false`, `reviewer_notes text`, `created_at timestamptz default now()`). Update `app/api/chat/route.ts` to log an incident whenever a crisis payload triggers, and build `app/(admin)/admin/crisis-logs/page.tsx` allowing administrators to inspect flagged messages, document clinician follow-ups, and maintain a compliance audit trail.

---

## Phase 6: Security & Polish

- [x] **Task 6.1: Implement API rate limiting on public endpoints** *(requires Tasks 1.2, 3.5, and 4.4 completed)*  
  Configure rate limiting using `@upstash/ratelimit` or an in-memory sliding window algorithm on `/api/chat`, `/api/extract`, and `/api/appointments` to safeguard free-tier API quotas.
- [x] **Task 6.2: Implement prompt injection & input sanitization filters** *(requires Task 1.1 completed)*  
  Create `lib/sanitizer.ts` to strip markdown injection, delimit user prompts from system instructions, and reject known prompt leakage vectors.
- [x] **Task 6.3: Comprehensive security audit of Supabase RLS & API keys** *(requires Tasks 2.2 and 4.2 completed)*  
  Audit client bundle to confirm zero leaks of `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY`. Verify that anonymous requests cannot query user IDs or write directly to vector collections.
- [x] **Task 6.4: Implement chat history export feature** *(requires Tasks 2.5 and 2.6 completed)*  
  Create `components/chat/ExportSummaryModal.tsx` allowing users to export their conversational health transcripts and symptom logs as a formatted Markdown or JSON summary for their personal records.
- [x] **Task 6.5: Implement dark/light theme switching & accessibility (a11y) audit** *(requires Task 0.2 completed)*  
  Install `next-themes`, build `components/ui/ThemeToggle.tsx`, verify WCAG 2.1 AA color contrast compliance across light/dark themes, and ensure keyboard navigation works across all modals and inputs.
- [x] **Task 6.6: Performance optimization & dynamic bundle code splitting** *(requires Tasks 4.5 and 5.5 completed)*  
  Apply `next/dynamic` lazy loading to heavy client components (`SlotPicker`, `BreathingExercise`, `BookingModal`) and configure responsive image/font optimization to achieve Lighthouse score $> 90$.
- [x] **Task 6.7: Integrate Sentry error tracking & logging** *(requires Task 0.3 completed)*  
  Install `@sentry/nextjs` and configure `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts` to capture API errors, LLM timeouts, and client unhandled exceptions across all execution tiers.
- [x] **Task 6.8: Next.js error and loading boundary pages** *(requires Task 0.2 completed)*  
  Implement `app/error.tsx`, `app/not-found.tsx`, and `app/loading.tsx` to provide graceful error fallbacks, recovery actions ("Try Again"), 404 navigation, and skeleton loaders.
- [x] **Task 6.9: SEO metadata, favicon, and PWA web app manifest** *(requires Task 0.2 completed)*  
  Configure dynamic OpenGraph (OG) tags, Twitter cards, and structured metadata in `app/layout.tsx`, together with `public/favicon.ico`, Apple touch icons, and `public/manifest.json`.
- [x] **Task 6.10: Privacy Policy & Terms of Service pages** *(requires Task 0.2 completed)*  
  Author and publish `app/privacy/page.tsx` and `app/terms/page.tsx` clearly detailing non-diagnostic liability disclaimers, data minimization policies, Supabase storage practices, and user data deletion rights.
- [x] **Task 6.11: AI response feedback mechanism** *(requires Tasks 1.3 and 2.1 completed)*  
  Add thumbs up/down feedback buttons to `components/chat/MessageBubble.tsx` that log user ratings and optional qualitative feedback to a Supabase `message_feedback` table for RAG response quality evaluation.
- [x] **Task 6.12: Free-tier API quota & usage monitoring** *(requires Tasks 1.2, 3.4, and 4.3 completed)*  
  Add structured server-side usage telemetry logging Gemini API call counts, estimated token usage, Supabase storage utilization, and Resend email dispatch counts to preemptively detect free-tier limit thresholds.
- [x] **Task 6.13: Field-level encryption for sensitive clinical notes** *(requires Tasks 4.2 and 5.0 completed)*  
  Implement field-level encryption for free-text clinical notes (`mood_logs.notes` and `appointments.patient_notes`) using PostgreSQL `pgcrypto` (`pgp_sym_encrypt` / `pgp_sym_decrypt`) in `supabase/migrations/08_field_encryption.sql` or server-side AES-256-GCM in `lib/encryption.ts` using `CLINICAL_ENCRYPTION_KEY`, ensuring patient disclosures are encrypted at rest before database insertion.

---

## Phase 7: Testing & Deployment

- [x] **Task 7.0: Create database teardown & seed test script** *(requires Tasks 2.1, 3.1, and 4.2 completed)*  
  Add script `scripts/seed_test_db.ts` to wipe and re-seed Supabase local/preview instances with sample test users, pre-booked appointments, and document embeddings to ensure automated Playwright and integration tests run predictably.
- [x] **Task 7.1: Set up Vitest/Jest unit & component testing suite** *(requires Tasks 1.1, 3.4, and 6.2 completed)*  
  Configure testing environment (Vitest, React Testing Library, MSW for API mocking) and write unit tests for `lib/gemini.ts`, `lib/vectorStore.ts`, and `lib/sanitizer.ts`.
- [x] **Task 7.2: Build end-to-end (E2E) testing suite with Playwright** *(requires Tasks 1.7, 2.4.4, 2.4.5, and 4.6 completed)*  
  Create Playwright test specs in `e2e/chat-flow.spec.ts` covering: disclaimer acceptance, symptom inquiry submission, streaming response validation, and opening the appointment booking modal.
- [x] **Task 7.3: Deploy and configure production Supabase database** *(requires Tasks 2.1, 3.1, and 4.2 completed)*  
  Execute all production migrations against hosted Supabase instance, run `scripts/ingest_health_docs.ts` to index foundational medical knowledge, and verify pgvector search latency ($< 150\text{ ms}$).
- [x] **Task 7.4: Configure production Vercel deployment** *(requires Tasks 0.3 and 0.5 completed)*  
  Link repository to Vercel, populate production environment variables, configure Edge function memory/regions, and verify build passing on preview branch.
- [x] **Task 7.5: Finalize CD pipeline in GitHub Actions** *(requires Tasks 0.5 and 7.1 completed)*  
  Extend `.github/workflows/ci.yml` into a full CI/CD deployment pipeline that blocks deployment if unit tests, type-checking, or linting checks fail.
- [x] **Task 7.6: Perform production smoke testing & quota verification** *(requires Tasks 7.3 and 7.4 completed)*  
  Perform comprehensive production smoke test: authenticate test account, execute streaming RAG query, trigger calendar appointment booking, receive Resend confirmation email, and verify free-tier resource consumption.
- [x] **Task 7.7: Dedicated health check endpoint** *(requires Task 0.3 completed)*  
  Create `app/api/health/route.ts` verifying database connectivity, Gemini API reachability, and uptime statistics, suitable for external status probes (e.g., BetterStack, UptimeRobot).
- [x] **Task 7.8: Cross-browser & mobile viewport responsiveness testing** *(requires Tasks 1.7 and 6.5 completed)*  
  Conduct systematic testing pass verifying UI layout, touch interactions, speech recognition, and modal responsiveness across iOS Safari, Android Chrome, desktop Safari, Firefox, and Chromium.
- [x] **Task 7.9: Docker containerization for local parity & alternative deployment** *(requires Task 0.1 completed)*  
  Add multi-stage `Dockerfile` and `docker-compose.yml` defining production-grade standalone Next.js container build with node Alpine base image for local development parity and containerized hosting.
- [x] **Task 7.10: Finalize project documentation suite** *(requires Tasks 7.4 and 7.6 completed)*  
  Synchronize `README.md`, `requirements.md`, and generate `design.md` architecture diagrams reflecting the final production implementation, environment variables, and live demo links.
