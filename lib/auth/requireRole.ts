import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type Role = "user" | "admin";

/**
 * Checks the role of the currently authenticated user.
 */
export async function getCurrentUserRole(): Promise<{
  userId: string | null;
  role: Role | null;
  isAuthenticated: boolean;
}> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null, isAuthenticated: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as Role) || "user";

  return {
    userId: user.id,
    role,
    isAuthenticated: true,
  };
}

/**
 * Server guard that asserts the user holds a specific role or redirects.
 */
export async function requireRole(allowedRole: Role = "admin"): Promise<{
  userId: string;
  role: Role;
}> {
  const { userId, role, isAuthenticated } = await getCurrentUserRole();

  if (!isAuthenticated || !userId) {
    redirect("/admin/login?redirect=" + encodeURIComponent("/admin/doctors"));
  }

  if (role !== allowedRole) {
    redirect("/admin/login?error=" + encodeURIComponent("Access denied: Administrative privileges required"));
  }

  return { userId, role };
}
