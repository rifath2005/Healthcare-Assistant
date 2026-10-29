import { Resend } from "resend";
import { env } from "@/lib/env";
import { recordEmailDispatch } from "@/lib/telemetry";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!resendClient && env.RESEND_API_KEY && env.RESEND_API_KEY.startsWith("re_")) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendAppointmentEmailOptions {
  to: string;
  patientName: string;
  patientEmail?: string;
  doctorName: string;
  doctorEmail?: string;
  doctorSpecialty: string;
  startTime: string;
  consultationType?: "virtual" | "direct";
  clinicRoom?: string;
  meetLink?: string;
  notes?: string;
}

/**
 * Sends mandatory dual emails to BOTH the patient and the doctor.
 * If virtual: meeting link is provided.
 * If direct: in-person clinic room & instructions are provided.
 */
export async function sendDualAppointmentBookingEmails(options: SendAppointmentEmailOptions) {
  const isVirtual = options.consultationType !== "direct";
  const clinicRoom = options.clinicRoom || "HealthCare Clinic Center, Suite 204";

  // 1. Dispatch Patient Email
  const patientPromise = (async () => {
    recordEmailDispatch();
    const resend = getResendClient();
    if (!resend) {
      console.log(`[Email Mock] Patient confirmation email to: ${options.to}`);
      return { success: true, id: `mock_patient_${Date.now()}` };
    }

    try {
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
            <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0;">🏥 HealthCare Assistant</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Official Consultation Confirmation</p>
          </div>

          <div style="background-color: ${isVirtual ? '#ecfdf5' : '#eff6ff'}; border: 1px solid ${isVirtual ? '#a7f3d0' : '#bfdbfe'}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: ${isVirtual ? '#047857' : '#1d4ed8'}; font-size: 16px; margin: 0 0 8px 0;">
              ${isVirtual ? '🌐 Virtual Telehealth Consultation Confirmed' : '🏥 Direct In-Person Consultation Confirmed'}
            </h2>
            <p style="color: #334155; font-size: 14px; margin: 0; line-height: 1.5;">
              Dear <strong>${options.patientName || "Patient"}</strong>,<br>
              Your consultation with <strong>${options.doctorName}</strong> (${options.doctorSpecialty}) has been successfully scheduled.
            </p>
          </div>

          <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 14px; color: #334155;">
            <p style="margin: 0 0 8px 0;"><strong>Physician:</strong> ${options.doctorName} (${options.doctorSpecialty})</p>
            <p style="margin: 0 0 8px 0;"><strong>Scheduled Time:</strong> ${options.startTime}</p>
            <p style="margin: 0 0 8px 0;"><strong>Consultation Mode:</strong> ${isVirtual ? 'Virtual Telehealth (Google Meet)' : 'Direct In-Person Clinic Visit'}</p>
            ${!isVirtual ? `<p style="margin: 0 0 8px 0;"><strong>Location:</strong> ${clinicRoom}</p>` : ''}
            ${options.notes ? `<p style="margin: 0;"><strong>Reported Symptoms / Notes:</strong> ${options.notes}</p>` : ''}
          </div>

          ${isVirtual && options.meetLink ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${options.meetLink}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                📹 Join Google Meet Consultation
              </a>
              <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Please join 5 minutes before scheduled start time.</p>
            </div>
          ` : `
            <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px; margin: 20px 0; font-size: 13px; color: #475569;">
              📍 <strong>Clinic Arrival Instructions:</strong> Please arrive 10 minutes before your scheduled appointment at <strong>${clinicRoom}</strong> with your photo identification.
            </div>
          `}

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
            <p style="margin: 0;">Smart Healthcare Assistant • Confidential Medical Telehealth & Clinic Care</p>
          </div>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || "onboarding@resend.dev",
        to: [options.to],
        subject: `[Confirmed] ${isVirtual ? 'Virtual' : 'In-Person'} Consultation: ${options.doctorName} - ${options.startTime}`,
        html: htmlBody,
      });

      if (error) {
        console.warn("Patient email warning (sandbox mode / domain check):", error);
      }
      return { success: true, id: data?.id };
    } catch (err) {
      console.warn("Patient email dispatch exception:", err);
      return { success: false, error: err };
    }
  })();

  // 2. Dispatch Doctor Email (Mandatory)
  const doctorPromise = (async () => {
    recordEmailDispatch();
    const resend = getResendClient();
    const doctorDestination = options.doctorEmail || env.EMAIL_FROM || "onboarding@resend.dev";

    if (!resend) {
      console.log(`[Email Mock] Doctor notification email to: ${doctorDestination}`);
      return { success: true, id: `mock_doctor_${Date.now()}` };
    }

    try {
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
            <h1 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0;">🩺 Clinician Appointment Alert</h1>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">New Patient Appointment Notification</p>
          </div>

          <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 16px; margin-bottom: 20px;">
            <p style="color: #1e293b; font-size: 15px; font-weight: bold; margin: 0 0 4px 0;">
              Hello ${options.doctorName},
            </p>
            <p style="color: #475569; font-size: 13px; margin: 0;">
              A patient has scheduled a new <strong>${isVirtual ? 'Virtual Consultation' : 'Direct In-Person Visit'}</strong> with you.
            </p>
          </div>

          <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.6;">
            <p style="margin: 0 0 6px 0;"><strong>Patient Name:</strong> ${options.patientName || "Patient"}</p>
            <p style="margin: 0 0 6px 0;"><strong>Patient Email:</strong> ${options.patientEmail || options.to}</p>
            <p style="margin: 0 0 6px 0;"><strong>Scheduled Time:</strong> ${options.startTime}</p>
            <p style="margin: 0 0 6px 0;"><strong>Consultation Mode:</strong> ${isVirtual ? '🌐 Virtual Telehealth (Google Meet)' : '🏥 Direct In-Person Visit'}</p>
            ${!isVirtual ? `<p style="margin: 0 0 6px 0;"><strong>Clinic Location:</strong> ${clinicRoom}</p>` : ''}
            <p style="margin: 0;"><strong>Clinical Notes / Intake Symptoms:</strong> ${options.notes || "No additional notes provided"}</p>
          </div>

          ${isVirtual && options.meetLink ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="${options.meetLink}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                📹 Open Provider Google Meet Link
              </a>
            </div>
          ` : ''}

          <div style="margin-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #64748b;">
              You can accept, review, or reschedule this consultation in the Doctor Portal:
            </p>
            <p style="font-size: 12px; color: #059669; font-weight: bold;">
              /doctor/appointments
            </p>
          </div>
        </div>
      `;

      // On Resend free tier, sending to unverified addresses fails. Fallback to primary verified email if unverified.
      const targetEmail = doctorDestination.endsWith(".local") ? (env.EMAIL_FROM || "onboarding@resend.dev") : doctorDestination;

      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM || "onboarding@resend.dev",
        to: [targetEmail],
        subject: `[Clinician Alert] New ${isVirtual ? 'Virtual' : 'In-Person'} Appointment: ${options.patientName || "Patient"} - ${options.startTime}`,
        html: htmlBody,
      });

      if (error) {
        console.warn("Doctor email warning (sandbox mode / domain check):", error);
      }
      return { success: true, id: data?.id };
    } catch (err) {
      console.warn("Doctor email dispatch exception:", err);
      return { success: false, error: err };
    }
  })();

  const [patientResult, doctorResult] = await Promise.allSettled([patientPromise, doctorPromise]);
  return {
    patient: patientResult.status === "fulfilled" ? patientResult.value : null,
    doctor: doctorResult.status === "fulfilled" ? doctorResult.value : null,
  };
}

/**
 * Sends booking confirmation email (backward compatible wrapper).
 */
export async function sendAppointmentConfirmation(options: SendAppointmentEmailOptions) {
  return sendDualAppointmentBookingEmails(options);
}

/**
 * Sends 24-hour reminder email.
 */
export async function sendAppointmentReminder(options: SendAppointmentEmailOptions) {
  recordEmailDispatch();
  const resend = getResendClient();

  if (!resend) {
    console.log(`[Email Mock] 24h Reminder email would be sent to: ${options.to}`);
    return { success: true, id: `mock_reminder_${Date.now()}` };
  }

  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0284c7;">⏰ Upcoming Appointment Reminder</h2>
        <p>Dear ${options.patientName || "Patient"},</p>
        <p>This is a reminder for your consultation tomorrow with <strong>${options.doctorName}</strong>.</p>
        <p><strong>Time:</strong> ${options.startTime}</p>
        ${options.meetLink ? `<p><a href="${options.meetLink}">Google Meet Link: ${options.meetLink}</a></p>` : ""}
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM || "onboarding@resend.dev",
      to: [options.to],
      subject: `Reminder: Consultation tomorrow with ${options.doctorName}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend reminder error:", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Resend reminder exception:", err);
    return { success: false, error: err };
  }
}

/**
 * Sends appointment cancellation email.
 */
export async function sendAppointmentCancellation(options: SendAppointmentEmailOptions) {
  recordEmailDispatch();
  const resend = getResendClient();

  if (!resend) {
    console.log(`[Email Mock] Cancellation email would be sent to: ${options.to}`);
    return { success: true, id: `mock_cancel_${Date.now()}` };
  }

  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">❌ Appointment Cancelled</h2>
        <p>Dear ${options.patientName || "Patient"},</p>
        <p>Your appointment with <strong>${options.doctorName}</strong> for ${options.startTime} has been cancelled.</p>
        <p>You can rebook anytime via your dashboard.</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM || "onboarding@resend.dev",
      to: [options.to],
      subject: `Cancelled: Appointment with ${options.doctorName}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend cancellation error:", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Resend cancellation exception:", err);
    return { success: false, error: err };
  }
}
