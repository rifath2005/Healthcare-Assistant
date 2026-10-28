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
