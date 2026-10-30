-- Migration 10: Doctor & System Integrations for Serverless OAuth Token Storage
CREATE TABLE IF NOT EXISTS public.doctor_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL UNIQUE, -- e.g. 'google_calendar'
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.doctor_integrations ENABLE ROW LEVEL SECURITY;

-- Admins and doctors can read integration status
CREATE POLICY "Admins can manage doctor integrations"
    ON public.doctor_integrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
