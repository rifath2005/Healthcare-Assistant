import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isAuthRoute = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password";
  const isProtectedRoute =
    pathname.startsWith("/appointments") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");

  // 1. If authenticated and attempting to view login/signup -> redirect to home / chat
  if (session && isAuthRoute) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // 2. If unauthenticated and accessing protected routes -> redirect to login
  if (!session && (isProtectedRoute || isAdminRoute)) {
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 3. If accessing admin route, check role in profile
  if (session && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "admin") {
      url.pathname = "/";
      url.searchParams.set("error", "Access denied. Administrative privileges required.");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|api/|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
