import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_anon_key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // Revalidate auth token with getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email";

  const isPublicRoute =
    isAuthRoute ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/auth/callback");

  const isAdminRoute = pathname.startsWith("/admin");

  // Helper to ensure refreshed auth cookies are preserved across redirects
  function createRedirectResponse(redirectUrl: URL) {
    const redirectResponse = NextResponse.redirect(redirectUrl);
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c);
    });
    return redirectResponse;
  }

  // 1. If authenticated and attempting to view login/signup -> redirect to home (conversation page)
  if (user && isAuthRoute) {
    url.pathname = "/";
    return createRedirectResponse(url);
  }

  // 2. If unauthenticated and NOT on a public route (including /) -> redirect to /login
  if (!user && !isPublicRoute) {
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("redirect", pathname);
    }
    return createRedirectResponse(url);
  }

  // 3. If accessing admin route, check role in profile
  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      url.pathname = "/";
      url.searchParams.set("error", "Access denied. Administrative privileges required.");
      return createRedirectResponse(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|manifest.json|api/|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
