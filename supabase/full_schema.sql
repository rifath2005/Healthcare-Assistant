-- Migration 01: Initial Core Schema
-- Creates profiles, conversations, and messages tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    has_accepted_disclaimer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for rapid lookup
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- Profile trigger on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, has_accepted_disclaimer)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        FALSE
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Migration 02: Row Level Security (RLS) Policies
-- Enforces multi-tenant data isolation across profiles, conversations, and messages

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Conversations Policies
CREATE POLICY "Users can view their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Messages Policies
CREATE POLICY "Users can view messages from their conversations"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages from their conversations"
    ON public.messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.user_id = auth.uid()
        )
    );
-- Migration 03: pgvector Extension and RAG Knowledge Base

CREATE EXTENSION IF NOT EXISTS vector;

-- Health documents table for RAG
CREATE TABLE IF NOT EXISTS public.health_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on health_documents (Public read-only, admin insert/update/delete)
ALTER TABLE public.health_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read health documents"
    ON public.health_documents FOR SELECT
    USING (true);

-- HNSW cosine index for sub-150ms vector similarity searches
CREATE INDEX IF NOT EXISTS idx_health_documents_embedding_hnsw 
    ON public.health_documents 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- RPC function for vector similarity matching
CREATE OR REPLACE FUNCTION match_health_documents(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 3
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    source_url TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hd.id,
        hd.title,
        hd.content,
        hd.source_url,
        hd.metadata,
        (1 - (hd.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.health_documents hd
    WHERE (1 - (hd.embedding <=> query_embedding)) >= match_threshold
    ORDER BY hd.embedding <=> query_embedding ASC
    LIMIT match_count;
END;
$$;
-- Migration 04: Doctors Directory and Appointments

-- Doctors table
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    working_hours JSONB NOT NULL DEFAULT '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"17:00"}}'::jsonb,
    calendar_id TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
    doctor_name TEXT NOT NULL,
    doctor_specialty TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'rescheduled')),
    google_event_id TEXT,
    meet_link TEXT,
    patient_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Doctors Policies (Anyone can read, only admin can manage)
CREATE POLICY "Public can view active doctors"
    ON public.doctors FOR SELECT
    USING (is_active = true);

-- Appointments Policies
CREATE POLICY "Users can view their own appointments"
    ON public.appointments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
    ON public.appointments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
    ON public.appointments FOR DELETE
    USING (auth.uid() = user_id);

-- Seed initial certified physicians
INSERT INTO public.doctors (id, name, specialty, calendar_id, bio, avatar_url, working_hours)
VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Dr. Elena Rostova, MD',
    'General Practitioner & Internal Medicine',
    'primary',
    'Board-certified internist with 12 years of clinical experience in preventative medicine, chronic symptom triage, and family health.',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    '{"monday":{"start":"09:00","end":"17:00"},"tuesday":{"start":"09:00","end":"17:00"},"wednesday":{"start":"09:00","end":"17:00"},"thursday":{"start":"09:00","end":"17:00"},"friday":{"start":"09:00","end":"16:00"}}'::jsonb
),
(
    '22222222-2222-2222-2222-222222222222',
    'Dr. Marcus Vance, PsyD',
    'Clinical Psychologist & Mental Wellness',
    'primary',
    'Specialist in anxiety disorders, stress resilience, acute trauma intervention, and behavioral grounding therapies.',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    '{"monday":{"start":"10:00","end":"18:00"},"tuesday":{"start":"10:00","end":"18:00"},"wednesday":{"start":"10:00","end":"18:00"},"thursday":{"start":"10:00","end":"18:00"},"friday":{"start":"10:00","end":"15:00"}}'::jsonb
),
(
    '33333333-3333-3333-3333-333333333333',
    'Dr. Sarah Lin, MD',
    'Cardiology & Preventative Health',
    'primary',
    'Fellow of the American College of Cardiology specializing in heart health, hypertension management, and lifestyle medicine.',
    'https://images.unsplash.com/photo-1594824813515-54e48b8b3a0e?auto=format&fit=crop&q=80&w=300',
    '{"monday":{"start":"08:30","end":"16:30"},"wednesday":{"start":"08:30","end":"16:30"},"friday":{"start":"08:30","end":"14:30"}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
-- Migration 05: Mental Wellness Mood Logs

CREATE TABLE IF NOT EXISTS public.mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    mood TEXT NOT NULL,
    intensity INT NOT NULL CHECK (intensity >= 1 AND intensity <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for temporal timeline querying
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_created ON public.mood_logs(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

-- Mood Logs Policies
CREATE POLICY "Users can view their own mood logs"
    ON public.mood_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood logs"
    ON public.mood_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood logs"
    ON public.mood_logs FOR DELETE
    USING (auth.uid() = user_id);
-- Migration 06: Admin Roles and Administrative RLS Overrides

-- Helper security definer function to check if the current requester is an administrator
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Admin Override Policies for Conversations
CREATE POLICY "Admins can view all conversations"
    ON public.conversations FOR SELECT
    USING (public.is_admin());

-- Admin Override Policies for Messages
CREATE POLICY "Admins can view all messages"
    ON public.messages FOR SELECT
    USING (public.is_admin());

-- Admin Override Policies for Appointments
CREATE POLICY "Admins can view all appointments"
    ON public.appointments FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update any appointment"
    ON public.appointments FOR UPDATE
    USING (public.is_admin());

-- Admin Override Policies for Mood Logs
CREATE POLICY "Admins can view all mood logs"
    ON public.mood_logs FOR SELECT
    USING (public.is_admin());

-- Admin Management for Doctors Directory
CREATE POLICY "Admins can insert doctors"
    ON public.doctors FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update doctors"
    ON public.doctors FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete doctors"
    ON public.doctors FOR DELETE
    USING (public.is_admin());
-- Migration 07: Crisis Incident Audit Logs

CREATE TABLE IF NOT EXISTS public.crisis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    trigger_text TEXT NOT NULL,
    detected_severity TEXT NOT NULL,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.crisis_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can view and update crisis logs
CREATE POLICY "Admins can view all crisis logs"
    ON public.crisis_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Admins can update crisis logs"
    ON public.crisis_logs FOR UPDATE
    USING (public.is_admin());

-- Service role / Server inserts crisis logs
CREATE POLICY "Service role can insert crisis logs"
    ON public.crisis_logs FOR INSERT
    WITH CHECK (true);
-- Migration 08: Field-Level Column Encryption (pgcrypto helper setup)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper functions for database-level symmetric encryption if executing via SQL queries
CREATE OR REPLACE FUNCTION encrypt_clinical_note(content TEXT, secret_key TEXT)
RETURNS BYTEA
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pgp_sym_encrypt(content, secret_key, 'cipher-algo=aes256');
$$;

CREATE OR REPLACE FUNCTION decrypt_clinical_note(encrypted_content BYTEA, secret_key TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT pgp_sym_decrypt(encrypted_content, secret_key);
$$;
-- Migration 09: AI Response Feedback Table

CREATE TABLE IF NOT EXISTS public.message_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating IN (-1, 1)),
    feedback_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit message feedback"
    ON public.message_feedback FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can view all message feedback"
    ON public.message_feedback FOR SELECT
    USING (public.is_admin());
