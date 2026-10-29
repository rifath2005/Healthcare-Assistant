export interface DoctorProfile {
  id: string;
  name: string;
  specialty: string;
  email: string;
  clinicRoom: string;
  avatar_url: string;
  bio: string;
  calendar_id: string;
  clinicalCode: string;
  meetLink?: string;
}

export const CLINIC_DOCTORS: DoctorProfile[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Dr. Elena Rostova, MD",
    specialty: "General Practitioner & Internal Medicine",
    email: "elena.rostova@healthcare.local",
    clinicRoom: "Room 102 - Internal Medicine Wing",
    avatar_url: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300",
    bio: "Board-certified internist with 12 years of clinical experience in preventative medicine, chronic symptom triage, and family health.",
    calendar_id: "primary",
    clinicalCode: "DR-ROSTOVA-102",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Dr. Marcus Vance, PsyD",
    specialty: "Clinical Psychologist & Mental Wellness",
    email: "marcus.vance@healthcare.local",
    clinicRoom: "Suite 305 - Behavioral Wellness",
    avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    bio: "Specialist in anxiety disorders, stress resilience, acute trauma intervention, and behavioral grounding therapies.",
    calendar_id: "primary",
    clinicalCode: "DR-VANCE-305",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Dr. Sarah Lin, MD",
    specialty: "Cardiology & Preventative Health",
    email: "sarah.lin@healthcare.local",
    clinicRoom: "Room 204 - Cardiology Center",
    avatar_url: "https://images.unsplash.com/photo-1594824813515-54e48b8b3a0e?auto=format&fit=crop&q=80&w=300",
    bio: "Fellow of the American College of Cardiology specializing in heart health, hypertension management, and lifestyle medicine.",
    calendar_id: "primary",
    clinicalCode: "DR-LIN-204",
  },
  {
    id: "4ed011cc-c663-4573-84e7-4310735b63f9",
    name: "Dr. Alex Rivera, MD",
    specialty: "Dermatology & Skin Health",
    email: "alex.rivera@healthcare.local",
    clinicRoom: "Room 301 - Dermatology Center",
    avatar_url: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300",
    bio: "Board-certified dermatologist specializing in clinical dermatology, inflammatory skin triage, and preventative skin health.",
    calendar_id: "primary",
    clinicalCode: "DR-RIVERA-301",
  },
];

export function getDoctorById(id: string): DoctorProfile | undefined {
  return CLINIC_DOCTORS.find((d) => d.id === id);
}

export function getDoctorByEmail(email: string): DoctorProfile | undefined {
  const normalized = email.trim().toLowerCase();
  return CLINIC_DOCTORS.find(
    (d) => d.email.toLowerCase() === normalized || d.name.toLowerCase().includes(normalized)
  );
}

export function validateDoctorCredentials(email: string, password: string): DoctorProfile | null {
  const normalizedEmail = email.trim().toLowerCase();
  const doctor = CLINIC_DOCTORS.find(
    (d) => d.email.toLowerCase() === normalizedEmail || d.clinicalCode.toLowerCase() === normalizedEmail
  );
  if (!doctor) return null;

  const trimmedPass = password.trim();
  const validPasswords = [
    "Doctor@2026",
    "doctor123",
    "Clinical#2026",
    doctor.clinicalCode,
    doctor.clinicalCode.toLowerCase(),
  ];

  if (validPasswords.includes(trimmedPass) || validPasswords.includes(trimmedPass.toLowerCase())) {
    return doctor;
  }

  return null;
}
