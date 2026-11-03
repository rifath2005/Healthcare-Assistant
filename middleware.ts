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

  // Fast-path: Only invoke remote getUser() if a Supabase authentication cookie is present
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && (c.name.includes("-auth-token") || c.name.endsWith("-token"))
  );

  let user = null;
  if (hasAuthCookie) {
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    } catch {
      user = null;
    }
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email";

  // Publicly accessible pages without login (root conversation page '/' requires login)
  const isPublicRoute =
    isAuthRoute ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/profile" ||
    pathname === "/doctor/login" ||
    pathname === "/admin/login" ||
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

  // 1. If accessing doctor portal, check doctor session cookie
  const isDoctorRoute = pathname.startsWith("/doctor");
  const isDoctorLogin = pathname === "/doctor/login";
  const hasDoctorSession =
    request.cookies.has("doctor_session") ||
    request.cookies.has("doctor_id");

  if (isDoctorRoute) {
    if (isDoctorLogin) {
      if (hasDoctorSession) {
        url.pathname = "/doctor/appointments";
        return createRedirectResponse(url);
      }
      return response;
    }

    if (!hasDoctorSession && !user) {
      url.pathname = "/doctor/login";
      url.searchParams.set("redirect", pathname);
      return createRedirectResponse(url);
    }
    return response;
  }

  // Mandatory Profile Gate: User must complete health profile before reaching main page '/'
  const isProfileComplete = user?.user_metadata?.is_profile_complete === true;

  // 2. If authenticated and attempting to view login/signup -> redirect appropriately
  if (user && isAuthRoute) {
    url.pathname = isProfileComplete ? "/" : "/profile";
    return createRedirectResponse(url);
  }

  // 3. If authenticated and attempting to access root '/' without completed health profile -> redirect to /profile
  if (user && pathname === "/" && !isProfileComplete) {
    url.pathname = "/profile";
    return createRedirectResponse(url);
  }

  // 2. If unauthenticated and NOT on a public route -> redirect to appropriate portal
  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/admin")) {
      url.pathname = "/admin/login";
    } else {
      url.pathname = "/login";
    }
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

    if (profile?.role === "admin") {
      if (pathname === "/admin/login") {
        url.pathname = "/admin/doctors";
        return createRedirectResponse(url);
      }
    } else {
      if (pathname !== "/admin/login") {
        url.pathname = "/admin/login";
        url.searchParams.set("error", "Access denied. Administrative privileges required.");
        return createRedirectResponse(url);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next|favicon.ico|icon|manifest.json|api/|data/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
