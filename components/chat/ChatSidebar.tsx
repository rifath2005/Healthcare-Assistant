"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Plus, Trash2, Edit2, Check, X, Calendar, History, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ConversationThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenBreathing?: () => void;
  onOpenGrounding?: () => void;
}

export function ChatSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  isOpen,
  onCloseMobile,
}: ChatSidebarProps) {
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const loadThreads = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setThreads(data);
      }
    } catch (e) {
      console.warn("Failed to load conversation threads:", e);
    }
  };

  useEffect(() => {
    loadThreads();
  }, [currentConversationId]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const supabase = createClient();
      await supabase.from("conversations").delete().eq("id", id);
      setThreads(threads.filter((t) => t.id !== id));
      toast.success("Thread deleted");
      if (currentConversationId === id) {
        onNewConversation();
      }
    } catch {
      toast.error("Failed to delete thread");
    }
  };

  const handleStartRename = (e: React.MouseEvent, thread: ConversationThread) => {
    e.stopPropagation();
    setEditingId(thread.id);
    setEditTitle(thread.title);
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      const supabase = createClient();
      await supabase.from("conversations").update({ title: editTitle.trim() }).eq("id", id);
      setThreads(threads.map((t) => (t.id === id ? { ...t, title: editTitle.trim() } : t)));
      setEditingId(null);
      toast.success("Thread renamed");
    } catch {
      toast.error("Failed to rename thread");
    }
  };

  // Group threads by date
  const today = new Date().toDateString();
  const past7Days = new Date(Date.now() - 7 * 86400000);

  const todayThreads = threads.filter((t) => new Date(t.created_at).toDateString() === today);
  const recentThreads = threads.filter((t) => {
    const d = new Date(t.created_at);
    return d.toDateString() !== today && d >= past7Days;
  });
  const olderThreads = threads.filter((t) => new Date(t.created_at) < past7Days);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-[82vw] max-w-xs lg:w-72 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 shrink-0 shadow-xl lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        )}
      >
        {/* Header Bar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Consultation History
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {threads.length} {threads.length === 1 ? "saved session" : "saved sessions"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
            aria-label="Close history"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Consultation button */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>New Consultation</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {threads.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2.5">
              <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No Saved Consultations Yet
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                When you chat with the medical assistant, your conversations are automatically saved here so you can review and continue them anytime.
              </p>
            </div>
          ) : (
            <>
              {todayThreads.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Today
                  </p>
                  {todayThreads.map((t) => renderThreadItem(t))}
                </div>
              )}

              {recentThreads.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Previous 7 Days
                  </p>
                  {recentThreads.map((t) => renderThreadItem(t))}
                </div>
              )}

              {olderThreads.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Older
                  </p>
                  {olderThreads.map((t) => renderThreadItem(t))}
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );

  function renderThreadItem(thread: ConversationThread) {
    const isSelected = currentConversationId === thread.id;
    const isEditing = editingId === thread.id;

    return (
      <div
        key={thread.id}
        onClick={() => {
          onSelectConversation(thread.id);
          onCloseMobile();
        }}
        className={cn(
          "group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all",
          isSelected
            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 font-semibold border border-emerald-200 dark:border-emerald-800"
            : "hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-transparent"
        )}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 pr-1">
          <MessageSquare
            className={cn(
              "w-3.5 h-3.5 shrink-0",
              isSelected
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-400 group-hover:text-emerald-600"
            )}
          />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              autoFocus
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white dark:bg-slate-800 border rounded px-1.5 py-0.5 text-xs focus:outline-none"
            />
          ) : (
            <div className="flex flex-col truncate min-w-0">
              <span className="truncate">{thread.title}</span>
              <span suppressHydrationWarning className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                {new Date(thread.updated_at || thread.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={(e) => handleSaveRename(e, thread.id)}
                className="p-1 hover:text-emerald-600"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(null);
                }}
                className="p-1 hover:text-red-500"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => handleStartRename(e, thread)}
                className="p-1 hover:text-slate-900 dark:hover:text-white"
                title="Rename thread"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(e, thread.id)}
                className="p-1 hover:text-red-500"
                title="Delete thread"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }
}
