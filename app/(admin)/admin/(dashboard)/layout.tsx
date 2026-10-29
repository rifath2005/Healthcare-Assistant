import React from "react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/requireRole";
import {
  Stethoscope,
  CalendarCheck,
  AlertOctagon,
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role guard: strictly rejects non-admin users
  await requireRole("admin");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Admin Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-white p-5 flex flex-col justify-between shrink-0 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Clinical Admin</h2>
              <p className="text-[10px] text-slate-400">Supervisor Supervision Panel</p>
            </div>
          </div>

          <nav className="space-y-1 text-xs font-semibold">
            <Link
              href="/admin/doctors"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <Stethoscope className="w-4 h-4 text-emerald-400" />
              <span>Doctor Management</span>
            </Link>

            <Link
              href="/admin/appointments"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-sky-400" />
              <span>All Appointments</span>
            </Link>

            <Link
              href="/admin/crisis-logs"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span>Crisis Audit Logs</span>
            </Link>
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Patient View</span>
          </Link>
        </div>
      </aside>

      {/* Main Content View */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
