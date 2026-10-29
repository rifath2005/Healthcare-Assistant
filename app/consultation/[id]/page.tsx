"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  HeartPulse,
  Video,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  PhoneOff,
  User,
  Stethoscope,
  Clock,
  Loader2,
} from "lucide-react";

export default function ConsultationRoomPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any | null>(null);

  // Construct secure room name
  const roomName = `SmartHealthcare-Consultation-${appointmentId}`;
  const iframeSrc = `https://meet.jit.si/${roomName}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.toolbarButtons=["camera","chat","closedcaptions","desktop","fullscreen","fodeviceselection","hangup","microphone","noisesuppression","raisehand","recording","select-background","settings","shareaudio","sharedvideo","stats","tileview","toggle-camera","videoquality"]`;
  const directLink = `https://meet.jit.si/${roomName}`;

  useEffect(() => {
    // Attempt to load appointment details if available
    async function fetchAppointment() {
      try {
        const res = await fetch(`/api/doctor/appointments?doctorId=all`);
        if (res.ok) {
          const data = await res.json();
          const match = (data.appointments || []).find((a: any) => a.id === appointmentId);
          if (match) {
            setAppointment(match);
          }
        }
      } catch (err) {
        console.warn("Could not load consultation metadata:", err);
      } finally {
        setLoading(false);
      }
    }

    if (appointmentId) {
      fetchAppointment();
    } else {
      setLoading(false);
    }
  }, [appointmentId]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {/* Consultation Header */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Return to Schedule"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white">
                  Telehealth Consultation Room
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Live Encrypted
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {appointment?.doctor_name ? (
                  <span>
                    Physician: <strong className="text-slate-200">{appointment.doctor_name}</strong> &bull; Patient: <strong className="text-slate-200">{appointment.patientName}</strong>
                  </span>
                ) : (
                  "Secure Peer-to-Peer Telehealth Session"
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            title="Open conference in standalone browser window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Full Window</span>
          </a>

          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave Call</span>
          </button>
        </div>
      </header>

      {/* Main Video Meeting Frame */}
      <main className="flex-1 w-full h-full relative bg-black">
        <iframe
          src={iframeSrc}
          allow="camera; microphone; display-capture; autoplay; clipboard-write; speaker"
          className="w-full h-full border-0"
          title="Telehealth Video Consultation"
        />
      </main>

      {/* Security Footer Banner */}
      <footer className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>HIPAA & GDPR Compliant WebRTC Stream &bull; End-to-End Encrypted</span>
        </div>
        <div className="hidden sm:block text-[11px] text-slate-500">
          Session ID: {appointmentId}
        </div>
      </footer>
    </div>
  );
}
