import { Resend } from "resend";
import { env } from "@/lib/env";
import { recordEmailDispatch } from "@/lib/telemetry";

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY || env.RESEND_API_KEY;
  if (!resendClient && apiKey && apiKey.startsWith("re_")) {
    resendClient = new Resend(apiKey);
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
/**
 * Helper to dispatch email via Resend with automatic sandbox forwarding.
 * When in Resend free/unverified sandbox mode, Resend restricts delivery to the verified account owner.
 * If 403 restriction occurs, safely forwards a copy to the verified account so emails are never lost during testing.
 */
async function dispatchEmailWithSandboxFallback(
  resend: Resend,
  payload: {
    from: string;
    to: string;
    subject: string;
    html: string;
    role: "Patient" | "Doctor";
    name: string;
  }
) {
  try {
    const { data, error } = await resend.emails.send({
      from: payload.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    });

    if (!error) {
      console.log(`[Email Delivered] Sent ${payload.role} email directly to: ${payload.to} (ID: ${data?.id})`);
      return { success: true, id: data?.id };
    }

    console.warn(`[Email Notice] Primary dispatch to ${payload.to} returned: ${error.message}`);

    // If Resend sandbox restricts recipient to verified owner (rifath.productmanager@gmail.com):
    if (error.message && (error.message.includes("rifath.productmanager@gmail.com") || (error as any).statusCode === 403)) {
      const verifiedDevEmail = "rifath.productmanager@gmail.com";
      console.log(`[Sandbox Forwarding] Delivering ${payload.role} email (${payload.name} <${payload.to}>) to verified test inbox: ${verifiedDevEmail}`);

      const fallback = await resend.emails.send({
        from: payload.from,
        to: [verifiedDevEmail],
        subject: `[${payload.role} Copy: ${payload.name} (${payload.to})] ${payload.subject}`,
        html: `
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: #92400e;">
            <strong>📬 Developer Sandbox Notification:</strong> This email was dispatched to <strong>${payload.role}: ${payload.name} &lt;${payload.to}&gt;</strong>.<br>
            In Resend sandbox mode, testing emails are routed to your verified account (<code>${verifiedDevEmail}</code>). In production with a custom verified domain, this arrives directly at <code>${payload.to}</code>.
          </div>
          ${payload.html}
        `,
      });

      return { success: !fallback.error, id: fallback.data?.id, forwardedTo: verifiedDevEmail };
    }

    return { success: false, error: error.message };
  } catch (err: any) {
    console.error(`[Email Exception] Error dispatching ${payload.role} email:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Sends mandatory dual emails to BOTH the patient and the doctor.
 * - If Virtual: Includes the Google Meet video consultation link for both parties.
 * - If Direct (In-Person): Excludes any meeting link, but delivers the full booking message with clinic room and arrival instructions.
 */
export async function sendDualAppointmentBookingEmails(options: SendAppointmentEmailOptions) {
  const isVirtual = options.consultationType !== "direct";
  const clinicRoom = options.clinicRoom || "HealthCare Clinic Center, Room 102 - Internal Medicine Wing";
  const fromEmail = env.EMAIL_FROM || "onboarding@resend.dev";

  // 1. Dispatch Patient Email
  const patientPromise = (async () => {
    recordEmailDispatch();
    const resend = getResendClient();
    const patientDestination = options.to || options.patientEmail || "patient@example.com";

    if (!resend) {
      console.log(`[Email Mock] Patient confirmation email to: ${patientDestination}`);
      return { success: true, id: `mock_patient_${Date.now()}` };
    }

    const patientHtml = `
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
            ${isVirtual
              ? `Your virtual telehealth consultation with <strong>${options.doctorName}</strong> (${options.doctorSpecialty}) has been successfully scheduled. Your Google Meet link is ready below.`
              : `Your direct in-person consultation with <strong>${options.doctorName}</strong> (${options.doctorSpecialty}) has been successfully scheduled. Please review your clinic room and arrival details below.`
            }
          </p>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 14px; color: #334155; line-height: 1.6;">
          <p style="margin: 0 0 8px 0;"><strong>Physician:</strong> ${options.doctorName} (${options.doctorSpecialty})</p>
          <p style="margin: 0 0 8px 0;"><strong>Scheduled Date & Time:</strong> ${options.startTime}</p>
          <p style="margin: 0 0 8px 0;"><strong>Consultation Mode:</strong> ${isVirtual ? '🌐 Virtual Telehealth (Google Meet)' : '🏥 Direct In-Person Clinic Visit'}</p>
          ${!isVirtual ? `<p style="margin: 0 0 8px 0;"><strong>Clinic Examination Room:</strong> ${clinicRoom}</p>` : ''}
          ${options.notes ? `<p style="margin: 0;"><strong>Reported Symptoms / Notes:</strong> ${options.notes}</p>` : ''}
        </div>

        ${isVirtual && options.meetLink ? `
          <!-- VIRTUAL MODE: Provide Meeting Link -->
          <div style="text-align: center; margin: 24px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px;">
            <p style="color: #166534; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Your Google Meet Telehealth Room is Ready:</p>
            <a href="${options.meetLink}" target="_blank" rel="noopener noreferrer" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              📹 Join Google Meet Consultation
            </a>
            <p style="color: #475569; font-size: 12px; margin: 12px 0 4px 0;">Direct URL:</p>
            <a href="${options.meetLink}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-size: 12px; word-break: break-all;">
              ${options.meetLink}
            </a>
            <p style="color: #64748b; font-size: 12px; margin-top: 10px;">Please join 5 minutes before scheduled start time with your camera and microphone enabled.</p>
          </div>
        ` : `
          <!-- DIRECT IN-PERSON MODE: Pass Booking Message, NO Meeting Link -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
            <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 14px;">📍 Direct In-Person Clinic Visit Notice:</p>
            <p style="margin: 0 0 6px 0;">• <strong>Location:</strong> HealthCare Clinic Center, <strong>${clinicRoom}</strong>.</p>
            <p style="margin: 0 0 6px 0;">• <strong>Arrival Time:</strong> Please arrive at least 10 minutes prior to your scheduled time (<strong>${options.startTime}</strong>).</p>
            <p style="margin: 0 0 6px 0;">• <strong>What to Bring:</strong> A valid photo ID and a list of any current medications.</p>
            <p style="margin: 0; color: #475569; font-size: 12px;"><em>Note: No video link is needed for this in-person physical consultation.</em></p>
          </div>
        `}

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 0;">Smart Healthcare Assistant • Confidential Medical Telehealth & Clinic Care</p>
        </div>
      </div>
    `;

    return dispatchEmailWithSandboxFallback(resend, {
      from: fromEmail,
      to: patientDestination,
      subject: `[Confirmed] ${isVirtual ? 'Virtual' : 'In-Person'} Consultation: ${options.doctorName} - ${options.startTime}`,
      html: patientHtml,
      role: "Patient",
      name: options.patientName || "Patient",
    });
  })();

  // 2. Dispatch Doctor Email (Mandatory)
  const doctorPromise = (async () => {
    recordEmailDispatch();
    const resend = getResendClient();
    const doctorDestination = options.doctorEmail || "elena.rostova@healthcare.local";

    if (!resend) {
      console.log(`[Email Mock] Doctor notification email to: ${doctorDestination}`);
      return { success: true, id: `mock_doctor_${Date.now()}` };
    }

    const doctorHtml = `
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
            A patient has booked a new <strong>${isVirtual ? 'Virtual Telehealth Consultation' : 'Direct In-Person Clinic Visit'}</strong> with you.
          </p>
        </div>

        <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px;">
          <p style="margin: 0 0 6px 0;"><strong>Patient Name:</strong> ${options.patientName || "Patient"}</p>
          <p style="margin: 0 0 6px 0;"><strong>Patient Email:</strong> ${options.patientEmail || options.to}</p>
          <p style="margin: 0 0 6px 0;"><strong>Scheduled Time:</strong> ${options.startTime}</p>
          <p style="margin: 0 0 6px 0;"><strong>Consultation Mode:</strong> ${isVirtual ? '🌐 Virtual Telehealth (Google Meet)' : '🏥 Direct In-Person Visit'}</p>
          ${!isVirtual ? `<p style="margin: 0 0 6px 0;"><strong>Assigned Clinic Room:</strong> ${clinicRoom}</p>` : ''}
          <p style="margin: 0;"><strong>Clinical Intake Symptoms / Notes:</strong> ${options.notes || "No additional notes provided"}</p>
        </div>

        ${isVirtual && options.meetLink ? `
          <!-- VIRTUAL MODE: Provide Provider Meeting Link -->
          <div style="text-align: center; margin: 24px 0; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px;">
            <p style="color: #166534; font-size: 13px; font-weight: bold; margin: 0 0 12px 0;">Your Provider Google Meet Consultation Room:</p>
            <a href="${options.meetLink}" target="_blank" rel="noopener noreferrer" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              📹 Launch Google Meet Video Room
            </a>
            <p style="color: #475569; font-size: 12px; margin: 12px 0 4px 0;">Room URL:</p>
            <a href="${options.meetLink}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-size: 12px; word-break: break-all;">
              ${options.meetLink}
            </a>
          </div>
        ` : `
          <!-- DIRECT IN-PERSON MODE: In-Person Room Message, NO Meeting Link -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; color: #1e3a8a; line-height: 1.6;">
            <p style="margin: 0 0 6px 0; font-weight: bold; font-size: 14px;">📍 Direct In-Person Examination Room Notice:</p>
            <p style="margin: 0 0 6px 0;">The patient has been instructed to check in 10 minutes early at <strong>${clinicRoom}</strong>.</p>
            <p style="margin: 0; color: #475569; font-size: 12px;">Please review the patient's reported symptoms above prior to the in-person examination.</p>
          </div>
        `}

        <div style="margin-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
            You can review, manage, or update this consultation in the Doctor Portal:
          </p>
          <a href="/doctor/appointments" style="font-size: 13px; color: #059669; font-weight: bold; text-decoration: none;">
            Open Doctor Schedule &rarr;
          </a>
        </div>
      </div>
    `;

    return dispatchEmailWithSandboxFallback(resend, {
      from: fromEmail,
      to: doctorDestination,
      subject: `[Clinician Alert] New ${isVirtual ? 'Virtual' : 'In-Person'} Appointment: ${options.patientName || "Patient"} - ${options.startTime}`,
      html: doctorHtml,
      role: "Doctor",
      name: options.doctorName,
    });
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
