"use client";

import React, { useState } from "react";
import { X, Download, FileText, Code2, Check } from "lucide-react";
import { toast } from "sonner";

interface MessageExportItem {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}

interface ExportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageExportItem[];
  detectedSymptoms?: Array<{ name: string; duration: string; severity: string }>;
}

export function ExportSummaryModal({
  isOpen,
  onClose,
  messages,
  detectedSymptoms = [],
}: ExportSummaryModalProps) {
  const [format, setFormat] = useState<"markdown" | "json">("markdown");

  if (!isOpen) return null;

  const generateMarkdown = () => {
    let md = `# Clinical Consultation & Symptom Summary\n`;
    md += `Generated: ${new Date().toLocaleString()}\n`;
    md += `Platform: Smart Healthcare Assistant\n\n`;
    md += `> Disclaimer: This transcript contains conversational preliminary notes. It is not an official clinical diagnostic record.\n\n`;

    if (detectedSymptoms.length > 0) {
      md += `## Reported Symptoms & Clinical Entities\n`;
      for (const s of detectedSymptoms) {
        md += `- **${s.name}**: Duration: ${s.duration || "unspecified"}, Severity: ${s.severity}\n`;
      }
      md += `\n`;
    }

    md += `## Conversational Transcript\n`;
    for (const m of messages) {
      const speaker = m.role === "user" ? "Patient" : "Healthcare Assistant";
      md += `### ${speaker} (${m.created_at || "Recent"})\n`;
      md += `${m.content}\n\n`;
    }

    return md;
  };

  const generateJson = () => {
    return JSON.stringify(
      {
        exportTimestamp: new Date().toISOString(),
        disclaimer: "Non-diagnostic patient health summary",
        symptoms: detectedSymptoms,
        messages,
      },
      null,
      2
    );
  };

  const handleDownload = () => {
    const isMd = format === "markdown";
    const content = isMd ? generateMarkdown() : generateJson();
    const mime = isMd ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8";
    const filename = `health_summary_${Date.now()}.${isMd ? "md" : "json"}`;

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Exported as ${filename}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
          aria-label="Close export modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex p-2 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Download className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Export Consultation Summary
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Save your conversational health transcript to share with your personal physician
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat("markdown")}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                format === "markdown"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {format === "markdown" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs font-bold">Markdown (.md)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Formatted for reading & printing</p>
            </button>

            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`p-3 rounded-2xl border text-left space-y-1 transition-all ${
                format === "json"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <Code2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {format === "json" && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-xs font-bold">Structured JSON</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Machine-readable data records</p>
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            Download Summary File
          </button>
        </div>
      </div>
    </div>
  );
}
