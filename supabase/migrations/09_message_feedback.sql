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
