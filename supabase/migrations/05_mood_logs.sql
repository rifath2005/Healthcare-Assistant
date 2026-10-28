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
