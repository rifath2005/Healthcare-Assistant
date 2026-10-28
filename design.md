# 📐 System Design & Architecture Specification
## Smart Healthcare Assistant using Conversational AI

**Document Version:** 1.0.0  
**Status:** Approved & Implemented  
**Author:** Senior Full-Stack Software Engineer  

---

## 1. High-Level Architectural Topology

The **Smart Healthcare Assistant** follows a decoupled, privacy-first, serverless App Router architecture built on Next.js 14/15, Supabase, Google Cloud, and Google Gemini:

```mermaid
graph TD
    subgraph Client Tier ["Client Tier (Browser & PWA)"]
        UI["Next.js App Router (Tailwind + Lucide)"]
        STT["Web Speech API (Browser Native STT)"]
        Tools["Wellness Tools (4-7-8 Breathing & Grounding)"]
        State["Guest Session / JWT Session State"]
    end

    subgraph Security Gate ["Edge & Pre-Execution Safety Tier"]
        Middleware["Next.js Middleware (RBAC & Route Guards)"]
        Sanitizer["Prompt Sanitizer & Injection Filter (lib/sanitizer.ts)"]
        Safety["Deterministic Crisis Gate (lib/safety.ts)"]
        RateLimit["Sliding Window Rate Limiter (lib/ratelimit.ts)"]
    end

    subgraph Serverless Backend ["Next.js Serverless Execution Tier"]
        ChatAPI["/api/chat (Streaming SSE Engine)"]
        ExtractAPI["/api/extract (JSON Schema Mode + Fallback)"]
        ApptAPI["/api/appointments (Atomic Booking & Availability)"]
        CronAPI["/api/cron/reminders (24h Automated Reminders)"]
        HealthAPI["/api/health (Probes & Quota Telemetry)"]
    end

    subgraph External Cloud Services ["Cloud Services & Database"]
        Gemini["Google Gemini (1.5 Flash + text-embedding-004)"]
        SupabaseDB["Supabase (Postgres 15 + pgvector + RLS)"]
        GoogleCal["Google Calendar API (Service Account v3)"]
        Resend["Resend Transactional Email"]
        Sentry["Sentry Error APM"]
    end

    UI --> Middleware
    Middleware --> Sanitizer
    Sanitizer --> Safety
    Safety -- "Safe Request" --> RateLimit
    RateLimit --> ChatAPI
    RateLimit --> ExtractAPI
    RateLimit --> ApptAPI
    
    Safety -- "Crisis Triggered" --> SupabaseDB
    
    ChatAPI --> Gemini
    ChatAPI --> SupabaseDB
    ExtractAPI --> Gemini
    ApptAPI --> GoogleCal
    ApptAPI --> Resend
    ApptAPI --> SupabaseDB
    CronAPI --> SupabaseDB
    CronAPI --> Resend
    HealthAPI --> Sentry
```

---

## 2. Sequence Workflows

### 2.1 RAG-Augmented Streaming Chat Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Browser
    participant API as /api/chat
    participant Safety as lib/safety.ts
    participant Vector as lib/vectorStore.ts
    participant Gemini as Gemini 1.5 Flash
    participant DB as Supabase DB

    Patient->>API: POST /api/chat { message: "What causes tension headaches?" }
    API->>Safety: evaluateCrisisSafety(message)
    Safety-->>API: { isCrisis: false }
    API->>Vector: searchSimilarDocuments(message, limit=3, threshold=0.72)
    Vector-->>API: Matched CDC & MedlinePlus document passages
    API->>Gemini: Stream Chat [System Persona + Medical Context + User Turn]
    Gemini-->>API: SSE Stream Token Chunks
    API-->>Patient: data: { type: "CITATIONS", citations: [...] }
    API-->>Patient: data: { type: "TOKEN", content: "Tension headaches are..." }
    Gemini-->>API: Generation Complete
    API->>DB: Persist conversation turn to messages table
    API-->>Patient: data: { type: "DONE" }
```

### 2.2 Pre-Execution Crisis Safety Interception

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Browser
    participant API as /api/chat
    participant Safety as lib/safety.ts
    participant DB as Supabase DB

    Patient->>API: POST /api/chat { message: "I want to kill myself" }
    API->>Safety: evaluateCrisisSafety(message)
    Safety-->>API: { isCrisis: true, severity: "emergency", trigger: "kill myself" }
    API->>DB: INSERT into crisis_logs { trigger_text, severity, reviewed: false }
    Note over API,Patient: LLM invocation halted immediately
    API-->>Patient: data: { type: "CRISIS_TRIGGERED", resources: 988 Lifeline, 741741 Text }
    Patient->>Patient: Render unclosable, high-contrast CrisisBanner
```

### 2.3 Doctor Scheduling & 2-Legged Calendar Delegation

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient Browser
    participant API as /api/appointments/book
    participant DB as Supabase DB
    participant GCal as Google Calendar API (Service Account)
    participant Resend as Resend Email

    Patient->>API: POST /api/appointments/book { doctorId, slot, notes }
    API->>DB: Check slot collision
    DB-->>API: Slot free
    API->>GCal: Insert event with conferenceData (Google Meet)
    GCal-->>API: { eventId: "gcal_123", meetLink: "https://meet.google.com/..." }
    API->>API: Encrypt notes via AES-256-GCM
    API->>DB: INSERT appointments { status: 'confirmed', meet_link, patient_notes }
    API->>Resend: Send confirmation email with Google Meet link
    API-->>Patient: { success: true, meetLink: "..." }
```

---

## 3. Database Entity-Relationship (ER) Model

```mermaid
erDiagram
    PROFILES ||--o{ CONVERSATIONS : owns
    PROFILES ||--o{ APPOINTMENTS : books
    PROFILES ||--o{ MOOD_LOGS : records
    PROFILES ||--o{ CRISIS_LOGS : flags
    CONVERSATIONS ||--o{ MESSAGES : contains
    MESSAGES ||--o{ MESSAGE_FEEDBACK : evaluates
    DOCTORS ||--o{ APPOINTMENTS : conducts

    PROFILES {
        uuid id PK
        text email
        text full_name
        text role
        boolean has_accepted_disclaimer
        timestamptz created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid user_id FK
        text title
        timestamptz created_at
        timestamptz updated_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        text role
        text content
        jsonb metadata
        timestamptz created_at
    }

    DOCTORS {
        uuid id PK
        text name
        text specialty
        jsonb working_hours
        text calendar_id
        text bio
        boolean is_active
        timestamptz created_at
    }

    APPOINTMENTS {
        uuid id PK
        uuid user_id FK
        uuid doctor_id FK
        text doctor_name
        text doctor_specialty
        timestamptz start_time
        timestamptz end_time
        text status
        text google_event_id
        text meet_link
        text patient_notes
        timestamptz created_at
    }

    MOOD_LOGS {
        uuid id PK
        uuid user_id FK
        text sentiment
        text mood
        int intensity
        text notes
        timestamptz created_at
    }

    CRISIS_LOGS {
        uuid id PK
        uuid user_id FK
        text trigger_text
        text detected_severity
        boolean reviewed
        text reviewer_notes
        timestamptz created_at
    }

    HEALTH_DOCUMENTS {
        uuid id PK
        text title
        text content
        text source_url
        vector_768 embedding
        jsonb metadata
        timestamptz created_at
    }
```

---

## 4. Security & Cryptographic Blueprint

| Security Layer | Implementation Mechanism | Purpose |
| :--- | :--- | :--- |
| **Row-Level Security (RLS)** | PostgreSQL policies with `auth.uid() = user_id` | Strict cross-tenant isolation; non-admin users cannot read or modify other patients' data. |
| **Field-Level Encryption** | AES-256-GCM via `lib/encryption.ts` (`CLINICAL_ENCRYPTION_KEY`) | Clinical disclosures (`patient_notes`, `mood_logs.notes`) encrypted before DB insert. |
| **Prompt Injection Defense** | Delimiter isolation + regex detection in `lib/sanitizer.ts` | Neutralizes jailbreaking, prompt leakage, and script execution. |
| **Pre-Execution Safety Gate** | Regex & heuristic evaluation in `lib/safety.ts` | Intercepts suicidal distress before LLM invocation, suppressing generative hallucinations. |
| **Anti-Spam & Bot Challenge** | Honeypot field + Cloudflare Turnstile token validation | Thwarts credential stuffing and automated registration bots. |
| **API Quota Throttling** | In-memory sliding window rate limiter in `lib/ratelimit.ts` | Safeguards Google Gemini and Supabase free-tier thresholds. |
| **Role-Based Access Control** | `lib/auth/requireRole.ts` + Next.js Middleware | Enforces administrative permissions for `/admin/*` views. |
