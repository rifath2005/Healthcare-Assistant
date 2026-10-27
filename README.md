# 🩺 Smart Healthcare Assistant

> An AI-powered conversational healthcare companion delivering grounded wellness guidance, voice-enabled interactions, real-time symptom analysis, empathetic mental health support, and automated calendar scheduling.

---

[![CI/CD Build](https://img.shields.io/badge/build-passing-brightgreen?style=flat-square&logo=githubactions)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14%2F15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-1.5%20Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![Sentry](https://img.shields.io/badge/Sentry-Monitoring-362D59?style=flat-square&logo=sentry)](https://sentry.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

---

## 📌 Overview

**Smart Healthcare Assistant** is an intelligent, voice-enabled web platform designed to provide instant, trustworthy health information and wellness guidance. Utilizing Retrieval-Augmented Generation (RAG) powered by Google's Gemini models and Supabase `pgvector`, the system answers health queries backed by curated medical knowledge, extracts symptoms and emotional sentiment in real time, and facilitates seamless appointment scheduling with Google Calendar. Built with strict data privacy, local offline fallbacks, and full-stack observability, the entire platform runs cost-effectively within free-tier cloud infrastructure.

---

## ✨ Features

* **🧠 AI Health Q&A Chatbot (RAG):** Context-aware health and wellness answers synthesized from curated medical guidelines using Supabase `pgvector` similarity search and Gemini generative models, complete with source citations.
* **🎙️ Voice Input (Speech-to-Text):** Hands-free voice dictation powered by the browser-native Web Speech API with live microphone pulse visualizers and browser fallback support.
* **🔍 Structured Symptom & Intent Extraction:** Entity recognition that extracts reported symptoms, duration, severity, and user intent into structured JSON payloads, backed by a local offline regex parser (`lib/nlpFallback.ts`) for rate-limited scenarios.
* **📅 Physician Directory & Calendar Scheduling:** Certified doctor directory (`doctors` table), timezone-aware slot pickers, and automated Google Calendar scheduling via Google Cloud Service Account delegation with Google Meet links.
* **📨 Transactional Emails & Automated Reminders:** Instant booking confirmations, cancellation alerts, and automated 24-hour appointment reminder emails dispatched via Resend and Vercel Cron.
* **💚 Empathetic Mental Wellness & Interactive Tools:** Sentiment-aware dialogue adapting tone dynamically to assist with stress and anxiety, accompanied by an interactive 4-7-8 breathing circle and 5-4-3-2-1 sensory grounding tools.
* **🚨 Pre-Execution Crisis Intervention:** Multi-layered safety classifier that intercepts chat requests before LLM invocation, immediately suppressing generative responses to display emergency hotline resources (988 Lifeline, Crisis Text Line).
* **🔒 Enterprise-Grade Auth & Data Privacy:** Supabase Authentication with comprehensive Zod form validation (`react-hook-form`), password reset flows, in-memory guest session migration, and PostgreSQL Row-Level Security (RLS).
* **🛡️ Admin Supervision & Crisis Review Panel:** Dedicated `/admin` dashboard shell protected by server RBAC guards (`lib/auth/requireRole.ts`). Enables healthcare administrators to manage physician profiles (CRUD), supervise system-wide patient bookings, and audit crisis-flagged safety events.
* **📈 Observability & Quota Telemetry:** Full-stack error monitoring via Sentry, dedicated uptime health probes (`/api/health`), and server-side telemetry tracking free-tier API quotas.

---

## 🛠️ Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js](https://nextjs.org/) 14/15 (TypeScript) | App Router, Server Components, Streaming UI, Error Boundaries |
| **Styling & Icons** | [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons | Responsive, accessible healthcare design system and theme toggle |
| **Form Management** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) | Client and server-side schema validation, live password strength meter |
| **AI / LLM & Embeddings** | [Google Gemini API](https://ai.google.dev/) | Generative answers (`gemini-1.5-flash`), embeddings (`text-embedding-004`) |
| **Speech Processing** | [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | Browser-native client-side speech-to-text input |
| **Database & Vector Store** | [Supabase](https://supabase.com/) (Postgres + `pgvector`) | Relational tables (`profiles`, `conversations`, `doctors`, `mood_logs`), RLS |
| **Calendar Integration** | [Google Calendar API](https://developers.google.com/calendar) | 2-legged Service Account scheduling, slot discovery, Google Meet |
| **Email & Cron** | [Resend](https://resend.com/) + Vercel Cron | Transactional emails and scheduled 24-hour reminder jobs |
| **Observability** | [Sentry](https://sentry.io/) | Full-stack exception tracking, latency monitoring, and breadcrumbs |
| **Containerization** | [Docker](https://www.docker.com/) + Docker Compose | Standalone multi-stage container build for local dev and hosting |
| **Hosting & CI/CD** | [Vercel](https://vercel.com/) + GitHub Actions | Serverless Edge network deployment and automated test workflows |

---

## 📐 Architecture Diagram

```
+---------------------------------------------------------------------------------+
|                                   User Browser                                  |
|         (Next.js App Router UI + Tailwind CSS + Lucide Icons + Sonner)          |
|                                                                                 |
|   [Text / Voice Input (Web Speech API)]    [Interactive Breathing / Grounding]  |
+----------------------------------------+----------------------------------------+
                                         |
                                         | HTTPS / Server Actions & Route Handlers
                                         v
+----------------------------------------+----------------------------------------+
|                       Next.js Serverless Backend                                |
|                                                                                 |
|  +------------------------+  +------------------------+  +-------------------+  |
|  | Server Validation Guard|  | Pre-Execution Crisis   |  | Local NLP         |  |
|  | (Zod Auth & Payloads)  |  | Interceptor (lib/safe) |  | Fallback (Regex)  |  |
|  +------------------------+  +-----------+------------+  +-------------------+  |
|                                          |                                      |
|  +------------------------+  +-----------+------------+  +-------------------+  |
|  | Intent & Mood Extractor|  | RAG Orchestrator       |  | Doctor Booking &  |  |
|  | (JSON Schema Mode)     |  | (pgvector Retrieval)   |  | Reminder Handler  |  |
|  +-----------+------------+  +-----------+------------+  +---------+---------+  |
+--------------|---------------------------|-------------------------|------------+
               |                           |                         |
               | Embeddings & Queries      | Embeddings              |
               v                           v                         |
+--------------+---------------------------+------------+            |
|                   Google Gemini API                   |            |
|   - text-embedding-004 (768-dim Vector Embeddings)    |            |
|   - gemini-1.5-flash (Inference, Tone, Extraction)    |            |
+-------------------------------------------------------+            |
               ^                                                     |
               | Cosine Similarity (match_health_documents)          |
               v                                                     |
+-------------------------------------------------------+            |
|                   Supabase Cloud                      |            |
|   - PostgreSQL with pgvector (Curated Medical Docs)   |            |
|   - Supabase Auth (JWT Management & Password Reset)   |            |
|   - Tables: profiles, conversations, messages,        |            |
|     doctors, appointments, mood_logs, feedback        |            |
|   - Multi-Tenant Row Level Security (RLS) Policies    |            |
+-------------------------------------------------------+            |
                                                                     |
               +-----------------------------------------------------+
               |
               +------------------------+----------------------------+
                                        |                            |
                                        v                            v
                        +---------------+------------+ +-------------+------------+
                        | Google Service Account     | | Resend + Vercel Cron     |
                        | (Google Calendar API v3)   | | - Booking Confirmations  |
                        | - Central Clinic Calendar  | | - 24h Reminder Cron Job  |
                        | - Free/Busy Slot Check     | | - Cancellation Notices   |
                        | - Event Creation with Meet | |                          |
                        +---------------+------------+ +-------------+------------+
                                        |                            |
                                        +--------------+-------------+
                                                       |
                                                       v
                                        +--------------+-------------+
                                        | Sentry & Quota Monitoring  |
                                        | - Full-stack Error Capture |
                                        | - Health Check (/api/health|
                                        | - Free-Tier Token Telemetry|
                                        +----------------------------+
```

---

## 🚀 Getting Started

Follow these steps to set up and run the Smart Healthcare Assistant locally.

### Prerequisites

* [Node.js](https://nodejs.org/) (v18.17.0 or higher)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
* [Docker](https://www.docker.com/) & Docker Compose *(optional, for containerized run)*
* A free [Supabase](https://supabase.com/) project
* A [Google AI Studio](https://aistudio.google.com/) Gemini API Key
* A [Google Cloud Console](https://console.cloud.google.com/) Service Account with Calendar API enabled
* A free [Resend](https://resend.com/) API Key
* A [Sentry](https://sentry.io/) account *(optional, for error monitoring)*

---

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/smart-healthcare-assistant.git
   cd smart-healthcare-assistant
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create `.env.local` by copying the template:
   ```bash
   cp .env.example .env.local
   ```

4. **Populate `.env.local` with Required Keys:**
   ```ini
   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key_here

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

   # Google Cloud Service Account (Central Calendar Scheduling)
   GOOGLE_SERVICE_ACCOUNT_EMAIL=healthcare-assistant@your-project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_CALENDAR_ID=primary

   # Google OAuth (Optional user calendar integration)
   GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id_here
   GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret_here

   # Resend Email Service & Reminders
   RESEND_API_KEY=your_resend_api_key_here
   EMAIL_FROM=appointments@yourdomain.com
   CRON_SECRET=your_secure_cron_secret_here

   # Sentry Observability (Optional)
   NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
   SENTRY_AUTH_TOKEN=your_sentry_auth_token_here

   # Clinical Data Encryption (pgcrypto / AES-256)
   CLINICAL_ENCRYPTION_KEY=your_32_character_encryption_key_here

   # Cloudflare Turnstile Bot Protection (Optional)
   NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
   CLOUDFLARE_TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Initialize Database Schema & Knowledge Base:**
   Execute migrations in your Supabase SQL Editor:
   ```bash
   # Run initial schema, RLS, pgvector, doctors, and mood_logs
   # Files located in supabase/migrations/
   ```
   Fetch and ingest curated medical documents:
   ```bash
   npm run docs:fetch   # Downloads curated public health datasets
   npm run docs:ingest  # Chunks and embeds vectors into pgvector
   ```

---

### Running Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

### Running with Docker

You can also run the entire application in a containerized environment:

```bash
# Build and run with Docker Compose
docker compose up --build
```

The containerized app will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

```text
smart-healthcare-assistant/
├── app/
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx             # Admin dashboard sidebar & RBAC guard
│   │       ├── doctors/page.tsx       # Doctors management CRUD view
│   │       ├── appointments/page.tsx  # System-wide patient bookings view
│   │       └── crisis-logs/page.tsx   # Crisis safety review & clinician audit log
│   ├── (auth)/
│   │   ├── login/page.tsx             # Supabase login with Zod validation
│   │   ├── signup/page.tsx            # Signup view with password strength meter
│   │   ├── forgot-password/page.tsx   # Password reset request view
│   │   ├── reset-password/page.tsx    # Password reset update view
│   │   └── verify-email/page.tsx      # Email verification confirmation screen
│   ├── (dashboard)/
│   │   ├── appointments/page.tsx      # Patient consultation management dashboard
│   │   ├── settings/page.tsx          # Profile & GDPR account data deletion
│   │   └── chat/page.tsx              # Main conversational interface
│   ├── api/
│   │   ├── chat/route.ts              # Gemini streaming, RAG & pre-crisis safety gate
│   │   ├── extract/route.ts           # Symptom, intent, and mood extractor
│   │   ├── appointments/
│   │   │   ├── availability/route.ts  # Doctor slot discovery endpoint
│   │   │   ├── book/route.ts          # Atomic booking & calendar sync
│   │   │   ├── cancel/route.ts        # Appointment cancellation endpoint
│   │   │   └── reschedule/route.ts    # Appointment rescheduling endpoint
│   │   ├── cron/
│   │   │   └── reminders/route.ts     # 24-hour reminder email dispatch cron
│   │   ├── auth/
│   │   │   ├── callback/route.ts      # OAuth exchange callback
│   │   │   └── resend-verification/   # Resend verification email route
│   │   └── health/route.ts            # System uptime & connectivity health probe
│   ├── error.tsx                      # Global Next.js error recovery boundary
│   ├── not-found.tsx                  # Custom 404 page
│   ├── loading.tsx                    # Top-level route skeleton loader
│   ├── privacy/page.tsx               # Dedicated Privacy Policy
│   ├── terms/page.tsx                 # Dedicated Terms of Service
│   ├── layout.tsx                     # Root layout, theme provider, metadata
│   └── page.tsx                       # Landing page with medical disclaimer
├── components/
│   ├── chat/
│   │   ├── ChatContainer.tsx          # Chat thread controller & stream reader
│   │   ├── ChatInput.tsx              # Input with auto-resize & speech toggle
│   │   ├── VoiceInputButton.tsx       # Web Speech API speech-to-text module
│   │   ├── MessageBubble.tsx          # Markdown, citations, feedback buttons
│   │   ├── CrisisBanner.tsx           # Unclosable 988 emergency hotline banner
│   │   └── SentimentIndicator.tsx     # Dynamic mood pill & wellness trigger
│   ├── appointment/
│   │   ├── BookingModal.tsx           # Booking dialogue with doctor specialties
│   │   └── SlotPicker.tsx             # Timezone-aware date & time picker
│   ├── wellness/
│   │   ├── BreathingExercise.tsx      # Interactive 4-7-8 & box breathing visualizer
│   │   └── GroundingWidget.tsx        # Interactive 5-4-3-2-1 sensory checklist
│   ├── auth/
│   │   ├── GoogleAuthButton.tsx       # Google OAuth sign-in trigger
│   │   └── BotProtection.tsx          # Honeypot & Cloudflare Turnstile challenge
│   └── ui/                            # FormField, PasswordInput, Toast, Modals
├── data/
│   └── health_docs/                   # Curated raw medical FAQs (MedQuAD/MedlinePlus)
├── lib/
│   ├── gemini.ts                      # Gemini SDK initialization & system prompts
│   ├── vectorStore.ts                 # pgvector similarity search utilities
│   ├── googleCalendar.ts              # Service Account Calendar API wrapper
│   ├── resend.ts                      # Resend email client & dispatch helpers
│   ├── safety.ts                      # Crisis & self-harm pre-execution filter
│   ├── nlpFallback.ts                 # Offline regex symptom & intent fallback
│   ├── timezone.ts                    # Patient/doctor timezone conversion utilities
│   ├── sanitizer.ts                   # Prompt injection & XSS sanitization
│   ├── encryption.ts                  # AES-256-GCM / pgcrypto clinical notes encryption
│   ├── auth/
│   │   └── requireRole.ts             # Server-side RBAC role verification guard
│   └── validations/
│       └── auth.ts                    # Zod schemas for signup & login
├── scripts/
│   ├── fetch_health_docs.ts           # Script to download open health FAQs
│   ├── ingest_health_docs.ts          # Embedding ingestion into pgvector
│   ├── promote_admin.ts               # CLI script to grant admin roles
│   └── seed_test_db.ts                # Test database wipe & deterministic seed
├── supabase/
│   └── migrations/                    # SQL migrations (01 through 08)
├── e2e/                               # Playwright test specs
├── sentry.client.config.ts            # Sentry client exception monitoring
├── sentry.server.config.ts            # Sentry server-side exception monitoring
├── sentry.edge.config.ts              # Sentry edge exception monitoring
├── Dockerfile                         # Production multi-stage Alpine Docker build
├── docker-compose.yml                 # Local development container orchestration
├── requirements.md                    # Detailed Software Requirements Specification
├── tasks.md                           # Comprehensive engineering roadmap (60+ tasks)
├── OVERVIEW.md                        # Developer architecture & system overview guide
├── package.json                       # Dependencies and build scripts
└── tsconfig.json                      # Strict TypeScript configuration
```

---

## 💡 Usage

1. **Acknowledge Disclaimer:** Review and confirm the non-diagnostic wellness disclaimer upon first visit (persisted to `localStorage` and synchronized with user account).
2. **Text or Voice Inquiries:** Ask health questions via text or click the microphone button to dictate questions using speech-to-text.
3. **Evidence-Based Answers & Citations:** Read grounded AI summaries with interactive source pills linking to verified medical literature.
4. **Sentiment & Mental Wellness:** When distress or anxiety is detected, engage with guided 4-7-8 breathing exercises or 5-4-3-2-1 grounding routines.
5. **Schedule Consultations:** Seamlessly check doctor availability and schedule appointments. Receive calendar invites with Google Meet links and automated 24-hour email reminders.

### Interface Preview

```
+------------------------------------------------------------------+
|  🩺 Smart Healthcare Assistant                [👤 Logged In] [🌙] |
+------------------------------------------------------------------+
| 🤖 Assistant: Hello! How can I support your wellness today?      |
|                                                                  |
| 👤 You: [🎙️ Audio: "I've been feeling overwhelmed and stressed"]  |
|                                                                  |
| 🤖 Assistant: I hear you. Feeling overwhelmed can be really      |
|   draining. Let's take a slow moment together.                   |
|   [Mood: Stressed / Mild Anxiety (Intensity: 3/5)]               |
|                                                                  |
|   Would you like to try a quick 4-7-8 breathing exercise?        |
|   [🌿 Start Breathing Exercise] [📝 5-4-3-2-1 Grounding]         |
|                                                                  |
|   [📅 Book a Consultation with a Wellness Doctor] [Sources (2)]  |
+------------------------------------------------------------------+
| [ Type a symptom or health query...              ] [🎙️] [Send 🚀] |
+------------------------------------------------------------------+
```

---

## 🗺️ Roadmap

- [ ] **SMS Reminders & Updates:** Twilio integration for instant SMS appointment notifications.
- [ ] **Multi-Language Support:** Real-time localized translation for Spanish, Hindi, French, and Mandarin.
- [ ] **EHR / FHIR Clinical Interoperability:** HL7/FHIR compliant export bridge for hospital Electronic Health Record systems.
- [ ] **Wearable Health Integration:** Sync passive biometric indicators (resting heart rate, sleep duration) via Apple HealthKit and Google Health Connect.

---

## ⚠️ Medical Disclaimer

> **IMPORTANT:** Smart Healthcare Assistant is an artificial intelligence prototype built strictly for informational, educational, and wellness support purposes. **It is NOT a certified medical diagnostic tool and does NOT provide medical diagnosis, treatment, or clinical prescriptions.**  
>  
> Always seek the advice of a qualified physician or healthcare provider with any questions you may have regarding a medical condition. **If you believe you are experiencing a medical emergency, immediately call your local emergency service (e.g., 911 in the US, 112 in the EU) or contact the 988 Suicide & Crisis Lifeline.**

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the Project repository.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'feat: Add AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👨‍💻 Author & Contact

* **Project Lead:** Nabeel
* **GitHub:** [@your-username](https://github.com/your-username)
* **Project Repository:** [Smart Healthcare Assistant](https://github.com/your-username/smart-healthcare-assistant)
# Healthcare-Assistant
