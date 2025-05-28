import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define route types
  const protectedRoutes = [
    "/dashboard",
    "/statement-portal",
    "/view-submission",
  ];
  const adminRoutes = ["/admin"];
  const authRoutes = ["/sign-in", "/sign-up", "/auth"];

  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Check admin routes FIRST (most restrictive)
  if (isAdminRoute) {
    if (!user) {
      // No user at all - redirect to sign in
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Check if user is admin using database
    const { data: roleData, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin =
      !error &&
      (roleData?.role === "admin" || roleData?.role === "super_admin");

    if (!isAdmin) {
      // Log the unauthorized access attempt
      try {
        await supabase.from("admin_activity_logs").insert({
          admin_id: user.id,
          action: "unauthorized_admin_access_attempt",
          details: {
            path: request.nextUrl.pathname,
            timestamp: new Date().toISOString(),
          },
          ip_address:
            request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip"),
          user_agent: request.headers.get("user-agent"),
        });
      } catch (logError) {
        console.error("Failed to log unauthorized access:", logError);
      }

      // User is not admin - show forbidden page
      const url = request.nextUrl.clone();
      url.pathname = "/403";
      return NextResponse.redirect(url);
    }

    // User is admin - log the access
    try {
      await supabase.from("admin_activity_logs").insert({
        admin_id: user.id,
        action: "admin_page_access",
        details: {
          path: request.nextUrl.pathname,
          timestamp: new Date().toISOString(),
        },
        ip_address:
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
      });
    } catch (logError) {
      console.error("Failed to log admin access:", logError);
    }
  }

  // Handle regular protected routes
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
