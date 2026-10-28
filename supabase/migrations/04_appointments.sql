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
