import * as React from "react";

export interface AppointmentCancellationEmailProps {
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  startTime: string;
}

export function AppointmentCancellationEmail({
  patientName,
  doctorName,
  doctorSpecialty,
  startTime,
}: AppointmentCancellationEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1f2937", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ borderBottom: "2px solid #ef4444", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2 style={{ color: "#b91c1c", margin: 0 }}>❌ Appointment Cancelled</h2>
        <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>Smart Healthcare Assistant</p>
      </div>

      <p>Dear {patientName || "Patient"},</p>
      <p>Your healthcare appointment scheduled for <strong>{startTime}</strong> with <strong>{doctorName}</strong> ({doctorSpecialty}) has been cancelled.</p>
      <p>The calendar event has been released. If you need to rebook or consult a different physician, you can schedule a new appointment at any time from your dashboard.</p>
    </div>
  );
}
