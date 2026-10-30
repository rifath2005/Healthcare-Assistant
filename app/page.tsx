"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DisclaimerBanner } from "@/components/ui/DisclaimerBanner";
import { ConsentModal } from "@/components/ui/ConsentModal";
import { ChatContainer } from "@/components/chat/ChatContainer";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { clearGuestMessages } from "@/lib/supabase/syncGuestSession";
import {
  HeartPulse,
  Calendar,
  Settings,
  LogIn,
  LogOut,
  User,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on mobile devices on initial render
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleCloseMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // Check active session
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setLoadingUser(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setLoadingUser(false);
        router.push("/login");
      } else if (session?.user) {
        setUser(session.user);
        setLoadingUser(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setActiveConversationId(null);
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setSessionKey((prev) => prev + 1);
    clearGuestMessages();
  };

  if (loadingUser) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg animate-pulse">
            <HeartPulse className="w-8 h-8" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-slate-950">
      {/* Non-Diagnostic Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Top Header */}
      <header className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 rounded-xl text-white shadow-xs">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white">
                Smart Healthcare Assistant
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                AI Powered
              </span>
            </div>
          </Link>
        </div>

        {/* Right Action Icons & Auth Profile */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/appointments"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">My Appointments</span>
              </Link>

              <Link
                href="/terms"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                title="Verified Medical Sources (CDC, MedlinePlus, WHO) & Terms"
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden md:inline">Sources & Policy</span>
              </Link>

              <Link
                href="/settings"
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
              <Link
                href="/signup"
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Main Body: Sidebar + Chat Stream */}
      <div className="flex flex-1 overflow-hidden">
        {user && (
          <ChatSidebar
            currentConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onNewConversation={handleNewConversation}
            isOpen={isSidebarOpen}
            onCloseMobile={handleCloseMobile}
          />
        )}

        <main className="flex-1 flex flex-col h-full overflow-hidden">
          <ChatContainer
            key={sessionKey}
            conversationId={activeConversationId}
            onConversationCreated={(newId) => setActiveConversationId(newId)}
            onNewConversation={handleNewConversation}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </main>
      </div>

      {/* First-visit Legal Consent Modal */}
      <ConsentModal />
    </div>
  );
}
