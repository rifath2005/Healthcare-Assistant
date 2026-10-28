import * as React from "react";

export interface AppointmentConfirmationEmailProps {
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  startTime: string;
  meetLink?: string;
  notes?: string;
}

export function AppointmentConfirmationEmail({
  patientName,
  doctorName,
  doctorSpecialty,
  startTime,
  meetLink,
  notes,
}: AppointmentConfirmationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1f2937", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ borderBottom: "2px solid #10b981", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2 style={{ color: "#065f46", margin: 0 }}>🩺 Appointment Confirmed</h2>
        <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>Smart Healthcare Assistant Consultation</p>
      </div>

      <p>Dear {patientName || "Patient"},</p>
      <p>Your healthcare consultation has been confirmed. Below are your scheduled appointment details:</p>

      <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "16px", margin: "20px 0" }}>
        <p style={{ margin: "4px 0" }}><strong>Physician:</strong> {doctorName}</p>
        <p style={{ margin: "4px 0" }}><strong>Specialty:</strong> {doctorSpecialty}</p>
        <p style={{ margin: "4px 0" }}><strong>Date & Time:</strong> {startTime}</p>
        {notes && <p style={{ margin: "4px 0" }}><strong>Clinical Notes:</strong> {notes}</p>}
      </div>

      {meetLink && (
        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <a
            href={meetLink}
            style={{
              backgroundColor: "#10b981",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            Join Google Meet Consultation
          </a>
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "8px" }}>Link: {meetLink}</p>
        </div>
      )}

      <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginTop: "30px", fontSize: "13px", color: "#6b7280" }}>
        <p><strong>Important Preparation Guidelines:</strong></p>
        <ul>
          <li>Please join 5 minutes before your scheduled start time.</li>
          <li>Prepare a list of current symptoms, duration, and relevant medications.</li>
          <li>This appointment is conducted via secure telehealth video conference.</li>
        </ul>
      </div>
    </div>
  );
}
