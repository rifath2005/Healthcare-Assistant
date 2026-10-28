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
  doctorName: string;
  doctorSpecialty: string;
  startTime: string;
  meetLink?: string;
  notes?: string;
}

/**
 * Sends booking confirmation email.
 */
export async function sendAppointmentConfirmation(options: SendAppointmentEmailOptions) {
  recordEmailDispatch();
  const resend = getResendClient();

  if (!resend) {
    console.log(`[Email Mock] Confirmation email would be sent to: ${options.to}`);
    return { success: true, id: `mock_email_${Date.now()}` };
  }

  try {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #059669;">🩺 Appointment Confirmed</h2>
        <p>Dear ${options.patientName || "Patient"},</p>
        <p>Your appointment with <strong>${options.doctorName}</strong> (${options.doctorSpecialty}) has been confirmed.</p>
        <p><strong>Scheduled Time:</strong> ${options.startTime}</p>
        ${options.meetLink ? `<p><a href="${options.meetLink}" style="background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Join Google Meet</a></p>` : ""}
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Smart Healthcare Assistant Team</p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM || "onboarding@resend.dev",
      to: [options.to],
      subject: `Appointment Confirmed: ${options.doctorName} - ${options.startTime}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error sending confirmation:", error);
      return { success: false, error };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Resend dispatch exception:", err);
    return { success: false, error: err };
  }
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
