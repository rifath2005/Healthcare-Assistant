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
