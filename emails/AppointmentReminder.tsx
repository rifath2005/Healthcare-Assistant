import * as React from "react";

export interface AppointmentReminderEmailProps {
  patientName: string;
  doctorName: string;
  doctorSpecialty: string;
  startTime: string;
  meetLink?: string;
}

export function AppointmentReminderEmail({
  patientName,
  doctorName,
  doctorSpecialty,
  startTime,
  meetLink,
}: AppointmentReminderEmailProps) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#1f2937", lineHeight: "1.6", maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div style={{ borderBottom: "2px solid #0284c7", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2 style={{ color: "#0369a1", margin: 0 }}>⏰ 24-Hour Consultation Reminder</h2>
        <p style={{ color: "#6b7280", margin: "4px 0 0 0" }}>Smart Healthcare Assistant</p>
      </div>

      <p>Hello {patientName || "Patient"},</p>
      <p>This is a friendly reminder that your upcoming telehealth consultation is scheduled for tomorrow.</p>

      <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "16px", margin: "20px 0" }}>
        <p style={{ margin: "4px 0" }}><strong>Doctor:</strong> {doctorName}</p>
        <p style={{ margin: "4px 0" }}><strong>Specialty:</strong> {doctorSpecialty}</p>
        <p style={{ margin: "4px 0" }}><strong>Scheduled Start:</strong> {startTime}</p>
      </div>

      {meetLink && (
        <div style={{ textAlign: "center", margin: "25px 0" }}>
          <a
            href={meetLink}
            style={{
              backgroundColor: "#0284c7",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "6px",
              textDecoration: "none",
              fontWeight: "bold",
              display: "inline-block",
            }}
          >
            Launch Google Meet
          </a>
        </div>
      )}
    </div>
  );
}
